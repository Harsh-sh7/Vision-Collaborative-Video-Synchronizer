# Adaptive Buffering & Performance System

This document outlines the performance controls, network measurement systems, and bandwidth allocation strategies designed to keep playback smooth and responsive, especially when sharing large local videos.

---

## 1. Dynamic Startup Buffering
The extension implements a dynamic buffer window rather than using a static pre-roll duration. 
* **Calculation**:
  $$\text{Required Initial Buffer} = \frac{\text{Media Bitrate} \times \text{Buffer Window Duration}}{\text{Estimated Download Rate}} \times (1 + \text{Jitter Factor})$$
* **Fast Network Mode**: Small initial buffer window (e.g., 5 seconds of media). Playback starts almost immediately.
* **Slow Network Mode**: Large initial buffer window (e.g., 30+ seconds of media). Playback is held until enough chunks are ready to guarantee uninterrupted viewing.

---

## 2. P2P Download Scheduler
For local videos, the download scheduler manages how media chunks are requested and verified:
1. **Critical Playback Window**: Chunks immediately ahead of the playhead are flagged as priority 1. These are requested aggressively from the host or fast peers.
2. **Sequential Pre-buffering**: Chunks further ahead are requested as priority 2 to fill the standard buffer window.
3. **Chunk Recovery**: Missing or failed chunks are flagged as priority 3 and scheduled for retry.
4. **Swarm Verification**: Completed file swarms verify background checksums (priority 4) to ensure no long-term block rot.

The scheduler automatically throttles peer requests if active WebSocket signaling messages or WebRTC voice packets experience high jitter, protecting interactive communication.

---

## 3. Network Monitoring
The extension runs background throughput profiling:
* **Metrics Tracked**:
  * **Download/Upload Speed**: Moving average of bytes processed.
  * **Latency**: Round-trip time (RTT) for WebSocket sync events.
  * **Packet Loss**: Percentage of dropped WebRTC audio packets or socket timeouts.
  * **Jitter**: Variations in packet arrival intervals.
* **Modes**:
  * **Slow Network Mode**: Triggered when sustained RTT exceeds 300ms or bandwidth drops below $1.5 \times$ media bitrate. It scales down camera feeds, stops non-essential background downloads, and increases buffer windows.
  * **Fast Network Mode**: Triggered when bandwidth is abundant ($> 5 \times$ media bitrate). It requests chunks aggressively, maximizes webcam streams (up to 1080p), and enables pre-verification of future segments.

---

## 4. Bandwidth Allocation Priority
When network limits are reached, traffic is prioritised according to the table below:

| Priority | Traffic Type | Description |
| :--- | :--- | :--- |
| **1 (Highest)** | Playback Synchronization | Critical room control events (play, pause, seek, authority updates). |
| **2** | Voice Chat | Low-latency audio packets (Opus codecs). |
| **3** | Core Media Chunks | Immediate buffer window file chunks. |
| **4** | Webcam Streams | Real-time video feeds (dynamic resolution scaling). |
| **5** | Interactive Overlays | Chat text, emoji reactions, cursor coordinates. |
| **6 (Lowest)** | Background Downloads | Non-immediate video chunks. |
