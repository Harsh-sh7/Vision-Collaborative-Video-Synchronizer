# OTT Sync Engine

The OTT Sync Engine enables synchronized watch parties on commercial Over-The-Top (OTT) streaming platforms. Because these services host copyrighted and DRM-protected media, the extension operates under strict legal and technical boundaries, synchronizing player states without redistributing media streams or bypassing subscription walls.

---

## Supported Platforms
* **Netflix** (Custom player wrapper scripts)
* **Amazon Prime Video** (HTML5 player overrides)
* **Disney+ / Disney+ Hotstar** (Native DOM hook scripts)
* **JioHotstar** (Local content adapter script)

---

## Technical Constraints & Boundaries

> [!IMPORTANT]
> The extension **never** bypasses Digital Rights Management (DRM) or subscription walls. 
> * **Independent Access**: Every participant must log into their own account and have a valid subscription for the target platform.
> * **No Pixel Sharing**: Media is rendered locally on each device. Only playback states (timestamp, play, pause) are sent over the network.
> * **No Credential Sharing**: Login details, cookie sessions, or tokens are never shared between participants.

---

## User Flow
1. **Selection**: The host navigates to a video page on a supported OTT website and selects "Share OTT Session".
2. **Redirection**: The extension shares the target title URL (or unique content ID) with all connected participants.
3. **Authentication Check**: Participants are redirected to the URL. If a participant is not logged in, they are prompted to authenticate independently.
4. **Waiting Room**: The host is held in a "Waiting Room" dashboard until all participants have successfully authenticated and loaded the player page.
5. **Readiness Verification**: Once every participant reaches a ready state (buffering completed, title matching), the host starts playback.
6. **Synchronized Playback**: Play, pause, seek, and episode selection commands remain synchronized.

---

## OTT-Specific Features
* **Episode Synchronization**: Automatically coordinates moving to the next episode in a series.
* **Auto-Recovery**: If a participant reloads the tab or encounters a playback crash, the extension recovers their position and navigates them back to the active timestamp.
* **Ready Indicators**: Live status showing if participants are *Authenticating*, *Buffering*, or *Ready*.
* **Sync Delay Mitigation**: Adjusts startup triggers to account for the slower load times typical of heavy commercial players.
