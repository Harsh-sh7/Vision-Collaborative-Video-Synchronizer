export type PlaybackState = 'PLAYING' | 'PAUSED' | 'BUFFERING';

export type UserRole = 'host' | 'co-host' | 'participant';

export type PresenceState =
  | 'Online'
  | 'Ready'
  | 'Watching'
  | 'Loading'
  | 'Buffering'
  | 'Away'
  | 'Reconnecting'
  | 'Disconnected';

export interface Participant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  presence: PresenceState;
}

export interface RoomState {
  playbackState: PlaybackState;
  currentTime: number;
  playbackRate: number;
  lastUpdated: number;
}

export interface RoomDetails {
  roomId: string;
  roomCode: string;
  hostId: string;
  isLocked: boolean;
  collaborativeMode: boolean;
  activeEngine: 'web' | 'ott' | 'local';
  activeUrl?: string;
  state: RoomState;
  participants: Participant[];
}

// Client <-> Server Socket Messages
export interface MediaStateChangePayload {
  requestId: string;
  roomId: string;
  action: 'PLAY' | 'PAUSE' | 'SEEK';
  currentTime: number;
  playbackRate: number;
  timestamp: number;
}

export interface ChatMessagePayload {
  messageId: string;
  userId: string;
  displayName: string;
  text: string;
  timestamp: number;
}

export interface CursorUpdatePayload {
  userId: string;
  displayName: string;
  color: string;
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
  laserActive: boolean;
}

export interface EmojiReactionPayload {
  userId: string;
  displayName: string;
  reactionType: 'HEART' | 'LIKE' | 'LAUGH' | 'FIRE' | 'WOW';
}

// Extension Internal Communication Messages
export type ExtensionMessageType =
  | 'GET_SESSION'
  | 'CREATE_ROOM'
  | 'JOIN_ROOM'
  | 'LEAVE_ROOM'
  | 'ROOM_STATE_UPDATED'
  | 'CONTENT_PLAYER_STATE'
  | 'CONTENT_TRIGGER_ACTION'
  | 'SEND_CHAT'
  | 'SEND_REACTION'
  | 'SEND_CURSOR'
  | 'PEER_CURSORS_UPDATED'
  | 'PEER_REACTION_RECEIVED'
  | 'CHAT_RECEIVED'
  | 'SHARE_TAB'
  | 'LOCAL_VIDEO_SHARE'
  | 'UPDATE_ROOM_SETTINGS'
  | 'HOST_START_WATCHING'
  | 'SEND_CHUNK'
  | 'DOWNLOAD_PROGRESS'
  | 'PARTICIPANT_READY'
  | 'AUTO_JOIN_ROOM'
  | 'USER_MEDIA_STATE'
  | 'PEER_MEDIA_STATE_UPDATED'
  | 'WEBRTC_SIGNAL';

export interface ExtensionMessage {
  type: ExtensionMessageType;
  payload?: any;
}
