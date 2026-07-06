# Communication & Collaboration Layer

This document describes the systems that handle real-time social interaction between room participants: the integrated voice/webcam streaming system and the interactive overlays (cursors, chat, reactions, and polls). All of these features function independently of the active playback engine.

---

## 1. Voice Chat & Webcam System

The voice and webcam system runs in the background to provide social connection without needing external conferencing tools.

### Capabilities & Options
* **Voice Chat Modes**: Supporting Push-to-Talk (with custom hotkeys) and Always-On (voice activity detection).
* **Audio Enhancements**: Standard audio signal processing including:
  * Acoustic Echo Cancellation (AEC)
  * Noise Suppression (NS)
  * Automatic Gain Control (AGC)
* **Webcam Layouts**: Supports flexible overlay styles including *Film Strip*, *Grid View*, *Speaker Focus*, and *Host Focus*.
* **Host Policies**: Hosts can globally mute participants, disable voice/video room-wide, or lock stream settings.

### Media Engines
* **Audio Engine**: Responsible for low-latency microphone capture, Opus encoding, network transmission, packet loss concealment (PLC), and mixing multiple user streams.
* **Video Engine**: Compresses camera feeds, handles resolution switching (down to 180p or up to 720p/1080p), and dynamically adjusts target frame rates.

### Adaptive Quality Optimization
The system continuously monitors device performance (CPU usage, browser thread lag) and network metrics (latency, packet loss, upload/download limits). It dynamically scales media quality to prevent playback synchronization drift:
$$\text{Quality Progression}: \text{1080p} \rightarrow \text{720p} \rightarrow \text{480p} \rightarrow \text{360p} \rightarrow \text{Audio Only}$$
Voice streams are always prioritized over video streams.

---

## 2. Interactive Collaboration Overlays

These tools allow real-time engagement over the shared viewing area.

### Shared Cursors & Laser Pointers
* **Shared Cursor**: Renders each participant's mouse position in real time within the video viewport.
  * Unique color codes and text labels showing participant names.
  * Motion smoothing (interpolation) to minimize jitter.
  * Automatically fades out after short inactivity.
* **Laser Pointer**: Active while holding down a designated hotkey.
  * Displays as an animated pulsing beacon.
  * Utilizes a highly visible color distinct from standard cursors.

### Text Chat System
Every room contains a text chat panel with the following:
* **Rich Text**: Text messages, mentions, and emoji support.
* **System Notifications**: Automated log events showing player states (*"Host paused playback"*, *"User joined room"*, *"Drift correction applied"*).
* **Control Actions**: Copying messages, deleting self-sent messages, and auto-scrolling options.

### Emoji Reactions
* Provides floating overlay animations (e.g., ❤️, 👍, 😂, 🔥) over the media player.
* Elements disappear automatically.
* Rate-limited to prevent visual spam.

### Live Polls
Hosts and co-hosts can create quick room polls:
* Single or multiple-choice formats.
* Custom features: Anonymous voting, timed polls, and immediate result summaries.
* Common use cases include choosing the next media source, taking breaks, or skipping intros.

---

## 3. Presence System
The presence tracker maintains connection states for all participants:
* **States**: `Online`, `Ready`, `Watching`, `Loading`, `Buffering`, `Away`, `Reconnecting`, `Disconnected`.
* **Startup Checks**: Displays ready status indicators like *Still Loading*, *Waiting for Login*, or *Waiting for Download* (Local Engine) before playback begins.
* **Activity Indicators**: Small status cards summarizing network quality, audio activity, camera state, and local download percentage.
