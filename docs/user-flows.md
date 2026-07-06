# Complete User Flows

This document details the step-by-step user journeys for the primary workflows of the Universal Watch Party platform.

---

## 1. Onboarding Flow (First-Time User)

```
[Install Extension] ──> [Welcome Onboarding] ──> [Set Display Name] ──> [Grant Mic/Camera]
```

1. **Install**: The user installs the browser extension from the Web Store.
2. **First Run**: The user clicks the pinned extension icon. A welcome panel displays introducing key features.
3. **Setup**: The user inputs their desired Display Name and selects a default theme.
4. **Permissions Check**: The onboarding screen requests optional permissions for camera and microphone inputs.
5. **Tutorial**: A brief interactive tooltip series guides the user through room creation and invite links.

---

## 2. Room Lifecycle Flows

### Room Creation Flow
1. The host clicks **"Create Room"** in the popup interface.
2. The host configures room rules (e.g. Password protection, Join approvals, and toggle Collaborative Mode).
3. The server generates a unique Room ID and issues a JWT room token to the host.
4. The extension copies an invite URL (e.g., `https://party.example.com/join/room-12345`) to the host's clipboard.
5. The room goes into a `Waiting` state, showing the host's avatar.

### Room Joining Flow
1. A participant clicks the invite link.
2. The browser redirects to the web page or initiates the extension popup.
3. The extension checks authorization. If the room is password-protected or requires approval, it prompts the user.
4. Once verified, the client initiates a WebSocket connection to the backend and sends a `ROOM_JOIN` payload.
5. The server registers the participant, updates the room lists, and broadcasts the participant's join event to all peers.
6. The participant's extension adjusts their interface to display the active media page.

---

## 3. Engine Playback Flows

### Web Sync Playback Flow
1. The host selects a tab containing a video (e.g., YouTube).
2. The content script detects the video player and reads the page URL.
3. The host's extension broadcasts the URL to the room.
4. Participants' extensions prompt navigation or automatically open the shared URL in their active watch tab.
5. The extension tracks player loading. When buffering is sufficient, the client reports a `Ready` status.
6. Once all mandatory participants are ready, the host clicks "Play". The play command is broadcasted, and video starts synchronously across all clients.

### OTT Playback Flow
1. The host clicks "Sync OTT" on Netflix or Disney+.
2. The extension extracts the unique video/series ID and URL.
3. The URL is broadcasted to the room.
4. Participants open the tab. If a participant is not logged in, the player screen displays an "Authenticate to join watch party" message.
5. Once logged in, the participant's extension synchronizes their page to the active title.
6. The player pauses on page load, waiting for all participants to report "Ready".
7. The host releases the waiting room, synchronizing the initial playback timestamp.

### Local Video P2P Flow
1. The host selects a local file (e.g., `movie.mp4`).
2. The extension generates a file hash and split-chunk map.
3. The file metadata and chunk count are shared with participants.
4. Participants begin requesting chunks via WebRTC Data Channels.
5. While downloading, participants' UI shows progress bars.
6. Once the startup buffer (e.g., the first 30 seconds of video chunks) is assembled, the participant reports "Ready".
7. The host starts playback. While watching, the remaining chunks continue downloading in sequential order.
8. The completed file is saved to the local database cache.

---

## 4. Disconnect & Recovery Flow
1. A participant loses network connectivity.
2. Their local media player pauses.
3. The client extension sets the local state to `Reconnecting`.
4. The server flags the user's presence as `Reconnecting` and updates the room's participant lists.
5. The extension attempts to re-establish the WebSocket connection.
6. Once connected, the client sends a re-auth request and fetches the room's current playback position and state.
7. The client performs drift correction, seeks if necessary, and resumes media once the local player buffers.
8. Voice/webcam channels reconnect.
