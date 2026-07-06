# Product Roadmap

This document outlines the planned release phases for the Universal Watch Party platform.

---

## Phase 1: MVP (Web Sync Engine)
* **Goal**: Establish core synchronization and basic room mechanics.
* **Scope**:
  * Chrome Extension supporting Manifest V3.
  * Node.js/Socket.io backend on a single instance.
  * Web Sync Engine targeting YouTube and generic HTML5 `<video>` tags.
  * Text Chat and Shared Cursors.

---

## Phase 2: Collaboration & Media Sharing (Local Video Engine)
* **Goal**: Expand social features and local file distribution.
* **Scope**:
  * Integrated WebRTC Audio/Video conferencing (Voice and Webcams).
  * Local Video Engine with progressive P2P file chunk distribution.
  * Local cache verification (SHA-256) and cache UI options.
  * Emoji reactions and real-time Room Polls.

---

## Phase 3: Commercial Streaming (OTT Sync Engine)
* **Goal**: Support subscription OTT streaming platforms.
* **Scope**:
  * Custom DOM injection scripts for Netflix, Prime Video, and Disney+.
  * Secure auth verification checks and "waiting room" states.
  * Automatic session recovery after tab refreshes.

---

## Phase 4: Scaling & Expansion
* **Goal**: Horizontal scaling and native ecosystem support.
* **Scope**:
  * Clustered WebSockets with Redis Pub/Sub coordination.
  * Coturn STUN/TURN server deployment on Kubernetes.
  * Extension support for Edge, Firefox, and Safari.
  * Mobile pairing support (control playback from phone).
