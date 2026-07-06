import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RoomDetails, Participant, RoomState, PresenceState, UserRole } from '../shared/types';

@Injectable()
export class RoomsService {
  // In-memory room store (fallback for local development)
  private rooms = new Map<string, RoomDetails>();
  private roomCodeMap = new Map<string, string>(); // code -> id

  createRoom(hostId: string, hostName: string): RoomDetails {
    const roomId = uuidv4();
    const roomCode = this.generateRoomCode();
    
    const hostParticipant: Participant = {
      userId: hostId,
      displayName: hostName,
      role: 'host',
      presence: 'Ready',
    };

    const initialRoom: RoomDetails = {
      roomId,
      roomCode,
      hostId,
      isLocked: false,
      collaborativeMode: false,
      activeEngine: 'web',
      state: {
        playbackState: 'PAUSED',
        currentTime: 0.0,
        playbackRate: 1.0,
        lastUpdated: Date.now(),
      },
      participants: [hostParticipant],
    };

    this.rooms.set(roomId, initialRoom);
    this.roomCodeMap.set(roomCode, roomId);
    
    console.log(`Created Room: ${roomCode} (${roomId})`);
    return initialRoom;
  }

  getRoom(roomId: string): RoomDetails | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code: string): RoomDetails | undefined {
    const id = this.roomCodeMap.get(code.toUpperCase());
    if (!id) return undefined;
    return this.rooms.get(id);
  }

  joinRoom(roomId: string, userId: string, displayName: string): RoomDetails {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const existingIndex = room.participants.findIndex((p) => p.userId === userId);
    const role: UserRole = room.hostId === userId ? 'host' : 'participant';

    const participant: Participant = {
      userId,
      displayName,
      role,
      presence: 'Ready',
    };

    if (existingIndex > -1) {
      room.participants[existingIndex] = participant;
    } else {
      room.participants.push(participant);
    }

    console.log(`User ${displayName} joined Room ${room.roomCode}`);
    return room;
  }

  leaveRoom(roomId: string, userId: string): RoomDetails | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.participants = room.participants.filter((p) => p.userId !== userId);
    
    // If room is empty, remove it
    if (room.participants.length === 0) {
      this.rooms.delete(roomId);
      this.roomCodeMap.delete(room.roomCode);
      console.log(`Deleted empty Room: ${room.roomCode}`);
      return null;
    }

    // If host left, assign new host from remaining participants
    if (room.hostId === userId && room.participants.length > 0) {
      const nextHost = room.participants[0];
      nextHost.role = 'host';
      room.hostId = nextHost.userId;
      console.log(`Transferred host of Room ${room.roomCode} to ${nextHost.displayName}`);
    }

    return room;
  }

  updatePlaybackState(
    roomId: string,
    state: { action: 'PLAY' | 'PAUSE' | 'SEEK'; currentTime: number; playbackRate: number }
  ): RoomDetails | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.state = {
      playbackState: state.action === 'PLAY' ? 'PLAYING' : 'PAUSED',
      currentTime: state.currentTime,
      playbackRate: state.playbackRate,
      lastUpdated: Date.now(),
    };

    return room;
  }

  updatePresence(roomId: string, userId: string, presence: PresenceState): RoomDetails | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const participant = room.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.presence = presence;
    }

    return room;
  }

  private generateRoomCode(): string {
    let code: string;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.roomCodeMap.has(code));
    return code;
  }
}
