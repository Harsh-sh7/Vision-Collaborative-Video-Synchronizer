# Backend Infrastructure

This document outlines the design and responsibilities of the Universal Watch Party cloud backend, which facilitates room signaling, user presence monitoring, and WebRTC fallback routing.

---

## 1. Backend Core Services

The backend system is designed as a modular service architecture:

```
                            ┌────────────────┐
                            │ Client Devices │
                            └────────────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │ HTTP (REST) API   │ WebSockets (WSS)  │
                 ▼                   ▼                   ▼
           ┌───────────┐       ┌───────────┐       ┌───────────┐
           │ API       │       │ Room      │       │ STUN/TURN │
           │ Gateway   │       │ Manager   │       │ Service   │
           └───────────┘       └───────────┘       └───────────┘
                 │                   │                   │
                 └─────────┬─────────┘                   │
                           ▼                             ▼
                    ┌─────────────┐               ┌─────────────┐
                    │ PostgreSQL  │               │ Coturn P2P  │
                    │ Database    │               │ Relay       │
                    └─────────────┘               └─────────────┘
```

### API Gateway / REST Service
* **Role**: Handles room provisioning, client authentication, and static media metadata storage.
* **Authentication**: Signs and verifies JSON Web Tokens (JWT) for room requests.

### Room Manager & WebSocket Gateway
* **Role**: Manages socket connections using Socket.io or native WebSockets.
* **Responsibilities**:
  * Broadcasts playback control events (play, pause, seek, authority sync).
  * Tracks live room configurations and permission settings.
  * Dispatches interactive overlay signals (shared cursors, chat text, reactions, active polls).
  * Collects and broadcasts heartbeat packets to maintain live presence tables.

### P2P Signaling & Relay Service (STUN/TURN)
* **Role**: Negotiates direct peer connections (WebRTC Data Channels) for local video chunk swarming and audio/webcam feeds.
* **Fallback**: Runs a TURN server (e.g. using Coturn) to route video/voice packets when symmetric NAT blocks direct P2P connections.

---

## 2. Shared Cache & State Persistence

### PostgreSQL Database
* **Usage**: Stores long-term configurations including user profiles, registered room histories, analytical summaries, and system configuration profiles.

### Redis Cache
* **Usage**: Designed for fast in-memory lookups. Stores temporary room membership lists, active room playback positions, presence heatmaps, and coordinates pub/sub channels when scaling to multiple WebSocket servers.

---

## 3. Scale-Out Architecture
To support high numbers of concurrent rooms, the WebSocket servers are stateless:
* **Redis Adapter**: Connects multiple socket processes, allowing room events to propagate across instances.
* **Load Balancer**: Dynamically directs incoming connections to servers using sticky sessions (required for socket handshake upgrades).
