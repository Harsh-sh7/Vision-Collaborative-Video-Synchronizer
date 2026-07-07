import { io, Socket } from 'socket.io-client';
import type {
  ExtensionMessage,
  RoomDetails,
  MediaStateChangePayload,
  ChatMessagePayload,
  CursorUpdatePayload,
  EmojiReactionPayload,
} from '../shared/types';

let socket: Socket | null = null;
let currentRoom: RoomDetails | null = null;
let currentTabId: number | null = null;
let playerTabId: number | null = null;
let myUserId = '';
const SERVER_URL = 'https://vision-collaborative-video-synchronizer.onrender.com'; // Production backend URL

// Auto-restore session and socket connection on script load/wakeup
chrome.storage.local.get(['activeRoom', 'userToken', 'displayName'], (res: any) => {
  if (res.activeRoom) {
    currentRoom = res.activeRoom;
  }
  if (res.userToken) {
    initSocket(res.userToken);
  }
});

// Keep-alive loop to prevent background service worker suspension while in a room session
setInterval(() => {
  if (currentRoom) {
    chrome.runtime.getPlatformInfo(() => {});
    console.log('Service worker keep-alive heartbeat sent');
  }
}, 20000);

// --- IndexedDB Cache System ---
const DB_NAME = 'watch_party_cache';
const DB_VERSION = 1;

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('video_chunks')) {
        db.createObjectStore('video_chunks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('videos_metadata')) {
        db.createObjectStore('videos_metadata', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}



function saveChunkAndIncrementMetadata(
  roomId: string,
  fileName: string,
  chunkIndex: number,
  chunkData: string,
  totalChunks: number,
  fileSize: number
): Promise<{ progress: number; notifiedReady: boolean }> {
  return initDB().then((db) => {
    return new Promise<{ progress: number; notifiedReady: boolean }>((resolve, reject) => {
      const transaction = db.transaction(['video_chunks', 'videos_metadata'], 'readwrite');
      const chunkStore = transaction.objectStore('video_chunks');
      const metaStore = transaction.objectStore('videos_metadata');

      const chunkId = `${roomId}-${fileName}-${chunkIndex}`;
      chunkStore.put({
        id: chunkId,
        roomId,
        fileName,
        chunkIndex,
        chunkData,
        timestamp: Date.now()
      });

      const metaId = `${roomId}-${fileName}`;
      const metaRequest = metaStore.get(metaId);

      metaRequest.onsuccess = () => {
        let metadata = metaRequest.result;
        if (!metadata) {
          metadata = {
            id: metaId,
            roomId,
            fileName,
            totalChunks,
            receivedChunks: 0,
            size: fileSize,
            expiry: Date.now() + 4 * 24 * 60 * 60 * 1000,
            notifiedReady: false
          };
        }
        metadata.receivedChunks++;
        
        let shouldNotify = false;
        const progress = Math.round((metadata.receivedChunks / metadata.totalChunks) * 100);
        if (progress >= 40 && !metadata.notifiedReady) {
          metadata.notifiedReady = true;
          shouldNotify = true;
        }

        metaStore.put(metadata);

        transaction.oncomplete = () => {
          resolve({ progress, notifiedReady: shouldNotify });
        };
      };

      transaction.onerror = () => reject(transaction.error);
    });
  });
}

// Auto-delete cache older than 4 days
function cleanupOldVideos(): Promise<void> {
  return initDB().then((db) => {
    const now = Date.now();
    return new Promise<any[]>((resolve, reject) => {
      const transaction = db.transaction('videos_metadata', 'readonly');
      const request = transaction.objectStore('videos_metadata').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    }).then(async (metadataList) => {
      for (const meta of metadataList) {
        if (now > meta.expiry) {
          console.log(`Pruning expired video cache: ${meta.fileName}`);
          
          // Delete metadata
          await new Promise<void>((res) => {
            const transaction = db.transaction('videos_metadata', 'readwrite');
            transaction.objectStore('videos_metadata').delete(meta.id);
            transaction.oncomplete = () => res();
          });

          // Delete all chunks
          const chunks = await new Promise<any[]>((res) => {
            const transaction = db.transaction('video_chunks', 'readonly');
            const request = transaction.objectStore('video_chunks').getAll();
            request.onsuccess = () => {
              const list = request.result || [];
              res(list.filter((c: any) => c.roomId === meta.roomId && c.fileName === meta.fileName));
            };
          });

          for (const chunk of chunks) {
            await new Promise<void>((res) => {
              const transaction = db.transaction('video_chunks', 'readwrite');
              transaction.objectStore('video_chunks').delete(chunk.id);
              transaction.oncomplete = () => res();
            });
          }
        }
      }
    });
  }).catch((e) => {
    console.error('Failed to run cache cleanup:', e);
  });
}

// Initialize cleanup on startup
cleanupOldVideos();

// Initialize connection
function initSocket(token: string) {
  if (socket) {
    socket.disconnect();
  }

  // Parse userId
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const body = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(body));
      myUserId = decoded.userId || '';
    }
  } catch (e) {
    console.error('Failed to parse token in initSocket:', e);
  }

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Connected to socket server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
    updatePresence('Reconnecting');
  });

  // Room joined event
  socket.on('ROOM_JOINED', (room: RoomDetails) => {
    currentRoom = room;
    chrome.storage.local.set({ activeRoom: room });
    broadcastToPopup({ type: 'ROOM_STATE_UPDATED', payload: room });
  });

  // Handle updates from room status changes (e.g. participant lists, settings)
  socket.on('ROOM_STATE_UPDATED', (room: RoomDetails) => {
    currentRoom = room;
    chrome.storage.local.set({ activeRoom: room });
    broadcastToPopup({ type: 'ROOM_STATE_UPDATED', payload: room });
    broadcastToContent({ type: 'ROOM_STATE_UPDATED', payload: room });
  });

  socket.on('HOST_START_WATCHING', () => {
    const playerUrl = chrome.runtime.getURL('player.html');
    chrome.tabs.query({}, (tabs) => {
      const existingTab = tabs.find((t) => t.url === playerUrl);
      if (existingTab && existingTab.id !== undefined) {
        chrome.tabs.update(existingTab.id, { active: true });
        if (existingTab.windowId !== undefined) {
          chrome.windows.update(existingTab.windowId, { focused: true });
        }
      } else {
        chrome.tabs.create({ url: playerUrl });
      }
    });
  });

  // Receive media state synchronization
  socket.on('MEDIA_STATE_CHANGE', (payload: MediaStateChangePayload) => {
    if (currentRoom) {
      currentRoom.state = {
        playbackState: payload.action === 'PLAY' ? 'PLAYING' : 'PAUSED',
        currentTime: payload.currentTime,
        playbackRate: payload.playbackRate,
        lastUpdated: payload.timestamp,
      };
      chrome.storage.local.set({ activeRoom: currentRoom });
    }
    broadcastToContent({ type: 'CONTENT_TRIGGER_ACTION', payload });
  });

  // Receive chat messages (relay to both popup and content scripts for player page display)
  socket.on('CHAT_MESSAGE', (payload: ChatMessagePayload) => {
    broadcastToPopup({ type: 'CHAT_RECEIVED', payload });
    broadcastToContent({ type: 'CHAT_RECEIVED', payload });
  });

  // Receive cursor coordinates
  socket.on('CURSOR_UPDATE', (payload: CursorUpdatePayload) => {
    broadcastToContent({ type: 'PEER_CURSORS_UPDATED', payload });
  });

  // Receive emoji reaction (relay to both popup and content scripts for player page display)
  socket.on('EMOJI_REACTION', (payload: EmojiReactionPayload) => {
    broadcastToContent({ type: 'PEER_REACTION_RECEIVED', payload });
    broadcastToPopup({ type: 'PEER_REACTION_RECEIVED', payload });
  });

  // Receive tab sharing broadcasts
  socket.on('SHARE_TAB', (payload: { activeUrl: string; activeTitle: string }) => {
    if (currentRoom) {
      currentRoom.activeUrl = payload.activeUrl;
      chrome.storage.local.set({ activeRoom: currentRoom });
      broadcastToPopup({ type: 'ROOM_STATE_UPDATED', payload: currentRoom });

      if (currentRoom.hostId !== myUserId) {
        chrome.tabs.update(currentTabId || undefined, { url: payload.activeUrl });
      }
    }
  });

  // Receive local video sharing broadcasts
  socket.on('LOCAL_VIDEO_SHARE', (payload: { fileName: string; fileSize: number }) => {
    if (currentRoom) {
      currentRoom.activeUrl = `local://${payload.fileName}`;
      (currentRoom as any).sharedLocalVideo = { name: payload.fileName, size: payload.fileSize };
      chrome.storage.local.set({ activeRoom: currentRoom });
      broadcastToPopup({ type: 'ROOM_STATE_UPDATED', payload: currentRoom });
      broadcastToContent({ type: 'ROOM_STATE_UPDATED', payload: currentRoom });
    }
  });

  // Receive chunk downloads in the background
  socket.on('CHUNK_RECEIVED', async (payload: { chunkIndex: number; totalChunks: number; chunkData: string; fileName: string; fileSize: number }) => {
    if (!currentRoom) return;
    const roomId = currentRoom.roomId;

    // Use single transaction to save chunk and increment metadata (resolves IndexedDB congestion)
    const { progress, notifiedReady } = await saveChunkAndIncrementMetadata(
      roomId,
      payload.fileName,
      payload.chunkIndex,
      payload.chunkData,
      payload.totalChunks,
      payload.fileSize
    );

    // Broadcast progress status updates
    broadcastToPopup({
      type: 'DOWNLOAD_PROGRESS',
      payload: { roomId, fileName: payload.fileName, progress }
    });
    broadcastToContent({
      type: 'DOWNLOAD_PROGRESS',
      payload: { roomId, fileName: payload.fileName, progress }
    });

    // Notify user once playable 40% threshold is met
    if (notifiedReady) {
      chrome.notifications.create(
        `ready-${roomId}-${encodeURIComponent(payload.fileName)}`,
        {
          type: 'basic',
          iconUrl: '/assets/icon128.png',
          title: 'Movie Ready to Play!',
          message: `"${payload.fileName}" is 40% downloaded. Click Play to start watching in sync!`,
          buttons: [{ title: 'Play / Start Watching' }],
          requireInteraction: true,
        }
      );
    }
  });

  // Receive ready notification updates
  socket.on('PARTICIPANT_READY', (payload: { userId: string; displayName: string; fileName: string }) => {
    broadcastToPopup({ type: 'PARTICIPANT_READY', payload });
    broadcastToContent({ type: 'PARTICIPANT_READY', payload });
  });

  // Receive peer media state updates
  socket.on('PEER_MEDIA_STATE_UPDATED', (payload: any) => {
    broadcastToPopup({ type: 'PEER_MEDIA_STATE_UPDATED', payload });
    broadcastToContent({ type: 'PEER_MEDIA_STATE_UPDATED', payload });
  });

  // Receive peer WebRTC signals
  socket.on('WEBRTC_SIGNAL', (payload: any) => {
    broadcastToContent({ type: 'WEBRTC_SIGNAL', payload });
  });
}

function updatePresence(presence: string) {
  if (socket && currentRoom) {
    socket.emit('HEARTBEAT', {
      roomId: currentRoom.roomId,
      presence,
    });
  }
}

// Helper to broadcast to the popup UI (if open)
function broadcastToPopup(msg: ExtensionMessage) {
  chrome.runtime.sendMessage(msg).catch(() => {
    // Popup is likely closed, ignore error
  });
}

// Helper to broadcast to the active tab's content script
function broadcastToContent(msg: ExtensionMessage) {
  if (playerTabId !== null) {
    chrome.tabs.sendMessage(playerTabId, msg).catch((err) => {
      console.warn('Failed to send to playerTabId, falling back to active tab:', err);
      sendToActiveTab(msg);
    });
  } else {
    sendToActiveTab(msg);
  }
}

function sendToActiveTab(msg: ExtensionMessage) {
  if (currentTabId !== null) {
    chrome.tabs.sendMessage(currentTabId, msg).catch(() => {});
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id !== undefined) {
        currentTabId = tabs[0].id;
        chrome.tabs.sendMessage(currentTabId, msg).catch(() => {});
      }
    });
  }
}

// Handle notification buttons click
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith('ready-') && buttonIndex === 0) {
    const playerUrl = chrome.runtime.getURL('player.html');
    chrome.tabs.query({}, (tabs) => {
      const existingTab = tabs.find((t) => t.url === playerUrl);
      if (existingTab && existingTab.id !== undefined) {
        chrome.tabs.update(existingTab.id, { active: true });
        if (existingTab.windowId !== undefined) {
          chrome.windows.update(existingTab.windowId, { focused: true });
        }
      } else {
        chrome.tabs.create({ url: playerUrl });
      }
    });
  }
});

// Listen to runtime messages (Popup UI or Content Script)
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (sender.tab?.id) {
    currentTabId = sender.tab.id;
    if (message.type === 'CONTENT_PLAYER_STATE' || message.type === 'SEND_CURSOR') {
      playerTabId = sender.tab.id;
    }
  }
  console.log('Background received message:', message.type);

  switch (message.type) {
    case 'GET_SESSION':
      chrome.storage.local.get(['activeRoom', 'userToken', 'displayName'], (res: any) => {
        let userId = '';
        if (res.userToken) {
          try {
            const parts = res.userToken.split('.');
            if (parts.length === 3) {
              let body = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              while (body.length % 4) {
                body += '=';
              }
              const decoded = JSON.parse(atob(body));
              userId = decoded.userId || '';
            }
          } catch (e) {
            console.error('Failed to parse token payload:', e);
          }
        }
        if (res.activeRoom) {
          currentRoom = res.activeRoom;
          if (!socket && res.userToken) {
            initSocket(res.userToken);
          }
        }
        sendResponse({
          activeRoom: currentRoom,
          displayName: res.displayName || '',
          userToken: res.userToken || '',
          userId,
        });
      });
      return true; // Keep channel open for async response

    case 'CREATE_ROOM':
      const { displayName, token } = message.payload;
      chrome.storage.local.set({ displayName, userToken: token });
      initSocket(token);
      
      // Request server to create room
      fetch(`${SERVER_URL}/api/v1/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ collaborativeMode: false }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (socket) {
            socket.emit('ROOM_JOIN', { roomId: data.roomId, displayName });
          }
          sendResponse({ success: true, roomCode: data.roomCode });
        })
        .catch((err: any) => {
          console.error('Failed to create room:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;

    case 'JOIN_ROOM':
      const { joinDisplayName, joinCode, joinToken } = message.payload;
      chrome.storage.local.set({ displayName: joinDisplayName, userToken: joinToken }, () => {
        initSocket(joinToken);

        // Verify room code
        fetch(`${SERVER_URL}/api/v1/rooms/verify/${joinCode}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.valid && socket) {
              socket.emit('ROOM_JOIN', { roomId: data.roomId, displayName: joinDisplayName });
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Invalid Room Code' });
            }
          })
          .catch((err: any) => {
            sendResponse({ success: false, error: err.message });
          });
      });
      return true;

    case 'LEAVE_ROOM':
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      currentRoom = null;
      chrome.storage.local.remove(['activeRoom']);
      sendResponse({ success: true });
      break;

    case 'CONTENT_PLAYER_STATE':
      if (socket && currentRoom) {
        const { action, currentTime, playbackRate } = message.payload;
        socket.emit('MEDIA_STATE_CHANGE', {
          requestId: Math.random().toString(36).substring(7),
          roomId: currentRoom.roomId,
          action,
          currentTime,
          playbackRate,
          timestamp: Date.now(),
        });
      }
      break;

    case 'SEND_CHAT':
      if (socket && currentRoom) {
        socket.emit('CHAT_MESSAGE', {
          roomId: currentRoom.roomId,
          text: message.payload.text,
        });
      }
      break;

    case 'SEND_REACTION':
      if (socket && currentRoom) {
        socket.emit('EMOJI_REACTION', {
          roomId: currentRoom.roomId,
          reactionType: message.payload.reactionType,
        });
      }
      break;

    case 'SEND_CURSOR':
      if (socket && currentRoom) {
        socket.emit('CURSOR_UPDATE', {
          roomId: currentRoom.roomId,
          x: message.payload.x,
          y: message.payload.y,
          laserActive: message.payload.laserActive,
        });
      }
      break;

    case 'SHARE_TAB':
      if (socket && currentRoom) {
        socket.emit('SHARE_TAB', {
          roomId: currentRoom.roomId,
          activeUrl: message.payload.activeUrl,
          activeTitle: message.payload.activeTitle,
        });
      }
      break;

    case 'LOCAL_VIDEO_SHARE':
      if (socket && currentRoom) {
        socket.emit('LOCAL_VIDEO_SHARE', {
          roomId: currentRoom.roomId,
          fileName: message.payload.fileName,
          fileSize: message.payload.fileSize,
        });
      }
      break;

    case 'UPDATE_ROOM_SETTINGS':
      if (socket && currentRoom) {
        socket.emit('UPDATE_ROOM_SETTINGS', {
          roomId: currentRoom.roomId,
          collaborativeMode: message.payload.collaborativeMode,
        });
      }
      break;

    case 'USER_MEDIA_STATE':
      if (socket && currentRoom) {
        socket.emit('USER_MEDIA_STATE', {
          roomId: currentRoom.roomId,
          micEnabled: message.payload.micEnabled,
          camEnabled: message.payload.camEnabled,
        });
      }
      break;

    case 'WEBRTC_SIGNAL':
      if (socket && currentRoom) {
        socket.emit('WEBRTC_SIGNAL', {
          roomId: currentRoom.roomId,
          targetUserId: message.payload.targetUserId,
          signal: message.payload.signal,
        });
      }
      break;

    case 'HOST_START_WATCHING':
      if (socket && currentRoom) {
        socket.emit('HOST_START_WATCHING', {
          roomId: currentRoom.roomId,
        });
      }
      break;

    case 'SEND_CHUNK':
      if (socket && currentRoom) {
        socket.emit('SEND_CHUNK', {
          roomId: currentRoom.roomId,
          chunkIndex: message.payload.chunkIndex,
          totalChunks: message.payload.totalChunks,
          chunkData: message.payload.chunkData,
          fileName: message.payload.fileName,
          fileSize: message.payload.fileSize,
        });
      }
      break;

    case 'PARTICIPANT_READY':
      if (socket && currentRoom) {
        socket.emit('PARTICIPANT_READY', {
          roomId: currentRoom.roomId,
          fileName: message.payload.fileName,
        });
      }
      break;

    case 'AUTO_JOIN_ROOM':
      const { roomCode } = message.payload;
      chrome.storage.local.get(['displayName', 'userToken'], (res: any) => {
        const displayName = res.displayName;
        const token = res.userToken;

        const performJoin = (userDisp: string, userTok: string) => {
          chrome.storage.local.set({ displayName: userDisp, userToken: userTok });
          initSocket(userTok);

          // Verify and Join Room Code
          fetch(`${SERVER_URL}/api/v1/rooms/verify/${roomCode}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.valid && socket) {
                socket.emit('ROOM_JOIN', { roomId: data.roomId, displayName: userDisp });
                
                // Open popup or open extension index page in tab
                chrome.action.openPopup?.().catch(() => {
                  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
                });
              }
            })
            .catch((err) => console.error('Auto-join failed:', err));
        };

        if (displayName && token) {
          performJoin(displayName, token);
        } else {
          // Register a random guest name
          const guestName = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
          fetch(`${SERVER_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: guestName }),
          })
            .then((r) => r.json())
            .then((auth) => {
              if (auth.token) {
                performJoin(guestName, auth.token);
              }
            })
            .catch((err) => console.error('Guest registration failed:', err));
        }
      });
      break;
  }
});

// Watch tab updates to attach or detach active status
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    currentTabId = tabId;
  }
});
