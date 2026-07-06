# Documentation Suite

Welcome to the design documentation for the Universal Watch Party platform. The files below define the requirements, architecture, and user flows:

---

## 📖 Core Documents

* **[MASTER_ARCHITECTURE.md](file:///Users/Harsh/Desktop/Vision/MASTER_ARCHITECTURE.md)**: The entry point outlining the high-level architecture, design decisions, and listing the sub-document index.
* **[Vision & Design Goals](file:///Users/Harsh/Desktop/Vision/docs/vision.md)**: Long-term targets, product boundaries, and visual philosophies.
* **[Technology Stack](file:///Users/Harsh/Desktop/Vision/docs/tech-stack.md)**: Frameworks, library definitions, and protocols chosen for implementation.
* **[Product Roadmap](file:///Users/Harsh/Desktop/Vision/docs/roadmap.md)**: The phased feature releases (MVP through Phase 4).

---

## ⚙️ Subsystem Specifications

* **[Universal Room System](file:///Users/Harsh/Desktop/Vision/docs/room-system.md)**: Connection lifetime, roles, room state rules, and moderation.
* **[Web Playback Engine](file:///Users/Harsh/Desktop/Vision/docs/web-sync-engine.md)**: Video synchronizing on standard URLs/HTML5.
* **[OTT Playback Engine](file:///Users/Harsh/Desktop/Vision/docs/ott-engine.md)**: Integration adapters for subscription OTT services.
* **[Local Video Engine](file:///Users/Harsh/Desktop/Vision/docs/local-video-engine.md)**: Progressive P2P chunking, hashes, and download tracking.
* **[Communication & Collaboration](file:///Users/Harsh/Desktop/Vision/docs/communication-layer.md)**: RTC webcam, voice engines, and screen overlays.
* **[Synchronization & Control](file:///Users/Harsh/Desktop/Vision/docs/synchronization.md)**: Authority states, conflict resolution, and drift correction.
* **[Adaptive Buffer System](file:///Users/Harsh/Desktop/Vision/docs/adaptive-buffer.md)**: Bandwidth priority limits and smart startup buffers.
* **[Reliability & Resilience](file:///Users/Harsh/Desktop/Vision/docs/reliability.md)**: Heartbeats, persistent cache records, and edge cases.

---

## 🔌 Technical Specifications

* **[Extension Architecture](file:///Users/Harsh/Desktop/Vision/docs/extension.md)**: Background worker context, scripts, and popup overlays.
* **[Backend Infrastructure](file:///Users/Harsh/Desktop/Vision/docs/backend.md)**: API layout, cluster configurations, databases, and caches.
* **[Database Schemas](file:///Users/Harsh/Desktop/Vision/docs/database.md)**: PostgreSQL schemas, tables, and Redis key layouts.
* **[WebSocket Protocols](file:///Users/Harsh/Desktop/Vision/docs/websocket-protocol.md)**: Full JSON schemas and payload definitions for socket events.
* **[REST API Specifications](file:///Users/Harsh/Desktop/Vision/docs/api-spec.md)**: Web endpoints for onboarding and room setups.
* **[Deployment & Containers](file:///Users/Harsh/Desktop/Vision/docs/deployment.md)**: Dockerfiles, Kubernetes options, and TURN settings.
* **[Security & Privacy](file:///Users/Harsh/Desktop/Vision/docs/security.md)**: DRM limits, JWT auth gates, and encryption definitions.

---

## 🧭 Flows & Metrics

* **[User Journey Flows](file:///Users/Harsh/Desktop/Vision/docs/user-flows.md)**: Interactive onboarding and playback lifecycle sequences.
* **[Quality Requirements](file:///Users/Harsh/Desktop/Vision/docs/quality-requirements.md)**: Performance goals, tolerances, and accessibility markers.
