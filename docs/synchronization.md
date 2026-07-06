# Synchronization & Playback Control

This document specifies how playback is controlled, how conflicts are resolved when multiple users control media, and how playback drift is corrected.

---

## 1. Playback Authority
At any given moment, there is exactly one **Authoritative Playback State** for a room. This state is managed by the backend server and consists of:
* `playbackState`: `PLAYING` | `PAUSED` | `BUFFERING`
* `timestamp`: Absolute playback time (in seconds).
* `playbackRate`: Playback speed (e.g., `1.0`, `1.25`, `1.5`).
* `lastUpdated`: The server time when this state was changed.

All connected client extensions synchronize their local media players (HTML5 video tags, YouTube adapters, OTT elements) to match this authoritative state. No client is permitted to maintain an independent timeline.

---

## 2. Playback Control Modes

Rooms operate under two control policies:

### Host-Only Mode
* Only the Host (and Co-hosts, if designated) can broadcast playback state changes.
* Standard participants can interact with local player controls (e.g. adjust local volume, toggle local subtitles) but cannot pause, play, or seek media for the rest of the room.
* If a participant seeks locally, they are immediately corrected and synced back to the authoritative position.

### Collaborative Mode
* All approved room participants are granted playback privileges.
* Play, pause, seek, and speed change actions from participants are forwarded to the backend.
* Once approved by the server, these commands update the room's authoritative state and propagate to all participants.

---

## 3. Conflict Resolution
In Collaborative Mode, multiple participants might trigger play, pause, or seek actions at similar times. The server resolves these conflicts using the following rules:
1. **Timestamping**: Every command sent by a client includes a client timestamp and a unique request ID.
2. **Server Ordering**: The socket server receives commands, stamps them with the server-reception timestamp, and evaluates them sequentially.
3. **Validity Check**: Commands that are outdated or fail permission checks are immediately discarded.
4. **Authoritative Convergence**: The latest valid command processed by the server overrides all previous states. All participants converge on this new command.

---

## 4. Drift Correction & Playback Preferences
Because of differing network connections and local hardware speeds, playback position can drift slightly over time.

### Drift Correction Mechanism
* The extension checks the local player's `currentTime` against the calculated room timestamp every few seconds.
* **Calculated Room Timestamp**:
  $$\text{Target Position} = \text{Authoritative Timestamp} + (\text{Current Time} - \text{State Last Updated Time}) \times \text{Playback Rate}$$
* **Correction Thresholds**:
  * **$< 0.5$ seconds**: Ignored (acceptable jitter).
  * **$0.5$s to $2.0$s**: Minor drift. The extension gradually speeds up or slows down local playback (modifying `playbackRate` slightly) to realign without stuttering.
  * **$> 2.0$ seconds**: Major drift. The extension performs an immediate seek to the target position.

### User Playback Preferences
Users can configure local sync behaviors in the extension options:
* **Auto-Sync Sensitivity**: Define the drift threshold before correction is applied.
* **Enable Automatic Drift Correction**: Toggle whether minor drift is adjusted silently or requires manual click-to-sync prompts.
* **Pause on Host Disconnect**: Choose whether local playback should automatically pause if the host drops out.
* **Auto-Play when Room is Ready**: Instantly start playing as soon as all participants finish buffering.
