# Master Architecture

> **Project Version**: 1.0  
> **Status**: Architecture Design  
> **Author**: Product Specification  
> **Last Updated**: July 2026  

---

# Universal Watch Party Platform

## Executive Summary

Universal Watch Party is a next-generation browser extension that enables users to watch videos together in real time without relying on traditional, bandwidth-heavy screen sharing.

Unlike zoom, Zoom, or Discord solutions that continuously stream pixels from one device to another, Universal Watch Party synchronizes playback states across all participants. By intelligently detecting the source of media, each device streams directly from the original content provider or from local P2P nodes while remaining synchronized.

The platform is designed around the core philosophy:

> **Whenever possible, synchronize state instead of streaming pixels.**

The result is significantly lower bandwidth consumption, reduced CPU load, higher video quality, and a low-latency, natural watch-together experience.

---

## Core Philosophy & Principles

### Principle 1: State Synchronization over Pixel Streaming
Instead of encoding, uploading, downloading, and decoding a video stream from one user, all users open the same content, and only playback state data is sent.

### Principle 2: Specialized Playback Engines
Different media require distinct synchronization strategies. The architecture uses pluggable engines (Web Sync, OTT Sync, and Local Video) that expose a unified synchronization interface while handling specific players internally.

### Principle 3: Separation of Media and Collaboration
Interactive tools (chat, voice, webcam, reactions, cursors) are decoupled from the media engines. Adding a new playback engine does not require rewriting the social or room management layers.

### Principle 4: Resilient Recovery
The platform automatically recovers from temporary drops, page refreshes, and device changes without forcing the host to recreate the room.

---

## High-Level System Architecture

```
                     Universal Watch Party
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
  Browser Extension      Cloud Backend        P2P Network
           │                   │                   │
           ▼                   ▼                   ▼
                 Universal Room System
                           │
                           ▼
               Playback Engine Manager
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
  Web Sync Engine    OTT Sync Engine    Local Video Engine
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                  Interactive Layer
      (Chat, Voice, Webcam, Cursors, Reactions, Polls)
```

The **Playback Engine Manager** acts as the routing controller, matching the current browser tab to the correct Playback Engine. The active engine handles player-specific actions (e.g., hooks into Netflix DOM vs. HTML5 `<video>` selectors) while the **Universal Room System** maintains authorization, permissions, presence, and coordinates signals across clients.

---

## Documentation Suite Directory

For detailed specifications of each subsystem, refer to the modular documentation files below:

### 📖 General Documentation
* **[Vision & Design Goals](file:///Users/Harsh/Desktop/Vision/docs/vision.md)**: Product scope, targets, and future directions.
* **[Technology Stack](file:///Users/Harsh/Desktop/Vision/docs/tech-stack.md)**: Frameworks, server runtimes, databases, and network protocols.
* **[Product Roadmap](file:///Users/Harsh/Desktop/Vision/docs/roadmap.md)**: Feature progression phases (MVP through Phase 4).

### ⚙️ Component Specifications
* **[Universal Room System](file:///Users/Harsh/Desktop/Vision/docs/room-system.md)**: Lifecycle states, roles, and administrative moderation actions.
* **[Web Playback Engine](file:///Users/Harsh/Desktop/Vision/docs/web-sync-engine.md)**: URL-based synchronizers for public web players.
* **[OTT Playback Engine](file:///Users/Harsh/Desktop/Vision/docs/ott-engine.md)**: Secure adapters for subscription streaming platforms.
* **[Local Video Engine](file:///Users/Harsh/Desktop/Vision/docs/local-video-engine.md)**: Hashed chunk distribution, swarming, and caching.
* **[Communication & Collaboration Layer](file:///Users/Harsh/Desktop/Vision/docs/communication-layer.md)**: Webcam/voice streams, cursors, chat, reactions, and polls.
* **[Synchronization & Playback Control](file:///Users/Harsh/Desktop/Vision/docs/synchronization.md)**: Authoritative states, drift thresholds, and conflict resolution.
* **[Adaptive Buffering & Performance](file:///Users/Harsh/Desktop/Vision/docs/adaptive-buffer.md)**: Dynamic pre-roll calculations and bandwidth priority.
* **[Reliability & Resilience](file:///Users/Harsh/Desktop/Vision/docs/reliability.md)**: Connection recoverability, heartbeat schemes, and edge cases.

### 🔌 Developer & Deployment Details
* **[Extension Architecture](file:///Users/Harsh/Desktop/Vision/docs/extension.md)**: Service worker, content scripts, message passing, and popups.
* **[Backend Infrastructure](file:///Users/Harsh/Desktop/Vision/docs/backend.md)**: Gateway services, clustered socket handlers, and caching.
* **[Database Design](file:///Users/Harsh/Desktop/Vision/docs/database.md)**: Schema layouts for PostgreSQL and Redis caches.
* **[WebSocket Protocol Specification](file:///Users/Harsh/Desktop/Vision/docs/websocket-protocol.md)**: JSON event structures and messaging payloads.
* **[REST API Specifications](file:///Users/Harsh/Desktop/Vision/docs/api-spec.md)**: Endpoints for user authentication and room setup.
* **[Deployment & Coturn Settings](file:///Users/Harsh/Desktop/Vision/docs/deployment.md)**: Dockerfiles, Kubernetes orchestration, and TURN vm configs.
* **[Security & Privacy Guidelines](file:///Users/Harsh/Desktop/Vision/docs/security.md)**: Access authorization, DRM boundaries, and audit logging.

### 🧭 User Experiences & Verification
* **[Complete User Flows](file:///Users/Harsh/Desktop/Vision/docs/user-flows.md)**: Lifecycle walkthroughs (Onboarding, Room Creation, Playbacks).
* **[Quality Requirements](file:///Users/Harsh/Desktop/Vision/docs/quality-requirements.md)**: Performance benchmarks, network tolerances, and WCAG compliance.
