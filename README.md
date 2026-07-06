# Vision

Vision is a modern, premium, real-time collaborative video synchronizer and peer-to-peer (P2P) multimedia sharing platform built as a Chrome Extension. It allows parties to watch videos in perfect synchronization while sharing webcams, audio, and interactive Figma-style laser pointers.

---

## 🚀 Key Features

* **Perfect Playback Synchronization**: Low-latency video playback tracking for both HTML5 videos and YouTube iframe embeds.
* **WebRTC Voice & Video Sharing**: Free-floating resizable and draggable P2P webcam cards to talk and view party participants live.
* **Figma-Style Laser Cursors**: Live color-coded pointers rendering participant cursors on top of the player canvas.
* **Host vs. Collaborative Controls**: Lock/Unlock control permissions dynamically with visual status dot indicators (Blue for active/collab, Red for host-locked).
* **Glassmorphic UI**: High-contrast, premium dark-themed media dashboard.

---

## 🛠️ Tech Stack

* **Frontend (Extension)**: TypeScript, HTML5, Vanilla CSS, Vite, Chrome Extensions API.
* **Backend (Signaling)**: NestJS, Socket.io (WebSockets), Node.js.
* **Communication**: WebRTC (P2P Data, Audio, and Video channels).

---

## 💻 Getting Started

### 1. Run the Backend Server
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the NestJS server in watch mode:
   ```bash
   npm run start:dev
   ```
   The backend will run on `http://localhost:3000`.

### 2. Run the Chrome Extension Client
1. Navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev compiler:
   ```bash
   npm run dev
   ```
   This compiles build files inside the `client/dist` directory.

### 3. Load the Extension in Google Chrome
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** (top-left button).
4. Select the `client/dist/` directory from your filesystem.
5. Launch the extension popup, create or join a room, and navigate to the media player screen!
