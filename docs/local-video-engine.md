# Local Video Engine

The Local Video Engine enables users to watch locally downloaded media together without requiring long upload wait times or relying on permanent cloud hosting. It splits files into discrete, hashed chunks, coordinates peer-to-peer (P2P) distribution, and facilitates progressive downloading and local caching.

---

## High-Level Capabilities
* **Adaptive Chunking**: Splits local files into small chunks based on bitrate and size for efficient sharing.
* **P2P Distribution**: Distributes video chunks directly between participants in the room, utilizing a backend relay server only when P2P connections (WebRTC Data Channels) fail.
* **Progressive Playback**: Allows participants to begin watching once an initial threshold buffer is reached, rather than waiting for the entire file.
* **Integrity & Security**: Uses file hashing (e.g. SHA-256) to verify chunk integrity, detect corruption, and deduplicate files.

---

## User Flow
1. **Media Selection**: The host selects a local video file (e.g., MP4, MKV).
2. **Metadata Generation**: The extension generates a unique hash for the file and splits it logically into indexed chunks.
3. **Swarm Invitation**: The host broadcasts the metadata and chunk map to all participants.
4. **Progressive Download**: Participants query the swarm (and host) for chunks, downloading them into local temporary storage.
5. **Readiness Detection**: Once a participant has buffered enough sequential chunks (the startup buffer window), they report "Ready".
6. **Playback Trigger**: The host initiates playback once the readiness threshold is met across participants.
7. **Background Syncing**: The remaining chunks continue to download, verify, and buffer in sequential order while watching.
8. **Permanent Caching**: The complete, verified video is cached locally on participant devices for future reuse.

---

## Progressive Playback & Smart Buffering
To minimize wait time and prevent intermediate pauses, the engine monitors:
* **Current Bitrate**: The requirements of the media stream.
* **Download Speed**: Estimated bandwidth available for incoming chunks.
* **Buffer Level**: Current number of sequential seconds downloaded ahead of the playhead.
* **Network Quality**: Packet loss and latency to peers.

The initial readiness threshold adjusts dynamically. If a participant has a slow network, the engine increases their required startup buffer size to guarantee uninterrupted viewing.

---

## Local Cache Management
Completed videos are retained in the extension's local persistent storage (using IndexedDB or Origin Private File System).
* **Swarm Verification**: If a host shares a file that a participant has already cached (verified by matching file hashes), the participant joins the room *instantly* without downloading any data.
* **Partial Cache Resuming**: If a download was interrupted, the extension verifies the existing chunks and downloads only the missing segments.
* **Cache Management UI**:
  * View list of cached videos and individual disk footprint.
  * Adjust maximum storage limit allocations.
  * Configure auto-cleanup rules (e.g., Delete files older than 14 days, or delete least recently used when storage is full).
  * Manually clear selected files or wipe cache completely.

---

## Download Settings
Users can customize the engine's behavior:
* **Max Concurrent Downloads**: Limit the number of active chunk transfers to protect browser performance.
* **Bandwidth Cap**: Throttle background download speeds to prevent network congestion during voice or webcam chats.
* **Auto-Resume**: Toggle whether incomplete downloads should automatically resume upon reconnection.
* **Retry Strategy**: Configure chunk download timeouts and retries on failed transfers.
