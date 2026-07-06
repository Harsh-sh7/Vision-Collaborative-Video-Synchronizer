import type { ExtensionMessage, MediaStateChangePayload, RoomDetails, EmojiReactionPayload } from '../shared/types';

class LocalSyncPlayer {
  private videoElement: HTMLVideoElement;
  private ytIframe: HTMLIFrameElement;
  private dropZone: HTMLElement;
  private fileSelector: HTMLInputElement;
  private roomBadge: HTMLElement;

  // Custom Controls elements
  private playerContainer: HTMLElement;
  private controlsBar: HTMLElement;
  private playBtn: HTMLButtonElement;
  private playIconSvg: SVGElement;
  private skipBackBtn: HTMLButtonElement;
  private skipForwardBtn: HTMLButtonElement;
  private muteBtn: HTMLButtonElement;
  private volumeIconSvg: SVGElement;
  private volumeSlider: HTMLInputElement;
  private timeDisplay: HTMLElement;
  private modeBadge: HTMLElement;
  private pipBtn: HTMLButtonElement;
  private fullscreenBtn: HTMLButtonElement;
  private timeline: HTMLElement;
  private timelineFill: HTMLElement;
  private leftStatus: HTMLElement;
  private header: HTMLElement;

  // Chat Drawer elements
  private chatDrawer: HTMLElement;
  private chatToggleBtn: HTMLButtonElement;
  private chatUnread: HTMLElement;
  private closeChatBtn: HTMLButtonElement;
  private chatMessages: HTMLElement;
  private chatInputField: HTMLInputElement;
  private chatSendBtn: HTMLButtonElement;

  // Buffering Overlay elements
  private bufferOverlay: HTMLElement;
  private bufferTitle: HTMLElement;
  private bufferFill: HTMLElement;
  private bufferStatus: HTMLElement;
  private watchNowBtn: HTMLButtonElement;

  // Notification Banner elements
  private readyBanner: HTMLElement;

  // Chat Toast elements
  private chatToast: HTMLElement;
  private chatToastSender: HTMLElement;
  private chatToastText: HTMLElement;
  private chatToastTimeout: any = null;
  private lastCursorSendTime = 0;

  private isProcessingSync = false;
  private syncThreshold = 1.5; 
  private syncTimeout: any = null;

  // State
  private myUserId = '';
  private activeRoom: RoomDetails | null = null;
  private controlsTimeout: any = null;
  private isMuted = false;
  private savedVolume = 1.0;
  private chatOpen = false;
  private unreadCount = 0;
  private pointerShield: HTMLElement;
  private processedMessageIds = new Set<string>();

  // YouTube Specific States
  private isYoutube = false;
  private ytCurrentTime = 0;
  private ytDuration = 0;
  private ytPlayerState = 2; // 2 = PAUSED, 1 = PLAYING

  // Chunk Download States
  private chunkingInProgress = false;
  private localVideoLoaded = false;

  // Player-based Voice/Video/Cursor states
  private micBtn: HTMLButtonElement;
  private camBtn: HTMLButtonElement;
  private cursorBtn: HTMLButtonElement;
  private avatarsContainer: HTMLElement;

  private micEnabled = false;
  private camEnabled = false;
  private cursorEnabled = true;
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private iceCandidatesQueue = new Map<string, RTCIceCandidateInit[]>();
  private webcamGrid: HTMLElement;
  private cursorTimeouts = new Map<string, any>();
  private peerStates = new Map<string, { micEnabled: boolean; camEnabled: boolean }>();

  constructor() {
    this.videoElement = document.getElementById('sync-video') as HTMLVideoElement;
    this.ytIframe = document.getElementById('yt-player') as HTMLIFrameElement;
    this.dropZone = document.getElementById('drop-zone') as HTMLElement;
    this.fileSelector = document.getElementById('file-selector') as HTMLInputElement;
    this.roomBadge = document.getElementById('room-badge') as HTMLElement;
    this.header = document.getElementById('player-header') as HTMLElement;

    // Controls
    this.playerContainer = document.getElementById('player-container') as HTMLElement;
    this.controlsBar = document.getElementById('custom-controls') as HTMLElement;
    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.playIconSvg = document.getElementById('play-icon-svg') as unknown as SVGElement;
    this.skipBackBtn = document.getElementById('skip-back') as HTMLButtonElement;
    this.skipForwardBtn = document.getElementById('skip-forward') as HTMLButtonElement;
    this.muteBtn = document.getElementById('mute-btn') as HTMLButtonElement;
    this.volumeIconSvg = document.getElementById('volume-icon-svg') as unknown as SVGElement;
    this.volumeSlider = document.getElementById('volume') as HTMLInputElement;
    this.timeDisplay = document.getElementById('time-display') as HTMLElement;
    this.modeBadge = document.getElementById('mode-badge') as HTMLElement;
    this.pipBtn = document.getElementById('pip-btn') as HTMLButtonElement;
    this.fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
    this.timeline = document.getElementById('timeline') as HTMLElement;
    this.timelineFill = document.getElementById('timeline-fill') as HTMLElement;
    this.leftStatus = document.getElementById('left-status') as HTMLElement;

    // Chat Drawer
    this.chatDrawer = document.getElementById('chat-drawer') as HTMLElement;
    this.chatToggleBtn = document.getElementById('chat-toggle-btn') as HTMLButtonElement;
    this.chatUnread = document.getElementById('chat-unread') as HTMLElement;
    this.closeChatBtn = document.getElementById('close-chat-btn') as HTMLButtonElement;
    this.chatMessages = document.getElementById('chat-messages') as HTMLElement;
    this.chatInputField = document.getElementById('chat-input-field') as HTMLInputElement;
    this.chatSendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;

    // Buffering Overlay
    this.bufferOverlay = document.getElementById('buffer-overlay') as HTMLElement;
    this.bufferTitle = document.getElementById('buffer-title') as HTMLElement;
    this.bufferFill = document.getElementById('buffer-fill') as HTMLElement;
    this.bufferStatus = document.getElementById('buffer-status') as HTMLElement;
    this.watchNowBtn = document.getElementById('watch-now-btn') as HTMLButtonElement;

    // Notification Banner
    this.readyBanner = document.getElementById('ready-banner') as HTMLElement;

    // Chat Toast
    this.chatToast = document.getElementById('chat-toast') as HTMLElement;
    this.chatToastSender = document.getElementById('chat-toast-sender') as HTMLElement;
    this.chatToastText = document.getElementById('chat-toast-text') as HTMLElement;
    
    // Pointer Shield
    this.pointerShield = document.getElementById('pointer-shield') as HTMLElement;

    // Social Toggles & Avatars
    this.micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
    this.camBtn = document.getElementById('cam-btn') as HTMLButtonElement;
    this.cursorBtn = document.getElementById('cursor-btn') as HTMLButtonElement;
    this.avatarsContainer = document.getElementById('avatars-container') as HTMLElement;
    this.webcamGrid = document.getElementById('webcam-grid') as HTMLElement;

    this.setupDropZone();
    this.setupFileSelector();
    this.setupNetworkListeners();
    this.setupSession();
    this.setupControlsAutohide();
    this.setupKeyboardShortcuts();
    this.setupYoutubeListener();
    this.setupChatDrawer();
    this.setupReactions();
    this.setupPlayerSocialControls();
  }

  private safeSendMessage(message: any, callback?: (response: any) => void) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        if (callback) {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
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
          this.roomBadge.innerText = `Connected Room: ${response.activeRoom.roomCode}`;
          this.updateControlAccess();
          this.checkYouTubeMode();
          this.checkBackgroundDownloadStatus();
          this.renderOverlappingAvatars();
        }
      }
    });
  }

  // Check if a background download is currently running
  private checkBackgroundDownloadStatus() {
    if (!this.activeRoom || this.activeRoom.hostId === this.myUserId) return;
    if (!this.activeRoom.activeUrl || !this.activeRoom.activeUrl.startsWith('local://')) return;

    const url = this.activeRoom.activeUrl;
    if (url.includes('YouTube Video') || url.includes('youtube.com') || url.includes('youtu.be')) return;

    const fileName = this.activeRoom.activeUrl.replace('local://', '');
    const roomId = this.activeRoom.roomId;

    this.initDB().then((db) => {
      const transaction = db.transaction('videos_metadata', 'readonly');
      const request = transaction.objectStore('videos_metadata').get(`${roomId}-${fileName}`);
      request.onsuccess = () => {
        const metadata = request.result;
        if (metadata) {
          const progress = Math.round((metadata.receivedChunks / metadata.totalChunks) * 100);
          this.showDownloadBufferOverlay(fileName, progress);
        } else {
          // No metadata yet, show starting buffering indicator
          this.showDownloadBufferOverlay(fileName, 0);
        }
      };
    });
  }

  private checkYouTubeMode() {
    if (!this.activeRoom || !this.activeRoom.activeUrl) {
      if (this.localVideoLoaded) {
        return;
      }
      this.isYoutube = false;
      this.localVideoLoaded = false;
      this.ytIframe.style.display = 'none';
      this.ytIframe.src = '';
      this.videoElement.style.display = 'none';
      this.videoElement.src = '';
      this.controlsBar.style.display = 'none';
      this.pointerShield.style.display = 'none';
      
      const dropTitle = document.getElementById('drop-title');
      const dropDesc = document.getElementById('drop-desc');
      if (dropTitle) dropTitle.innerText = 'Load Shared Video File';
      if (dropDesc) dropDesc.innerText = 'Drag and drop your local copy here or click Select File to begin synchronized playback.';
      
      this.dropZone.style.display = 'flex';
      return;
    }

    const url = this.activeRoom.activeUrl;
    const hasYtIndicator = url.includes('YouTube Video') || url.includes('youtube.com') || url.includes('youtu.be');

    if (hasYtIndicator) {
      let videoId = '';
      if (url.includes('YouTube Video (')) {
        videoId = url.match(/YouTube Video \(([^)]+)\)/)?.[1] || '';
      } else {
        try {
          const u = new URL(url.replace('local://', ''));
          if (u.hostname === 'youtu.be') {
            videoId = u.pathname.slice(1);
          } else {
            videoId = u.searchParams.get('v') || '';
          }
        } catch (e) {
          videoId = url.replace('local://', '');
        }
      }

      if (videoId) {
        this.isYoutube = true;
        this.dropZone.style.display = 'none';
        this.videoElement.style.display = 'none';
        this.bufferOverlay.style.display = 'none';
        this.ytIframe.style.display = 'block';
        this.controlsBar.style.display = 'flex';
        this.pointerShield.style.display = 'block';

        const targetSrc = `http://localhost:3000/youtube-embed?v=${videoId}`;
        if (this.ytIframe.src !== targetSrc) {
          this.ytIframe.src = targetSrc;
        }
        console.log('Successfully initialized YouTube Iframe Stream Player for ID:', videoId);
      }
    } else {
      this.isYoutube = false;
      this.ytIframe.style.display = 'none';
      this.ytIframe.src = '';
      this.updateDropZoneInstructions();

      if (this.localVideoLoaded) {
        this.dropZone.style.display = 'none';
        this.videoElement.style.display = 'block';
        this.controlsBar.style.display = 'flex';
        this.pointerShield.style.display = 'block';
      } else {
        this.dropZone.style.display = 'flex';
        this.videoElement.style.display = 'none';
        this.controlsBar.style.display = 'none';
        this.pointerShield.style.display = 'none';
      }
    }
  }

  private updateDropZoneInstructions() {
    if (this.activeRoom && this.activeRoom.activeUrl?.startsWith('local://')) {
      const fileName = this.activeRoom.activeUrl.replace('local://', '');
      const dropTitle = document.getElementById('drop-title');
      const dropDesc = document.getElementById('drop-desc');
      if (dropTitle) {
        dropTitle.innerText = `Load Shared Video File`;
      }
      if (dropDesc) {
        dropDesc.innerHTML = `Please select or drag-and-drop your local copy of:<br/><strong style="color: #818cf8; font-size: 15px;">${fileName}</strong><br/>to join the watch party in sync.`;
      }
    }
  }

  private setupDropZone() {
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('hover');
    });

    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('hover');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('hover');
      const file = e.dataTransfer?.files[0];
      if (file) {
        this.loadVideoFile(file);
      }
    });
  }

  private setupFileSelector() {
    this.fileSelector.addEventListener('change', () => {
      const file = this.fileSelector.files?.[0];
      if (file) {
        this.loadVideoFile(file);
      }
    });
  }

  // Host Video Slicer & Sender
  private async loadVideoFile(file: File) {
    if (this.activeRoom && this.activeRoom.activeUrl?.startsWith('local://')) {
      const hostFileName = this.activeRoom.activeUrl.replace('local://', '');
      if (file.name !== hostFileName) {
        const confirmDifferent = confirm(
          `Warning: Your selected file "${file.name}" does not match the host's shared video file name "${hostFileName}".\n\nDo you want to play it anyway?`
        );
        if (!confirmDifferent) return;
      }
    }

    const objectUrl = URL.createObjectURL(file);
    this.videoElement.src = objectUrl;
    this.localVideoLoaded = true;
    this.videoElement.style.display = 'block';
    this.ytIframe.style.display = 'none';
    this.controlsBar.style.display = 'flex';
    this.dropZone.style.display = 'none';
    this.pointerShield.style.display = 'block';
    
    this.attachVideoListeners();
    this.setupCustomControls();
    this.updateControlAccess();

    // Broadcast file sharing chunk slices if we are the host
    if (this.activeRoom && this.activeRoom.hostId === this.myUserId && !this.chunkingInProgress) {
      this.chunkingInProgress = true;
      console.log('Host beginning video chunk slice transmissions:', file.name);

      const CHUNK_SIZE = 500 * 1024; // 500KB
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const fileName = file.name;
      const fileSize = file.size;

      // Broadcast share event first
      this.safeSendMessage({
        type: 'LOCAL_VIDEO_SHARE',
        payload: { fileName, fileSize }
      });

      // Slice and transmit chunks sequentially
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const blobSlice = file.slice(start, end);

        await new Promise<void>((res) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const buffer = event.target?.result as ArrayBuffer;
            const base64 = this.arrayBufferToBase64(buffer);

            this.safeSendMessage({
              type: 'SEND_CHUNK',
              payload: {
                chunkIndex: i,
                totalChunks,
                chunkData: base64,
                fileName,
                fileSize
              }
            });
            res();
          };
          reader.readAsArrayBuffer(blobSlice);
        });
      }
      this.chunkingInProgress = false;
      console.log('Host complete streaming slices!');
    } else if (this.activeRoom) {
      this.applyInitialSync();
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('watch_party_cache', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Participant chunk rebuilder
  private async rebuildVideoFromDB(roomId: string, fileName: string): Promise<string> {
    const db = await this.initDB();
    
    const chunks = await new Promise<any[]>((resolve, reject) => {
      const transaction = db.transaction('video_chunks', 'readonly');
      const store = transaction.objectStore('video_chunks');
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result || [];
        const filtered = all.filter((c: any) => c.roomId === roomId && c.fileName === fileName);
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });

    // Sort by chunk index
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Map base64 string back to ArrayBuffers
    const buffers = chunks.map((c) => this.base64ToArrayBuffer(c.chunkData));
    const blob = new Blob(buffers, { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }

  private showDownloadBufferOverlay(fileName: string, progress: number) {
    if (this.isYoutube || fileName.includes('YouTube Video') || fileName.includes('youtube.com') || fileName.includes('youtu.be')) {
      this.bufferOverlay.style.display = 'none';
      return;
    }
    this.dropZone.style.display = 'none';
    this.bufferOverlay.style.display = 'flex';
    this.bufferTitle.innerText = `Buffering: ${fileName}`;
    this.bufferFill.style.width = `${progress}%`;
    this.bufferStatus.innerText = `Downloading video chunks... ${progress}%`;

    if (progress >= 40) {
      this.watchNowBtn.style.display = 'block';
      this.watchNowBtn.onclick = async () => {
        if (this.activeRoom) {
          const blobUrl = await this.rebuildVideoFromDB(this.activeRoom.roomId, fileName);
          this.videoElement.src = blobUrl;
          this.localVideoLoaded = true;
          this.videoElement.style.display = 'block';
          this.ytIframe.style.display = 'none';
          this.controlsBar.style.display = 'flex';
          this.bufferOverlay.style.display = 'none';
          this.pointerShield.style.display = 'block';
          
          this.attachVideoListeners();
          this.setupCustomControls();
          this.updateControlAccess();
          this.applyInitialSync();

          // Broadcast ready notification status back to host
          this.safeSendMessage({
            type: 'PARTICIPANT_READY',
            payload: { fileName }
          });
        }
      };
    } else {
      this.watchNowBtn.style.display = 'none';
    }
  }

  private sendYtCommand(func: string, args: any[] = []) {
    if (this.ytIframe && this.ytIframe.contentWindow) {
      this.ytIframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  }

  private setupYoutubeListener() {
    window.addEventListener('message', (event) => {
      if (!event.origin.includes('localhost:3000') && !event.origin.includes('127.0.0.1')) return;

      try {
        const data = JSON.parse(event.data);

        if (data.event === 'onStateChange') {
          const newState = data.info; // 1 = PLAYING, 2 = PAUSED
          this.ytPlayerState = newState;

          if (newState === 1) {
            this.playIconSvg.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
            this.leftStatus.innerText = 'Playing';
            if (!this.isProcessingSync) {
              this.sendPlayerState('PLAY');
            }
          } else if (newState === 2) {
            this.playIconSvg.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
            this.leftStatus.innerText = 'Paused';
            if (!this.isProcessingSync) {
              this.sendPlayerState('PAUSE');
            }
          }
        } 
        
        else if (data.event === 'initialDelivery') {
          this.ytDuration = data.info.duration || 0;
          this.setupCustomControls();
          if (this.activeRoom && this.activeRoom.hostId !== this.myUserId) {
            this.applyInitialSync();
          }
        } 
        
        else if (data.event === 'infoDelivery' && data.info) {
          if (data.info.currentTime !== undefined) {
            this.ytCurrentTime = data.info.currentTime;
            this.updateProgressBar();
          }
          if (data.info.duration !== undefined) {
            this.ytDuration = data.info.duration;
          }
          if (data.info.playerState !== undefined) {
            this.ytPlayerState = data.info.playerState;
          }
        }
      } catch (e) {}
    });
  }

  private applyInitialSync() {
    if (!this.activeRoom) return;

    this.isProcessingSync = true;
    try {
      const state = this.activeRoom.state;
      const elapsed = (Date.now() - state.lastUpdated) / 1000;
      const targetTime = state.playbackState === 'PLAYING'
        ? state.currentTime + (elapsed * state.playbackRate)
        : state.currentTime;

      if (this.isYoutube) {
        this.sendYtCommand('seekTo', [targetTime, true]);
        if (state.playbackState === 'PLAYING') {
          this.sendYtCommand('playVideo');
        } else {
          this.sendYtCommand('pauseVideo');
        }
      } else if (this.videoElement && this.videoElement.src) {
        this.videoElement.currentTime = targetTime;
        this.videoElement.playbackRate = state.playbackRate;

        if (state.playbackState === 'PLAYING') {
          this.videoElement.play().catch(() => {});
        } else {
          this.videoElement.pause();
        }
      }

      this.syncTimeout = setTimeout(() => {
        this.isProcessingSync = false;
      }, 1000);
    } catch (e) {
      this.isProcessingSync = false;
    }
  }

  private updateControlAccess() {
    if (!this.activeRoom) return;

    const isHost = this.activeRoom.hostId === this.myUserId;
    const isCollab = this.activeRoom.collaborativeMode;
    const hasControl = isHost || isCollab;

    if (hasControl) {
      this.playBtn.disabled = false;
      this.skipBackBtn.disabled = false;
      this.skipForwardBtn.disabled = false;
      this.timeline.style.pointerEvents = 'auto';
      this.timeline.style.opacity = '1';
      
      this.modeBadge.innerText = '';
      this.modeBadge.className = 'status-dot-indicator unlocked';
      this.modeBadge.title = isCollab ? 'Collaborative Control (Unlocked)' : 'Host Control (Unlocked)';
    } else {
      this.playBtn.disabled = true;
      this.skipBackBtn.disabled = true;
      this.skipForwardBtn.disabled = true;
      this.timeline.style.pointerEvents = 'none';
      this.timeline.style.opacity = '0.5';
      
      this.modeBadge.innerText = '';
      this.modeBadge.className = 'status-dot-indicator locked';
      this.modeBadge.title = 'Host Control (Locked)';
    }
  }

  private attachVideoListeners() {
    this.videoElement.addEventListener('play', () => {
      this.playIconSvg.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      this.leftStatus.innerText = 'Playing';
      if (this.isProcessingSync) return;
      this.sendPlayerState('PLAY');
    });

    this.videoElement.addEventListener('pause', () => {
      this.playIconSvg.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
      this.leftStatus.innerText = 'Paused';
      if (this.isProcessingSync) return;
      this.sendPlayerState('PAUSE');
    });

    this.videoElement.addEventListener('seeking', () => {
      if (this.isProcessingSync) return;
      this.sendPlayerState('SEEK');
    });

    this.videoElement.addEventListener('seeked', () => {
      if (this.isProcessingSync) {
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        setTimeout(() => {
          this.isProcessingSync = false;
        }, 150);
      }
    });

    this.videoElement.addEventListener('timeupdate', () => {
      this.updateProgressBar();
    });

    this.videoElement.addEventListener('ratechange', () => {
      if (this.isProcessingSync) return;
      this.sendPlayerState('SEEK');
    });
  }

  private setupCustomControls() {
    this.playBtn.onclick = null;
    this.playBtn.addEventListener('click', () => {
      if (this.isYoutube) {
        if (this.ytPlayerState === 1) {
          this.sendYtCommand('pauseVideo');
        } else {
          this.sendYtCommand('playVideo');
        }
      } else {
        if (this.videoElement.paused) {
          this.videoElement.play().catch(() => {});
        } else {
          this.videoElement.pause();
        }
      }
    });

    this.skipBackBtn.onclick = null;
    this.skipBackBtn.addEventListener('click', () => {
      if (this.isYoutube) {
        this.sendYtCommand('seekTo', [Math.max(0, this.ytCurrentTime - 10), true]);
      } else {
        this.videoElement.currentTime = Math.max(0, this.videoElement.currentTime - 10);
      }
    });

    this.skipForwardBtn.onclick = null;
    this.skipForwardBtn.addEventListener('click', () => {
      if (this.isYoutube) {
        this.sendYtCommand('seekTo', [Math.min(this.ytDuration, this.ytCurrentTime + 10), true]);
      } else {
        this.videoElement.currentTime = Math.min(this.videoElement.duration, this.videoElement.currentTime + 10);
      }
    });

    // Mute Button
    this.muteBtn.onclick = null;
    this.muteBtn.addEventListener('click', () => {
      this.toggleMute();
    });

    // Volume Slider
    this.volumeSlider.oninput = null;
    this.volumeSlider.addEventListener('input', () => {
      const volVal = Number(this.volumeSlider.value);
      if (this.isYoutube) {
        this.sendYtCommand('setVolume', [volVal * 100]);
      } else {
        this.videoElement.volume = volVal;
        this.videoElement.muted = volVal === 0;
      }
      this.updateVolumeIcon(volVal);
    });

    // PiP Button
    this.pipBtn.onclick = null;
    this.pipBtn.addEventListener('click', () => {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      } else if (this.videoElement && this.videoElement.src && !this.isYoutube) {
        this.videoElement.requestPictureInPicture().catch(() => {});
      }
    });

    // Fullscreen Button
    this.fullscreenBtn.onclick = null;
    this.fullscreenBtn.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Timeline Clicking
    this.timeline.onclick = null;
    this.timeline.addEventListener('click', (e) => {
      const rect = this.timeline.getBoundingClientRect();
      const clickPos = (e.clientX - rect.left) / rect.width;
      if (this.isYoutube) {
        this.sendYtCommand('seekTo', [clickPos * this.ytDuration, true]);
      } else {
        this.videoElement.currentTime = clickPos * this.videoElement.duration;
      }
    });
  }

  private updateVolumeIcon(volVal: number) {
    if (volVal === 0) {
      this.volumeIconSvg.innerHTML = '<path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM3 9v6h4l5 5V4L7 9H3z"/>';
      this.muteBtn.title = 'Unmute';
    } else {
      this.volumeIconSvg.innerHTML = '<path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
      this.muteBtn.title = 'Mute';
    }
  }

  private toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isYoutube) {
      if (this.isMuted) {
        this.savedVolume = Number(this.volumeSlider.value);
        this.volumeSlider.value = '0';
        this.sendYtCommand('mute');
        this.updateVolumeIcon(0);
      } else {
        this.volumeSlider.value = this.savedVolume.toString();
        this.sendYtCommand('unMute');
        this.sendYtCommand('setVolume', [this.savedVolume * 100]);
        this.updateVolumeIcon(this.savedVolume);
      }
    } else {
      this.videoElement.muted = this.isMuted;
      if (this.isMuted) {
        this.savedVolume = Number(this.volumeSlider.value);
        this.volumeSlider.value = '0';
        this.updateVolumeIcon(0);
      } else {
        this.volumeSlider.value = this.savedVolume.toString();
        this.videoElement.volume = this.savedVolume;
        this.updateVolumeIcon(this.savedVolume);
      }
    }
  }

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.playerContainer.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  private updateProgressBar() {
    const current = this.isYoutube ? this.ytCurrentTime : this.videoElement.currentTime;
    const duration = this.isYoutube ? this.ytDuration : (this.videoElement.duration || 0);
    
    if (duration > 0) {
      const percentage = (current / duration) * 100;
      this.timelineFill.style.width = `${percentage}%`;
    }

    this.timeDisplay.innerText = `${this.formatTime(current)} / ${this.formatTime(duration)}`;
  }

  private formatTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  // Auto-hiding control panel
  private setupControlsAutohide() {
    const showControls = () => {
      this.controlsBar.classList.remove('fade-out');
      this.header.classList.remove('fade-out');
      this.playerContainer.style.cursor = 'default';
      
      const isVideoActive = this.isYoutube || (this.videoElement && this.videoElement.src);
      if (isVideoActive) {
        this.pointerShield.style.display = 'block';
      }
      
      if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
      
      const isPaused = this.isYoutube ? (this.ytPlayerState === 2) : this.videoElement.paused;
      
      if (!isPaused && !this.chatOpen && document.activeElement?.id !== 'chat-input-field') {
        this.controlsTimeout = setTimeout(() => {
          this.controlsBar.classList.add('fade-out');
          this.header.classList.add('fade-out');
          this.playerContainer.style.cursor = 'none';
        }, 2500);
      }
    };

    document.addEventListener('mousemove', showControls);
    this.playerContainer.addEventListener('mousemove', showControls);
    this.pointerShield.addEventListener('mousemove', showControls);

    this.pointerShield.addEventListener('click', (e) => {
      e.stopPropagation();
      showControls();
      if (this.activeRoom) {
        const isHost = this.activeRoom.hostId === this.myUserId;
        const isCollab = this.activeRoom.collaborativeMode;
        if (isHost || isCollab) {
          this.playBtn.click();
        }
      }
    });

    this.videoElement.addEventListener('play', showControls);
    this.videoElement.addEventListener('pause', showControls);
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const isHost = this.activeRoom?.hostId === this.myUserId;
      const isCollab = this.activeRoom?.collaborativeMode;
      const hasControl = isHost || isCollab;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (hasControl) {
            if (this.isYoutube) {
              if (this.ytPlayerState === 1) {
                this.sendYtCommand('pauseVideo');
              } else {
                this.sendYtCommand('playVideo');
              }
            } else {
              if (this.videoElement.paused) {
                this.videoElement.play().catch(() => {});
              } else {
                this.videoElement.pause();
              }
            }
          }
          break;
        case 'ArrowLeft':
          if (hasControl) {
            e.preventDefault();
            if (this.isYoutube) {
              this.sendYtCommand('seekTo', [Math.max(0, this.ytCurrentTime - 10), true]);
            } else {
              this.videoElement.currentTime = Math.max(0, this.videoElement.currentTime - 10);
            }
          }
          break;
        case 'ArrowRight':
          if (hasControl) {
            e.preventDefault();
            if (this.isYoutube) {
              this.sendYtCommand('seekTo', [Math.min(this.ytDuration, this.ytCurrentTime + 10), true]);
            } else {
              this.videoElement.currentTime = Math.min(this.videoElement.duration, this.videoElement.currentTime + 10);
            }
          }
          break;
        case 'KeyF':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          this.toggleMute();
          break;
      }
    });
  }

  private sendPlayerState(action: 'PLAY' | 'PAUSE' | 'SEEK') {
    const time = this.isYoutube ? this.ytCurrentTime : this.videoElement.currentTime;
    const rate = this.isYoutube ? 1.0 : this.videoElement.playbackRate;

    this.safeSendMessage({
      type: 'CONTENT_PLAYER_STATE',
      payload: {
        action,
        currentTime: time,
        playbackRate: rate,
      },
    });
  }

  // Sliding Chat Drawer setup
  private setupChatDrawer() {
    this.chatToggleBtn.addEventListener('click', () => {
      this.chatOpen = !this.chatOpen;
      if (this.chatOpen) {
        this.chatDrawer.classList.add('open');
        this.unreadCount = 0;
        this.chatUnread.style.display = 'none';
        this.chatInputField.focus();
      } else {
        this.chatDrawer.classList.remove('open');
      }
    });

    this.closeChatBtn.addEventListener('click', () => {
      this.chatOpen = false;
      this.chatDrawer.classList.remove('open');
    });

    const sendMessage = () => {
      const text = this.chatInputField.value.trim();
      if (!text) return;

      this.safeSendMessage({
        type: 'SEND_CHAT',
        payload: { text }
      });
      this.chatInputField.value = '';
    };

    this.chatSendBtn.addEventListener('click', sendMessage);
    this.chatInputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Floating Emoji Reaction Panel
  private setupReactions() {
    document.querySelectorAll('.reaction-emoji-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        if (emoji) {
          this.safeSendMessage({
            type: 'SEND_REACTION',
            payload: { reactionType: emoji }
          });
        }
      });
    });
  }

  private appendChatMessage(payload: { messageId: string; displayName: string; text: string; userId: string }) {
    if (payload.messageId) {
      if (this.processedMessageIds.has(payload.messageId)) return;
      this.processedMessageIds.add(payload.messageId);
      if (this.processedMessageIds.size > 200) {
        const first = this.processedMessageIds.values().next().value;
        if (first !== undefined) this.processedMessageIds.delete(first);
      }
    }

    const isMine = payload.userId === this.myUserId;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isMine ? 'mine' : ''}`;

    const name = document.createElement('span');
    name.className = 'sender-name';
    name.innerText = payload.displayName;

    const text = document.createElement('span');
    text.className = 'message-text';
    text.innerText = payload.text;

    bubble.appendChild(name);
    bubble.appendChild(text);
    this.chatMessages.appendChild(bubble);

    // Scroll to bottom
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    // Badge indicator if chat is closed
    if (!this.chatOpen) {
      this.unreadCount++;
      this.chatUnread.innerText = this.unreadCount.toString();
      this.chatUnread.style.display = 'block';

      // Show floating glassmorphic chat toast in bottom-right if not mine
      if (!isMine) {
        this.chatToastSender.innerText = payload.displayName;
        this.chatToastText.innerText = payload.text;
        if (this.chatToastTimeout) {
          clearTimeout(this.chatToastTimeout);
        }
        this.chatToast.style.display = 'flex';
        this.chatToastTimeout = setTimeout(() => {
          this.chatToast.style.display = 'none';
        }, 4000);
      }
    }
  }

  // Participant Ready notification triggers
  private triggerHostReadyNotification(displayName: string, fileName: string) {
    this.readyBanner.innerText = `⚡ ${displayName} is ready to watch "${fileName}"!`;
    this.readyBanner.style.display = 'block';
    setTimeout(() => {
      this.readyBanner.style.display = 'none';
    }, 4000);
  }

  private setupNetworkListeners() {
    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === 'CONTENT_TRIGGER_ACTION') {
        const payload = message.payload as MediaStateChangePayload;
        this.applyServerSync(payload);
      } else if (message.type === 'ROOM_STATE_UPDATED') {
        this.activeRoom = message.payload as RoomDetails;
        this.updateControlAccess();
        this.checkYouTubeMode();
        this.renderOverlappingAvatars();
        this.cleanupPeerConnectionsAndCards();
      } else if (message.type === 'CHAT_RECEIVED') {
        this.appendChatMessage(message.payload);
      } else if (message.type === 'DOWNLOAD_PROGRESS') {
        const { fileName, progress } = message.payload;
        // Don't show buffer overlay for the host
        if (this.activeRoom && this.activeRoom.hostId !== this.myUserId) {
          this.showDownloadBufferOverlay(fileName, progress);
        }
      } else if (message.type === 'PARTICIPANT_READY') {
        const { displayName, fileName } = message.payload;
        if (this.activeRoom && this.activeRoom.hostId === this.myUserId) {
          this.triggerHostReadyNotification(displayName, fileName);
        }
      } else if (message.type === 'PEER_CURSORS_UPDATED') {
        this.renderPeerCursor(message.payload);
      } else if (message.type === 'PEER_REACTION_RECEIVED') {
        this.renderEmojiReaction(message.payload);
      } else if (message.type === 'PEER_MEDIA_STATE_UPDATED') {
        const { userId, micEnabled, camEnabled } = message.payload;
        this.peerStates.set(userId, { micEnabled, camEnabled });
        this.renderOverlappingAvatars();
        this.cleanupPeerConnectionsAndCards();
      } else if (message.type === 'WEBRTC_SIGNAL') {
        const { senderUserId, signal } = message.payload;
        let pc = this.peerConnections.get(senderUserId);

        if (signal.sdp) {
          const sdp = signal.sdp;
          if (sdp.type === 'offer') {
            if (!pc) {
              pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
              });

              if (this.localStream) {
                this.localStream.getTracks().forEach((track) => {
                  pc!.addTrack(track, this.localStream!);
                });
              }

              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  this.safeSendMessage({
                    type: 'WEBRTC_SIGNAL',
                    payload: {
                      targetUserId: senderUserId,
                      signal: { candidate: event.candidate }
                    }
                  });
                }
              };

              pc.ontrack = (event) => {
                const remoteStream = event.streams[0];
                this.showRemoteWebcam(senderUserId, remoteStream);
              };

              this.peerConnections.set(senderUserId, pc);
            }

            pc.setRemoteDescription(new RTCSessionDescription(sdp))
              .then(() => pc!.createAnswer())
              .then((answer) => pc!.setLocalDescription(answer))
              .then(() => {
                this.safeSendMessage({
                  type: 'WEBRTC_SIGNAL',
                  payload: {
                    targetUserId: senderUserId,
                    signal: { sdp: pc!.localDescription }
                  }
                });

                // Apply queued candidates
                const queue = this.iceCandidatesQueue.get(senderUserId);
                if (queue) {
                  queue.forEach((candidate) => {
                    pc!.addIceCandidate(new RTCIceCandidate(candidate))
                      .catch((err) => console.error('Error adding queued ICE candidate:', err));
                  });
                  this.iceCandidatesQueue.delete(senderUserId);
                }
              })
              .catch((err) => console.error('Error handling WebRTC offer:', err));
          } else if (sdp.type === 'answer') {
            if (pc) {
              pc.setRemoteDescription(new RTCSessionDescription(sdp))
                .then(() => {
                  // Apply queued candidates
                  const queue = this.iceCandidatesQueue.get(senderUserId);
                  if (queue) {
                    queue.forEach((candidate) => {
                      pc!.addIceCandidate(new RTCIceCandidate(candidate))
                        .catch((err) => console.error('Error adding queued ICE candidate:', err));
                    });
                    this.iceCandidatesQueue.delete(senderUserId);
                  }
                })
                .catch((err) => console.error('Error setting remote description answer:', err));
            }
          }
        } else if (signal.candidate) {
          if (pc && pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
              .catch((err) => console.error('Error adding ICE candidate:', err));
          } else {
            let queue = this.iceCandidatesQueue.get(senderUserId);
            if (!queue) {
              queue = [];
              this.iceCandidatesQueue.set(senderUserId, queue);
            }
            queue.push(signal.candidate);
          }
        }
      }
    });
  }

  private applyServerSync(payload: MediaStateChangePayload) {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.isProcessingSync = true;

    try {
      const latency = (Date.now() - payload.timestamp) / 1000;
      const targetTime = payload.action === 'PLAY'
        ? payload.currentTime + (latency * payload.playbackRate)
        : payload.currentTime;

      if (this.isYoutube) {
        const drift = Math.abs(this.ytCurrentTime - targetTime);
        if (drift > this.syncThreshold) {
          this.sendYtCommand('seekTo', [targetTime, true]);
        }

        if (payload.action === 'PLAY' && this.ytPlayerState !== 1) {
          this.sendYtCommand('playVideo');
        } else if (payload.action === 'PAUSE' && this.ytPlayerState === 1) {
          this.sendYtCommand('pauseVideo');
        }
      } else if (this.videoElement && this.videoElement.src) {
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

        const timeoutDuration = didSeek ? 1500 : 500;
        this.syncTimeout = setTimeout(() => {
          this.isProcessingSync = false;
        }, timeoutDuration);
        return;
      }

      this.syncTimeout = setTimeout(() => {
        this.isProcessingSync = false;
      }, 800);

    } catch (err) {
      console.error('Error applying server sync:', err);
      this.isProcessingSync = false;
    }
  }

  private setupPlayerSocialControls() {
    if (this.cursorEnabled) this.cursorBtn.classList.add('active');

    this.micBtn.addEventListener('click', () => {
      this.micEnabled = !this.micEnabled;
      this.micBtn.classList.toggle('active', this.micEnabled);
      this.toggleLocalMediaStream();
    });

    this.camBtn.addEventListener('click', () => {
      this.camEnabled = !this.camEnabled;
      this.camBtn.classList.toggle('active', this.camEnabled);
      this.toggleLocalMediaStream();
    });

    this.cursorBtn.addEventListener('click', () => {
      this.cursorEnabled = !this.cursorEnabled;
      this.cursorBtn.classList.toggle('active', this.cursorEnabled);
    });

    this.pointerShield.addEventListener('mousemove', (e) => {
      if (!this.cursorEnabled || !this.activeRoom) return;

      const now = Date.now();
      if (now - this.lastCursorSendTime < 60) return; // Limit to ~16 updates per second
      this.lastCursorSendTime = now;

      const rect = this.pointerShield.getBoundingClientRect();
      const x = e.offsetX / rect.width;
      const y = e.offsetY / rect.height;

      this.safeSendMessage({
        type: 'SEND_CURSOR',
        payload: { x, y, laserActive: false }
      });
    });
  }

  private toggleLocalMediaStream() {
    if (!this.micEnabled && !this.camEnabled) {
      if (this.localStream) {
        this.localStream.getTracks().forEach(t => t.stop());
        this.localStream = null;
      }
      const localCard = document.getElementById('webcam-card-local');
      if (localCard) localCard.remove();
      this.broadcastMediaState();

      this.peerConnections.forEach((pc) => pc.close());
      this.peerConnections.clear();
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: this.camEnabled ? { width: 320, height: 240 } : false,
      audio: this.micEnabled
    }).then((stream) => {
      if (this.localStream) {
        this.localStream.getTracks().forEach(t => t.stop());
      }
      this.localStream = stream;
      this.showLocalWebcam(stream);
      this.broadcastMediaState();
      this.initiateWebRTCConnections();
    }).catch((err) => {
      console.error('Failed to get user media:', err);
      this.micEnabled = false;
      this.camEnabled = false;
      this.micBtn.classList.remove('active');
      this.camBtn.classList.remove('active');
      this.broadcastMediaState();
    });
  }

  private showLocalWebcam(stream: MediaStream) {
    let card = document.getElementById('webcam-card-local');
    const myName = this.activeRoom?.participants.find(p => p.userId === this.myUserId)?.displayName || '';
    const labelText = myName ? `You (${myName})` : 'You';

    if (!card) {
      card = document.createElement('div');
      card.className = 'webcam-card';
      card.id = 'webcam-card-local';

      // Set initial bottom/right position offset
      const existing = this.webcamGrid.querySelectorAll('.webcam-card').length;
      card.style.bottom = `${120 + existing * 165}px`;
      card.style.right = '24px';

      const video = document.createElement('video');
      video.className = 'webcam-video';
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      card.appendChild(video);

      const label = document.createElement('div');
      label.className = 'webcam-label';
      label.innerText = labelText;
      card.appendChild(label);

      this.webcamGrid.appendChild(card);
      this.makeCardDraggable(card);
    } else {
      const video = card.querySelector('video') as HTMLVideoElement;
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      const label = card.querySelector('.webcam-label') as HTMLElement;
      if (label) {
        label.innerText = labelText;
      }
    }
    card.style.display = this.camEnabled ? 'flex' : 'none';
  }

  private initiateWebRTCConnections() {
    if (!this.activeRoom) return;
    this.activeRoom.participants.forEach((p) => {
      if (p.userId === this.myUserId) return;
      this.getOrCreatePeerConnection(p.userId);
    });
  }

  private getOrCreatePeerConnection(targetUserId: string): RTCPeerConnection {
    let pc = this.peerConnections.get(targetUserId);
    if (pc) {
      const senders = pc.getSenders();
      senders.forEach(sender => pc!.removeTrack(sender));
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => pc!.addTrack(track, this.localStream!));
      }
      
      // Trigger WebRTC renegotiation on track changes
      pc.createOffer().then(offer => {
        return pc!.setLocalDescription(offer);
      }).then(() => {
        this.safeSendMessage({
          type: 'WEBRTC_SIGNAL',
          payload: {
            targetUserId,
            signal: { sdp: pc!.localDescription }
          }
        });
      }).catch(err => {
        console.error('Error creating offer for renegotiation:', err);
      });

      return pc;
    }

    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc!.addTrack(track, this.localStream!));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.safeSendMessage({
          type: 'WEBRTC_SIGNAL',
          payload: {
            targetUserId,
            signal: { candidate: event.candidate }
          }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track from peer:', targetUserId);
      const remoteStream = event.streams[0];
      this.showRemoteWebcam(targetUserId, remoteStream);
    };

    this.peerConnections.set(targetUserId, pc);

    pc.createOffer().then(offer => {
      return pc!.setLocalDescription(offer);
    }).then(() => {
      this.safeSendMessage({
        type: 'WEBRTC_SIGNAL',
        payload: {
          targetUserId,
          signal: { sdp: pc!.localDescription }
        }
      });
    }).catch(err => {
      console.error('Error creating offer:', err);
    });

    return pc;
  }

  private showRemoteWebcam(userId: string, stream: MediaStream) {
    let card = document.getElementById(`webcam-card-${userId}`);
    const p = this.activeRoom?.participants.find(user => user.userId === userId);
    const displayName = p ? p.displayName : 'Participant';

    if (!card) {
      card = document.createElement('div');
      card.className = 'webcam-card';
      card.id = `webcam-card-${userId}`;

      // Set initial bottom/right position offset
      const existing = this.webcamGrid.querySelectorAll('.webcam-card').length;
      card.style.bottom = `${120 + existing * 165}px`;
      card.style.right = '24px';

      const video = document.createElement('video');
      video.className = 'webcam-video';
      video.autoplay = true;
      video.playsInline = true;
      video.muted = false;
      video.srcObject = stream;
      card.appendChild(video);

      const label = document.createElement('div');
      label.className = 'webcam-label';
      label.innerText = displayName;
      card.appendChild(label);

      this.webcamGrid.appendChild(card);
      this.makeCardDraggable(card);
    } else {
      const video = card.querySelector('video') as HTMLVideoElement;
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      const label = card.querySelector('.webcam-label') as HTMLElement;
      if (label) {
        label.innerText = displayName;
      }
    }
  }

  private makeCardDraggable(card: HTMLElement) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    card.addEventListener('mousedown', (e) => {
      // Don't drag if clicking buttons, links or if using CSS resize handles
      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
        return;
      }
      
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Resizing handle check (bottom-right 15px area)
      if (x > rect.width - 15 && y > rect.height - 15) {
        return;
      }

      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;

      const elementDrag = (ev: MouseEvent) => {
        ev.preventDefault();
        pos1 = pos3 - ev.clientX;
        pos2 = pos4 - ev.clientY;
        pos3 = ev.clientX;
        pos4 = ev.clientY;

        const gridRect = this.webcamGrid.getBoundingClientRect();

        // Switch to top/left positioning
        card.style.bottom = 'auto';
        card.style.right = 'auto';

        let newTop = card.offsetTop - pos2;
        let newLeft = card.offsetLeft - pos1;

        // Keep card within boundary
        newTop = Math.max(0, Math.min(gridRect.height - card.offsetHeight, newTop));
        newLeft = Math.max(0, Math.min(gridRect.width - card.offsetWidth, newLeft));

        card.style.top = `${newTop}px`;
        card.style.left = `${newLeft}px`;
      };

      const closeDragElement = () => {
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', closeDragElement);
      };

      document.addEventListener('mousemove', elementDrag);
      document.addEventListener('mouseup', closeDragElement);
    });
  }

  private broadcastMediaState() {
    this.safeSendMessage({
      type: 'USER_MEDIA_STATE',
      payload: {
        micEnabled: this.micEnabled,
        camEnabled: this.camEnabled,
      }
    });
  }

  private renderPeerCursor(cursor: any) {
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
      label.style.position = 'absolute';
      label.style.left = '15px';
      label.style.top = '-5px';
      label.style.backgroundColor = 'rgba(0,0,0,0.85)';
      label.style.border = '1px solid rgba(255, 255, 255, 0.15)';
      label.style.color = '#fff';
      label.style.padding = '2px 8px';
      label.style.borderRadius = '4px';
      label.style.fontSize = '10px';
      label.style.whiteSpace = 'nowrap';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '4px';
      cursorDiv.appendChild(label);

      this.playerContainer.appendChild(cursorDiv);
    }

    const label = cursorDiv.querySelector('span');
    if (label) {
      const peerMedia = this.peerStates.get(cursor.userId);
      const micIcon = peerMedia?.micEnabled ? '🎙️' : '';
      const camIcon = peerMedia?.camEnabled ? '📹' : '';
      label.innerText = `${cursor.displayName} ${micIcon} ${camIcon}`.trim();
    }

    const rect = this.playerContainer.getBoundingClientRect();
    const xPos = cursor.x * rect.width;
    const yPos = cursor.y * rect.height;

    cursorDiv.style.left = `${xPos}px`;
    cursorDiv.style.top = `${yPos}px`;
    cursorDiv.style.display = 'block';

    const timeoutKey = cursor.userId;
    const existingTimeout = this.cursorTimeouts.get(timeoutKey);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(() => {
      if (cursorDiv) cursorDiv.style.display = 'none';
    }, 3000);
    this.cursorTimeouts.set(timeoutKey, timeout);
  }

  private renderEmojiReaction(reaction: EmojiReactionPayload) {
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

    const rect = this.playerContainer.getBoundingClientRect();
    const startX = Math.random() * rect.width;
    div.style.left = `${startX}px`;
    div.style.top = `${rect.height - 60}px`;

    this.playerContainer.appendChild(div);

    let opacity = 1;
    let currentY = rect.height - 60;

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

  private renderOverlappingAvatars() {
    if (!this.activeRoom) return;

    this.avatarsContainer.innerHTML = '';

    const sorted = [...this.activeRoom.participants].sort((a, b) => {
      if (a.userId === this.activeRoom?.hostId) return -1;
      if (b.userId === this.activeRoom?.hostId) return 1;
      return 0;
    });

    sorted.forEach((p) => {
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      
      const initial = p.displayName.charAt(0).toUpperCase();
      avatar.innerText = initial;
      avatar.title = p.displayName;

      let charSum = 0;
      for (let i = 0; i < p.displayName.length; i++) {
        charSum += p.displayName.charCodeAt(i);
      }
      const hue = charSum % 360;
      avatar.style.backgroundColor = `hsl(${hue}, 60%, 30%)`;

      const peerMedia = this.peerStates.get(p.userId);
      if (peerMedia?.micEnabled || peerMedia?.camEnabled) {
        const badge = document.createElement('div');
        badge.className = 'avatar-icon-badge';
        badge.innerText = peerMedia.micEnabled ? '🎙️' : '📹';
        avatar.appendChild(badge);
      }

      this.avatarsContainer.appendChild(avatar);
    });
  }

  private cleanupPeerConnectionsAndCards() {
    if (!this.activeRoom) return;

    const activeUserIds = new Set(this.activeRoom.participants.map(p => p.userId));
    const cards = this.webcamGrid.querySelectorAll('.webcam-card');

    cards.forEach((card) => {
      const id = card.id;
      if (id === 'webcam-card-local') return;

      const userId = id.replace('webcam-card-', '');
      const peerMedia = this.peerStates.get(userId);
      const cameraOn = peerMedia?.camEnabled;

      if (!activeUserIds.has(userId) || !cameraOn) {
        card.remove();
        if (!activeUserIds.has(userId)) {
          const pc = this.peerConnections.get(userId);
          if (pc) {
            pc.close();
            this.peerConnections.delete(userId);
          }
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LocalSyncPlayer();
});
