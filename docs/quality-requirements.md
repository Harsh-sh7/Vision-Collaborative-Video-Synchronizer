# Non-Functional Quality Requirements

This document outlines the performance limits, reliability requirements, scalability targets, and accessibility requirements for the Universal Watch Party platform.

---

## 1. Performance Requirements

### Startup Performance
* **Popup Load Time**: The extension popup panel must load and render within **150ms** of user click.
* **Room Creation Latency**: Rest API room provisioning and token generation must take less than **300ms** under normal server load.
* **Join Negotiation**: Handshake, WebSocket initialization, and room join confirmation must complete within **500ms** of the socket connection opening.

### Playback & Coordination Performance
* **Sync Frequency**: Playback position evaluations must run every **2.5 seconds** on each client.
* **Synchronization Accuracy**: Playback alignment across all participants must maintain a delta under **100ms** on high-quality connections ($< 100\text{ms}$ RTT), and under **250ms** on medium-quality connections.
* **Command Propagation**: Play/Pause/Seek notifications must propagate from the sender to all participants within **200ms** plus network transport time.

---

## 2. Reliability Requirements
* **Automatic Reconnection**: In the event of a drop, the client must initiate a reconnection sequence within **1 second** and re-authenticate without user action.
* **Session Persistence**: Stored session context must persist across browser crashes or reloads, allowing users to reconnect to the exact room position within **3 seconds** of relaunch.
* **Data Loss Recovery**: P2P chunk transfers must resume from the last completed chunk index after any disconnect, avoiding duplicate downloads.

---

## 3. Scalability Targets
* **Server Footprint**: A single backend WebSocket process (Node.js/Socket.io) must support up to **5,000 concurrent room connections** utilizing a Redis pub/sub layer.
* **P2P Swarm Limits**: The Local Video Engine must support P2P mesh sizes up to **50 concurrent viewers** per room, with adaptive chunk routing dynamically selecting the fastest seeders.

---

## 4. Accessibility Requirements
* **WCAG 2.1 Compliance**: The extension popup and in-browser overlays must align with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.
* **Keyboard Navigation**: All configuration fields, buttons, and settings panels must be navigable using standard tab sequences.
* **Screen Reader Friendly**: Overlay panels, indicators, and chat outputs must include appropriate ARIA attributes.
* **Visible Focus**: Clear high-contrast borders must highlight the active interactive item.

---

## 5. Compatibility Requirements
* **Browser Targets**: Full operational compatibility with Chromium-based browsers:
  * Google Chrome (v100+)
  * Microsoft Edge (v100+)
  * Brave Browser (v1.0+)
  * Opera (v80+)
  * Arc Browser
* **Extension Manifest**: Strict conformance to Manifest V3 APIs. No Manifest V2 deprecated structures are allowed.
