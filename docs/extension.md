# Browser Extension Architecture & UX

This document defines the client-side extension architecture, Manifest V3 components, permission structures, and configuration layouts.

---

## 1. Extension Architecture Components

The Universal Watch Party client is a Manifest V3 browser extension split into four execution contexts:

```
┌────────────────────────────────────────────────────────┐
│                   Browser Extension                    │
└────────────────────────────────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
 Content Script      Service Worker         Popup UI
 (Injected in Tab)    (Background)       (Control Panel)
       │                   │                   │
       └───────── Message Passing ─────────────┘
```

### Background Service Worker
* **Role**: The centralized controller. It handles lifetime room state, manages the Socket.io connection to the backend, keeps track of local storage cache structures, and coordinates WebRTC signaling.
* **Resilience**: It remains stateless where possible, allowing it to shut down and wake up based on browser events without losing the room session (which is persisted in storage).

### Content Scripts
* **Role**: Injected into tabs to detect, hook, and control target video elements.
* **Execution**: Custom wrapper classes (YouTube adapter, HTML5 adapter, OTT hooks) communicate player events (play, pause, seek) up to the background worker.

### Popup & Overlay UI
* **Popup UI**: Action panel opened by clicking the extension icon. Used for room creation, copying invites, configuring mic/camera devices, and viewing the participant list.
* **Overlay UI**: Renders chat windows, cursor elements, laser pointers, and floating reactions directly over the media viewport within the active tab.

---

## 2. Manifest V3 Design & Host Permissions

The extension adheres to Manifest V3 security rules:
* **Background Scripts**: Specified as `service_worker` scripts. No persistent background pages are used.
* **Declarative Net Request**: (If needed) used to safely redirect or observe headers for OTT players without executing arbitrary remote code.
* **Permissions Requests**:
  * `activeTab`: Granted when the user clicks the extension on a target page.
  * `storage`: Persistent caching of settings and room session parameters.
  * `scripting`: Dynamic injection of player wrappers.
  * `tabCapture` / `media`: Access to webcam/microphone streams (after explicit user permission).
* **Host Permissions**: Users are prompted for permission on target OTT services or video platforms, keeping permission requests narrow.

---

## 3. Settings & User Experience

### General Settings
* **Theme**: Choose between Light, Dark, or System Sync mode.
* **Startup Behavior**: Optionally rejoin previous session on startup, or auto-launch the controller panel.

### Device Controls
* Dropdowns to configure audio inputs, outputs, and camera resolutions.
* Mirror local camera previews or toggle noise suppression.

### Hotkeys & Shortcuts
Users can customize quick key bindings:
* Toggle microphone mute / camera.
* Push-to-Talk button.
* Toggle chat drawer visibility.
* Laser pointer hold-key.

### Accessibility (WCAG Guidelines)
* Full keyboard tab navigation for popup panels.
* Explicit ARIA roles on interactive overlay components.
* Visible focus indicators.
* Contrast profiles designed to meet WCAG standards.
* Reduced motion settings to disable flying reaction animations.
