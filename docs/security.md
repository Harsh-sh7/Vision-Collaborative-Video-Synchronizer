# Security & Privacy Guidelines

This document outlines the security controls, authentication mechanisms, DRM interfaces, and privacy standards of the Universal Watch Party platform.

---

## 1. Authentication & Authorization Policies

### User Authentication
* Every user joining a room must hold a cryptographically signed token (JWT) generated during room verification.
* Tokens have short expiration durations to prevent playback hijacking.
* In password-protected rooms, the socket handshake requires a verified room key signature.

### Command Authorization
Every client command received by the server is checked against the user's role and room policies:
* **Host Control**: Only users marked as `Host` or `Co-host` can send command updates (unless collaborative mode is active).
* **Scope Bounds**: Clients cannot send state updates targeting different room IDs. The socket connection is bound to a single room scope at initialization.
* **Malicious Commands**: Commands containing invalid formats, extreme timestamps ($< 0.0$ or $> \text{video length}$), or unauthorized rate-change requests are discarded, and the connection is flagged.

---

## 2. Digital Rights Management (DRM) & Intellectual Property Boundaries

> [!WARNING]
> The Universal Watch Party platform is designed to synchronize playback of legitimate media access. It **never** bypasses DRM controls, records content, or overrides licensing policies.

* **No Bypasses**: The extension does not decrypt, capture, or stream video frames from licensed providers (e.g., Netflix, Disney+).
* **Local Player Rendering**: Video frames are processed and displayed entirely inside the client browser. No video data travels through the backend server.
* **Access Checks**: The extension expects each participant to authenticate independently with target services. If a participant lacks a subscription, they cannot access the shared playback URL.

---

## 3. Communication Security & Encryption
* **WebSocket Streams**: All signaling and room messages are routed through encrypted Secure WebSockets (`wss://`).
* **WebRTC Streams**: Voice and video connections are encrypted end-to-end using DTLS (Datagram Transport Layer Security) and SRTP (Secure Real-time Transport Protocol).
* **Device Permissions**: The extension requests microphone and camera access *only* when the user explicitly triggers voice/video features. These permissions are managed by the browser and can be revoked at any time.

---

## 4. Audit Logging & Diagnostics
For error diagnostics and tracking, room administrative actions trigger secure logs:
* **Events Logged**: Play/Pause actions, room locks, participant demotions/promotions, connection drop counts, and P2P download failures.
* **No PII**: Log payloads are scrubbed. No email addresses, physical IP addresses (outside WebRTC ICE routing contexts), or video content details are stored permanently.
