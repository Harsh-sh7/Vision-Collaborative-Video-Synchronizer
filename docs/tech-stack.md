# Technology Stack

This document defines the selected frameworks, libraries, and protocols used to build the Universal Watch Party platform.

---

## 1. Frontend (Browser Extension)
* **Framework**: React.js with TypeScript for typed components and state management.
* **Styling**: Tailwind CSS (or Vanilla CSS) for interface presentation.
* **Build System**: Vite or Webpack configured to output Manifest V3 bundles.
* **API Clients**:
  * Socket.io-client for real-time WebSocket communication.
  * Axios (or native Fetch API) for standard REST commands.

---

## 2. Backend Server
* **Language**: Node.js with TypeScript.
* **Core Framework**: NestJS (using Fastify adapter) for structured routing, dependency injection, and clean module organization.
* **Realtime Server**: Socket.io configured with a Redis adapter for clustered horizontal scaling.
* **RTC Signaling**: Simple-Peer (or custom WebRTC wrapper) facilitating signaling handshakes.

---

## 3. Database & Cache Layer
* **Primary Database**: PostgreSQL to store user records, room credentials, configuration settings, and analytical statistics.
* **Caching & Presence**: Redis for in-memory session persistence, active socket states, pub/sub communication channels, and fast presence checks.
* **Extension Storage**: `chrome.storage.local` for client configuration and IndexedDB / OPFS for local video chunk caches.

---

## 4. Protocols & Media Routing
* **State Synchronization**: Custom JSON schema over secure WebSockets (`wss://`).
* **RTC Streaming (Voice/Webcam)**: WebRTC encrypted via DTLS and SRTP.
* **NAT Traversal**: Coturn service serving STUN and TURN protocols to bypass symmetric NAT boundaries.
