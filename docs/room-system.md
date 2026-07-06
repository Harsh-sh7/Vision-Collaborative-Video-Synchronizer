# Universal Room System

The Room System coordinates every participant and every synchronized viewing session. It manages connection states, roles, permissions, and moderation commands.

---

## Room Components
* **Host**: The room creator who holds primary control.
* **Co-host**: Secondary administrators designated by the host.
* **Participants**: Users connected to the room.
* **Playback State**: The authoritative room playback position, speed, and state (playing, paused, buffering).
* **Active Playback Engine**: The selected synchronization engine for the active tab (Web, OTT, or Local).
* **Shared Tab**: Metadata regarding the active video url or local file.
* **Chat**: Real-time room communication history.
* **Presence**: Connection and readiness indicators for each user.
* **Permissions**: Configured access rules for collaborative controls.

---

## Room Lifecycle
1. **Create Room**: The host initializes a session and selects initial room policies.
2. **Generate Invite**: An encrypted join link or room token is generated.
3. **Participants Join**: Users connect to the socket server using the invite token.
4. **Ready Check**: The extension verifies that all participants have loaded the media.
5. **Playback Starts**: The host (or approved participants) triggers synchronized media.
6. **Session Ends**: The host closes the room, or it expires after a grace period.

---

## Room States
* **Waiting**: Room is open, waiting for users or for media selection.
* **Ready**: All participants have loaded the media and are ready to watch.
* **Playing**: Media is currently playing in synchronized fashion across all devices.
* **Paused**: Playback is paused.
* **Buffering**: One or more participants are buffering; playback may be adjusted depending on policy.
* **Reconnecting**: Room is recovering from an outage or server migration.
* **Ended**: Session has closed.

---

## Roles & Permissions

Permissions are strictly role-based:

### Host
* Full administrative access.
* Configure room settings (collaborative mode, join approvals, voice/webcam policies).
* Play, pause, seek, and change playback speed.
* Upload local videos and select OTT synchronization.
* Lock/unlock the room and end the session.
* Promote/demote co-hosts and transfer room ownership.

### Co-host
* Moderate participants (mute, kick, disable cameras).
* Control playback states (if collaborative mode or co-host permissions are enabled).
* Cannot delete the room, revoke the host, or demote the host.

### Participant
* View the shared media.
* Use text chat, send emoji reactions, and participate in polls.
* Use voice and webcam streams (unless disabled by room policy).
* Control playback *only* when Collaborative Mode is enabled and host-granted permissions are active.

### Future Roles
The room architecture is designed to support:
* **Moderator**: Focuses purely on user management and chat moderation without playback controls.
* **Presenter**: Controls playback and annotations while participants are viewers-only.
* **Classroom Student**: Restricted participant in classroom sessions.

---

## Moderation Actions
To keep room sessions organized, hosts and co-hosts can perform the following:
* **Kick participant**: Disconnect a user from the room and invalidate their session.
* **Mute participant**: Disable a user's microphone stream temporarily.
* **Disable participant webcam**: Cut a user's video feed.
* **Remove playback permission**: Revoke collaborative control from a specific participant.
* **Lock room**: Prevent new users from joining the session.
* **Enable join approval**: Require the host to manually approve each join request.

Every moderation action generates an audit event and a system notification to keep participants informed.

---

## Room-Level Recovery
* Restores authentication status silently when a client loses connectivity.
* Automatically updates presence lists and alerts others if a user transitions to a reconnecting state.
