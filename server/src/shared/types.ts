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
