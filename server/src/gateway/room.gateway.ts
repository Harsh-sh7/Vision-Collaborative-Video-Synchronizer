import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from '../rooms/rooms.service';
import { verifyToken } from '../shared/auth';
import { PresenceState } from '../shared/types';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket'],
  maxHttpBufferSize: 1e7, // 10MB
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track socket mappings: socket.id -> { userId, displayName, roomId }
  private socketSessions = new Map<
    string,
    { userId: string; displayName: string; roomId?: string }
  >();

  constructor(private readonly roomsService: RoomsService) {}

  handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token;
    if (!token) {
      console.log(`Connection rejected: missing auth token on socket ${socket.id}`);
      socket.disconnect();
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      console.log(`Connection rejected: invalid token signature on socket ${socket.id}`);
      socket.disconnect();
      return;
    }

    this.socketSessions.set(socket.id, {
      userId: payload.userId,
      displayName: payload.displayName,
    });
    console.log(`Socket connected: ${payload.displayName} (${socket.id})`);
  }

  handleDisconnect(socket: Socket) {
    const session = this.socketSessions.get(socket.id);
    if (session) {
      console.log(`Socket disconnected: ${session.displayName} (${socket.id})`);
      if (session.roomId) {
        const updatedRoom = this.roomsService.updatePresence(session.roomId, session.userId, 'offline' as any);
        if (updatedRoom) {
          this.server.to(session.roomId).emit('ROOM_STATE_UPDATED', updatedRoom);
        }
      }
      this.socketSessions.delete(socket.id);
    }
  }

  // --- Real-time Handshakes & Events ---

  @SubscribeMessage('ROOM_JOIN')
  handleRoomJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; displayName: string }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session) return;

    session.roomId = data.roomId;
    socket.join(data.roomId);

    const room = this.roomsService.joinRoom(data.roomId, session.userId, data.displayName);
    
    // Send join confirmation to sender
    socket.emit('ROOM_JOINED', room);
    
    // Broadcast updated state to room channel
    this.server.to(data.roomId).emit('ROOM_STATE_UPDATED', room);
  }

  @SubscribeMessage('MEDIA_STATE_CHANGE')
  handleMediaStateChange(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      roomId: string;
      action: 'PLAY' | 'PAUSE' | 'SEEK';
      currentTime: number;
      playbackRate: number;
    }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    const room = this.roomsService.getRoom(data.roomId);
    if (!room) return;

    // Check authority: must be host or room must allow collaborative control
    const isHost = room.hostId === session.userId;
    if (!isHost && !room.collaborativeMode) {
      console.log(`Unauthorized sync command rejected from ${session.displayName}`);
      return;
    }

    const updatedRoom = this.roomsService.updatePlaybackState(data.roomId, data);
    if (updatedRoom) {
      // Broadcast to other peers in the room
      socket.to(data.roomId).emit('MEDIA_STATE_CHANGE', {
        requestId: Math.random().toString(36).substring(7),
        roomId: data.roomId,
        action: data.action,
        currentTime: data.currentTime,
        playbackRate: data.playbackRate,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('CHAT_MESSAGE')
  handleChatMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; text: string }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    const payload = {
      messageId: Math.random().toString(36).substring(7),
      userId: session.userId,
      displayName: session.displayName,
      text: data.text,
      timestamp: Date.now(),
    };

    // Broadcast to everyone in the room (including sender)
    this.server.to(data.roomId).emit('CHAT_MESSAGE', payload);
  }

  @SubscribeMessage('CURSOR_UPDATE')
  handleCursorUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; x: number; y: number; laserActive: boolean }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    // Map User IDs to consistent cursor colors
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#818cf8', '#c084fc', '#f472b6'];
    const colorIndex = Math.abs(this.hashCode(session.userId)) % colors.length;

    const payload = {
      userId: session.userId,
      displayName: session.displayName,
      color: colors[colorIndex],
      x: data.x,
      y: data.y,
      laserActive: data.laserActive,
    };

    // Broadcast to room except sender
    socket.to(data.roomId).emit('CURSOR_UPDATE', payload);
  }

  @SubscribeMessage('EMOJI_REACTION')
  handleEmojiReaction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; reactionType: 'HEART' | 'LIKE' | 'LAUGH' | 'FIRE' | 'WOW' }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    const payload = {
      userId: session.userId,
      displayName: session.displayName,
      reactionType: data.reactionType,
    };

    this.server.to(data.roomId).emit('EMOJI_REACTION', payload);
  }

  @SubscribeMessage('HEARTBEAT')
  handleHeartbeat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; presence: PresenceState }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    const updatedRoom = this.roomsService.updatePresence(data.roomId, session.userId, data.presence);
    if (updatedRoom) {
      this.server.to(data.roomId).emit('ROOM_STATE_UPDATED', updatedRoom);
    }
  }

  @SubscribeMessage('SHARE_TAB')
  handleShareTab(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; activeUrl: string; activeTitle: string }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    this.server.to(data.roomId).emit('SHARE_TAB', {
      activeUrl: data.activeUrl,
      activeTitle: data.activeTitle,
    });
  }

  @SubscribeMessage('LOCAL_VIDEO_SHARE')
  handleLocalVideoShare(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; fileName: string; fileSize: number }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    const room = this.roomsService.getRoom(data.roomId);
    if (room) {
      room.activeUrl = data.fileName ? `local://${data.fileName}` : undefined;
      this.server.to(data.roomId).emit('LOCAL_VIDEO_SHARE', {
        fileName: data.fileName,
        fileSize: data.fileSize,
      });
      this.server.to(data.roomId).emit('ROOM_STATE_UPDATED', room);
    }
  }

  @SubscribeMessage('UPDATE_ROOM_SETTINGS')
  handleUpdateRoomSettings(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; collaborativeMode: boolean }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    const room = this.roomsService.getRoom(data.roomId);
    if (room) {
      room.collaborativeMode = data.collaborativeMode;
      this.server.to(data.roomId).emit('ROOM_STATE_UPDATED', room);
    }
  }

  @SubscribeMessage('HOST_START_WATCHING')
  handleHostStartWatching(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    this.server.to(data.roomId).emit('HOST_START_WATCHING');
  }

  @SubscribeMessage('SEND_CHUNK')
  handleSendChunk(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: {
      roomId: string;
      chunkIndex: number;
      totalChunks: number;
      chunkData: string;
      fileName: string;
      fileSize: number;
    }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    // Relay chunk to all other participants
    socket.to(data.roomId).emit('CHUNK_RECEIVED', {
      chunkIndex: data.chunkIndex,
      totalChunks: data.totalChunks,
      chunkData: data.chunkData,
      fileName: data.fileName,
      fileSize: data.fileSize,
    });
  }

  @SubscribeMessage('PARTICIPANT_READY')
  handleParticipantReady(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; fileName: string }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    this.server.to(data.roomId).emit('PARTICIPANT_READY', {
      userId: session.userId,
      displayName: session.displayName,
      fileName: data.fileName,
    });
  }

  @SubscribeMessage('USER_MEDIA_STATE')
  handleUserMediaState(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; micEnabled: boolean; camEnabled: boolean }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    socket.to(data.roomId).emit('PEER_MEDIA_STATE_UPDATED', {
      userId: session.userId,
      displayName: session.displayName,
      micEnabled: data.micEnabled,
      camEnabled: data.camEnabled,
    });
  }

  @SubscribeMessage('WEBRTC_SIGNAL')
  handleWebRTCSignal(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; signal: any }
  ) {
    const session = this.socketSessions.get(socket.id);
    if (!session || session.roomId !== data.roomId) return;

    let targetSocketId: string | null = null;
    for (const [sid, sess] of this.socketSessions.entries()) {
      if (sess.userId === data.targetUserId && sess.roomId === data.roomId) {
        targetSocketId = sid;
        break;
      }
    }

    if (targetSocketId) {
      this.server.to(targetSocketId).emit('WEBRTC_SIGNAL', {
        senderUserId: session.userId,
        senderDisplayName: session.displayName,
        signal: data.signal,
      });
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }
}
