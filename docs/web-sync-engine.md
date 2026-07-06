# Web Sync Engine

The Web Sync Engine synchronizes videos that are hosted on standard web pages. Instead of capturing and encoding video frames, it shares the page URL across all participants, loading the page on each device, and uses standard web browser APIs to synchronize media playback.

---

## Supported Platforms & Players
* **YouTube**: Fully synchronized using custom wrapper scripts on top of the iframe API or page script elements.
* **Vimeo**: Interactive wrapper supporting player API commands.
* **Generic HTML5 Video Elements**: Automatic extraction and synchronization of direct `<video>` nodes on standard websites.
* **Educational Portals**: Custom adapters for university portals and digital learning platforms.
* **Cloud-Hosted MP4/HLS Players**: Direct synchronization of standard web-hosted media stream players.

---

## User Flow
1. **Selection**: The host selects a browser tab running supported video content.
2. **Detection**: The extension's content script detects the video player element and grabs its metadata.
3. **URL Sharing**: The active page URL is sent to the backend and broadcasted to all participants.
4. **Loading & Sync**: Participant extensions automatically navigate their active shared tab to the shared URL.
5. **Readiness Check**: The extension waits until all participants have loaded the page DOM and buffered the video above the startup threshold.
6. **Playback Initialization**: Playback starts synchronized across all clients once the readiness check passes.
7. **Interactive Tracking**: Every pause, seek, play, and speed change is intercepted and synchronized.

---

## Web-Specific Sync Features
* **URL Broadcast**: Automatically propagates URL navigation to keep participants on the same video or playlist item.
* **Drift Correction**: Continuous monitoring of player `currentTime`. Sub-second adjustments are applied to keep playback aligned.
* **Speed Sync**: Changes to the player's playback speed (`playbackRate`) are synchronized.
* **Auto-Re-sync**: Automatically pauses and re-syncs if a participant falls behind due to brief network buffering.
* **Host Control Modes**: Toggle between host-only playback control and collaborative mode.

---

## Unsupported Sites & Fallback
If the Web Sync Engine fails to detect a compatible media player, or if the website content is locked behind un-sharable state (e.g. non-URL-addressable dynamic portals):
1. The extension prompts the host with a clear compatibility warning.
2. The UI suggests screen sharing or switching to a supported URL source as a fallback.
