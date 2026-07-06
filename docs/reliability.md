# Reliability & Resilience System

This document outlines the architecture, policies, and behavior designed to make Universal Watch Party stable under challenging network conditions, browser events, and temporary server failures.

---

## 1. Automatic Recovery Sequence
When a crash, tab reload, or network drop occurs, the extension executes a multi-step recovery sequence without requiring user action:
1. **Detect Interruption**: The client monitors Socket connection state, heartbeat failures, and page unloading.
2. **Re-Authenticate**: Restores session tokens using browser local storage.
3. **Re-Establish Room Session**: Connects to the room ID stored in session storage.
4. **Restore Presence**: Sets local presence state (e.g. `Reconnecting` to `Online`).
5. **Re-Initialize Playback Engine**: Scans the tab for the matching media element or re-opens the URL.
6. **Re-Synchronize Timeline**: Queries the room's current authoritative state and performs drift correction or seeks.
7. **Rejoin Media streams**: Reconnects voice and webcam feeds.

---

## 2. Heartbeat & Presence Tracking
To track participant availability, the client and server coordinate via a heartbeat protocol:
* **Interval**: Clients send a heartbeat packet to the server every $X$ seconds (default: 5s).
* **Payload**:
  ```json
  {
    "participantId": "user-abc",
    "roomId": "room-xyz",
    "playbackTime": 124.5,
    "presence": "Watching",
    "networkQuality": "Good"
  }
  ```
* **Timeout & Eviction**:
  * If heartbeats miss for **10 seconds**, the server flags the user's presence as `Reconnecting` and notifies the room.
  * If heartbeats are missing for more than **60 seconds**, the user is marked `Disconnected` and removed from the active slot, freeing room bandwidth.

---

## 3. Session Persistence
To recover from browser crashes or accidental tab closures, the extension maintains a persistent session cache:
* **Scope**: Cached in standard extension storage (`chrome.storage.local`).
* **Fields Stored**: Room ID, user role (Host/Participant), active playback engine type, target tab ID, active media URL/file hash, volume settings, and device permissions.
* **Security**: No raw login credentials or subscription passwords are ever cached.

---

## 4. Edge Cases & Failure Handling

| Category | Scenario | Expected Behavior |
| :--- | :--- | :--- |
| **Network** | **Low Bandwidth** | Increase buffer sizes; throttle webcam quality; pause background chunk downloads; prioritize audio. |
| | **Latency Spikes** | Increase acceptable drift threshold temporarily; prefer gradual speed-up correction over abrupt seeking. |
| | **Complete Disconnect** | Pause playback; show reconnecting spinner; attempt reconnection loop with exponential backoff. |
| **Playback** | **DRM Failure** | Never attempt bypass; display an error modal telling the user to log in or check their license. |
| | **Missing / Deleted Web Video** | Keep the room session open; display a warning to participants; allow the host to select a new link. |
| **Room** | **Host Disconnection** | Pause playback (if configured); assign temporary host role to co-host; restore host ownership when they reconnect. |
| | **Room Expiration** | Force expire empty rooms after 30 minutes; show a clean expiration screen with a quick "Recreate Room" button. |
| **Downloads** | **Corrupted Chunk** | Hash verification fails; discard the chunk; request a new download of that specific chunk index from peers. |
| | **Disk Space Full** | Pause P2P downloader; trigger a warning; direct the user to the Cache Management settings page. |
| **Device** | **Mic/Camera Unplugged** | Mute user/stop stream; show a popup warning; fallback to remaining media devices gracefully. |
| | **Tab Reload** | Instantly execute the recovery sequence on the new tab instance. |
