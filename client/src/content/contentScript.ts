import type { ExtensionMessage, MediaStateChangePayload, CursorUpdatePayload, EmojiReactionPayload, RoomDetails } from '../shared/types';

class HTML5PlayerAdapter {
  private videoElement: HTMLVideoElement | null = null;
  private isProcessingSync = false;
  private syncThreshold = 1.0; // Seconds of acceptable drift
  private syncTimeout: any = null;

  // Sync authority properties
  private myUserId = '';
  private activeRoom: RoomDetails | null = null;

  // Peer cursor timeouts map to prevent dynamic index errors
  private cursorTimeouts = new Map<string, any>();

  constructor() {
    this.detectVideoPlayer();
    this.setupNetworkListeners();
    this.setupCursorTracking();
    this.setupSession();
  }

  private safeSendMessage(message: any, callback?: (response: any) => void) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        if (callback) {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              console.log('Extension context invalidated.');
              return;
            }
            callback(response);
          });
        } else {
          chrome.runtime.sendMessage(message);
        }
      }
    } catch (e) {
      console.log('Failed to send message: Extension context invalidated.');
    }
  }

  private setupSession() {
    this.safeSendMessage({ type: 'GET_SESSION' }, (response: any) => {
      if (response) {
        if (response.userId) {
          this.myUserId = response.userId;
        }
        if (response.activeRoom) {
          this.activeRoom = response.activeRoom;
        }
      }
    });
  }

  private detectVideoPlayer() {
    // Periodically detect the video player to handle dynamic DOM updates
    setInterval(() => {
      const video = document.querySelector('video');
      if (video) {
        if (video !== this.videoElement) {
          console.log('Detected active media player:', video);
          this.videoElement = video;
          this.attachPlayerListeners();

          // Immediately catch up to room state upon discovery
          this.safeSendMessage({ type: 'GET_SESSION' }, (response: any) => {
            if (response && response.activeRoom) {
              this.activeRoom = response.activeRoom;
              this.applyInitialSync(response.activeRoom);
            }
          });
        }
      } else {
        this.videoElement = null;
      }
    }, 2000);
  }

  private hasControlAuthority(): boolean {
    if (!this.activeRoom) return true;
    const isHost = this.activeRoom.hostId === this.myUserId;
    const isCollab = this.activeRoom.collaborativeMode;
    return isHost || isCollab;
  }

  private revertToHostState() {
    if (this.activeRoom) {
      this.applyInitialSync(this.activeRoom);
    }
  }

  private attachPlayerListeners() {
    if (!this.videoElement) return;

    this.videoElement.addEventListener('play', () => {
      if (this.isProcessingSync) return;
      if (!this.hasControlAuthority()) {
        this.revertToHostState();
        return;
      }
      this.sendPlayerState('PLAY');
    });

    this.videoElement.addEventListener('pause', () => {
      if (this.isProcessingSync) return;
      if (!this.hasControlAuthority()) {
        this.revertToHostState();
        return;
      }
      this.sendPlayerState('PAUSE');
    });

    this.videoElement.addEventListener('seeking', () => {
      if (this.isProcessingSync) return;
      if (!this.hasControlAuthority()) {
        this.revertToHostState();
        return;
      }
      this.sendPlayerState('SEEK');
    });

    this.videoElement.addEventListener('seeked', () => {
      if (this.isProcessingSync) {
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        // Wait a brief buffer before releasing lock to absorb async triggers
        setTimeout(() => {
          this.isProcessingSync = false;
        }, 150);
      }
    });

    this.videoElement.addEventListener('ratechange', () => {
      if (this.isProcessingSync) return;
      if (!this.hasControlAuthority()) {
        this.revertToHostState();
        return;
      }
      this.sendPlayerState('SEEK');
    });
  }

  private sendPlayerState(action: 'PLAY' | 'PAUSE' | 'SEEK') {
    if (!this.videoElement) return;
    this.safeSendMessage({
      type: 'CONTENT_PLAYER_STATE',
      payload: {
        action,
        currentTime: this.videoElement.currentTime,
        playbackRate: this.videoElement.playbackRate,
      },
    });
  }

  private setupNetworkListeners() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
          if (!this.videoElement) return;

          switch (message.type) {
            case 'CONTENT_TRIGGER_ACTION':
              const payload = message.payload as MediaStateChangePayload;
              this.applyServerSync(payload);
              break;

            case 'ROOM_STATE_UPDATED':
              this.activeRoom = message.payload as RoomDetails;
              break;

            case 'PEER_CURSORS_UPDATED':
              this.renderPeerCursor(message.payload as CursorUpdatePayload);
              break;

            case 'PEER_REACTION_RECEIVED':
              this.renderEmojiReaction(message.payload as EmojiReactionPayload);
              break;
          }
        });
      }
    } catch (e) {
      console.log('Failed to bind network listeners.');
    }
  }

  private applyServerSync(payload: MediaStateChangePayload) {
    if (!this.videoElement) return;

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.isProcessingSync = true;

    try {
      // Calculate target position adjusting for message latency
      const latency = (Date.now() - payload.timestamp) / 1000;
      const targetTime = payload.action === 'PLAY' 
        ? payload.currentTime + (latency * payload.playbackRate)
        : payload.currentTime;

      // Check current drift
      const drift = Math.abs(this.videoElement.currentTime - targetTime);
      let didSeek = false;

      if (drift > this.syncThreshold) {
        this.videoElement.currentTime = targetTime;
        didSeek = true;
      }

      if (payload.playbackRate !== this.videoElement.playbackRate) {
        this.videoElement.playbackRate = payload.playbackRate;
      }

      if (payload.action === 'PLAY' && this.videoElement.paused) {
        this.videoElement.play().catch(() => {});
      } else if (payload.action === 'PAUSE' && !this.videoElement.paused) {
        this.videoElement.pause();
      }

      // Safe fallback lock release if browser event loop is delayed
      const timeoutDuration = didSeek ? 1500 : 500;
      this.syncTimeout = setTimeout(() => {
        this.isProcessingSync = false;
      }, timeoutDuration);

    } catch (err) {
      console.error('Error applying sync:', err);
      this.isProcessingSync = false;
    }
  }

  private applyInitialSync(room: RoomDetails) {
    if (!this.videoElement) return;

    this.isProcessingSync = true;
    try {
      const state = room.state;
      if (!state) {
        this.isProcessingSync = false;
        return;
      }
      const elapsed = (Date.now() - state.lastUpdated) / 1000;
      const targetTime = state.playbackState === 'PLAYING'
        ? state.currentTime + (elapsed * state.playbackRate)
        : state.currentTime;

      const drift = Math.abs(this.videoElement.currentTime - targetTime);
      if (drift > this.syncThreshold) {
        this.videoElement.currentTime = targetTime;
      }

      if (state.playbackRate !== this.videoElement.playbackRate) {
        this.videoElement.playbackRate = state.playbackRate;
      }

      if (state.playbackState === 'PLAYING' && this.videoElement.paused) {
        this.videoElement.play().catch(() => {});
      } else if (state.playbackState === 'PAUSED' && !this.videoElement.paused) {
        this.videoElement.pause();
      }

      this.syncTimeout = setTimeout(() => {
        this.isProcessingSync = false;
      }, 1000);
    } catch (e) {
      this.isProcessingSync = false;
    }
  }

  // --- Real-time Overlays (Cursors & Reactions) ---
  private setupCursorTracking() {
    document.addEventListener('mousemove', (e) => {
      if (!this.videoElement) return;

      const rect = this.videoElement.getBoundingClientRect();
      // Only track if cursor is inside the video viewport
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        this.safeSendMessage({
          type: 'SEND_CURSOR',
          payload: { x, y, laserActive: false },
        });
      }
    });
  }

  private renderPeerCursor(cursor: CursorUpdatePayload) {
    if (!this.videoElement) return;

    let cursorDiv = document.getElementById(`peer-cursor-${cursor.userId}`);
    if (!cursorDiv) {
      cursorDiv = document.createElement('div');
      cursorDiv.id = `peer-cursor-${cursor.userId}`;
      cursorDiv.style.position = 'absolute';
      cursorDiv.style.pointerEvents = 'none';
      cursorDiv.style.zIndex = '999999';
      cursorDiv.style.width = '12px';
      cursorDiv.style.height = '12px';
      cursorDiv.style.borderRadius = '50%';
      cursorDiv.style.backgroundColor = cursor.color;
      cursorDiv.style.transition = 'all 0.1s ease-out';

      const label = document.createElement('span');
      label.innerText = cursor.displayName;
      label.style.position = 'absolute';
      label.style.left = '15px';
      label.style.top = '-5px';
      label.style.backgroundColor = 'rgba(0,0,0,0.7)';
      label.style.color = '#fff';
      label.style.padding = '2px 6px';
      label.style.borderRadius = '4px';
      label.style.fontSize = '10px';
      label.style.whiteSpace = 'nowrap';
      cursorDiv.appendChild(label);

      const parent = this.videoElement.parentElement || document.body;
      if (parent.style.position === 'static' || !parent.style.position) {
        parent.style.position = 'relative';
      }
      parent.appendChild(cursorDiv);
    }

    const rect = this.videoElement.getBoundingClientRect();
    const xPos = cursor.x * rect.width;
    const yPos = cursor.y * rect.height;

    cursorDiv.style.left = `${xPos}px`;
    cursorDiv.style.top = `${yPos}px`;
    cursorDiv.style.display = 'block';

    // Auto hide cursor after inactivity
    const timeoutKey = cursor.userId;
    const existingTimeout = this.cursorTimeouts.get(timeoutKey);
    if (existingTimeout) clearTimeout(existingTimeout);
    
    const timeout = setTimeout(() => {
      if (cursorDiv) cursorDiv.style.display = 'none';
    }, 3000);
    this.cursorTimeouts.set(timeoutKey, timeout);
  }

  private renderEmojiReaction(reaction: EmojiReactionPayload) {
    if (!this.videoElement) return;

    const emojis: Record<string, string> = {
      HEART: '❤️',
      LIKE: '👍',
      LAUGH: '😂',
      FIRE: '🔥',
      WOW: '😮',
    };

    const emoji = emojis[reaction.reactionType] || '❤️';
    const div = document.createElement('div');
    div.innerText = emoji;
    div.style.position = 'absolute';
    div.style.zIndex = '999998';
    div.style.fontSize = '24px';
    div.style.pointerEvents = 'none';
    
    // Random position at bottom of the video element
    const rect = this.videoElement.getBoundingClientRect();
    const startX = Math.random() * rect.width;
    div.style.left = `${startX}px`;
    div.style.top = `${rect.height - 40}px`;
    
    const parent = this.videoElement.parentElement || document.body;
    
    // Maintain alignment coordinate space
    if (parent.style.position === 'static' || !parent.style.position) {
      parent.style.position = 'relative';
    }
    
    parent.appendChild(div);

    // Floating upward animation
    let opacity = 1;
    let currentY = rect.height - 40;
    
    const animation = setInterval(() => {
      opacity -= 0.02;
      currentY -= 2;
      div.style.top = `${currentY}px`;
      div.style.opacity = opacity.toString();
      
      if (opacity <= 0) {
        clearInterval(animation);
        div.remove();
      }
    }, 20);
  }
}

new HTML5PlayerAdapter();

document.addEventListener('AUTO_JOIN_ROOM', (e: Event) => {
  const customEvent = e as CustomEvent;
  if (customEvent.detail && customEvent.detail.roomCode) {
    const roomCode = customEvent.detail.roomCode;
    console.log('AUTO_JOIN_ROOM intercepted room code:', roomCode);
    chrome.runtime.sendMessage({
      type: 'AUTO_JOIN_ROOM',
      payload: { roomCode }
    });
  }
});
