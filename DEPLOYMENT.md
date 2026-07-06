# Deployment & Publishing Guide

This guide describes how to configure, build, and deploy the **Vision** collaborative video synchronizer and WebRTC stream sharing platform for production.

---

## 1. Configure Production Server URLs

Before building the Chrome extension for distribution, update the server URL references from `localhost:3000` to your production backend server address.

### Files to Update:
1. **[App.tsx](file:///Users/Harsh/Desktop/Vision/client/src/App.tsx#L23)**
   ```typescript
   // Replace with your production server domain (e.g. 'https://vision-backend.onrender.com')
   const SERVER_URL = 'https://your-production-server.com';
   ```
2. **[serviceWorker.ts](file:///Users/Harsh/Desktop/Vision/client/src/background/serviceWorker.ts#L16)**
   ```typescript
   // Replace with your production server domain (e.g. 'https://vision-backend.onrender.com')
   const SERVER_URL = 'https://your-production-server.com';
   ```
3. **[player.ts](file:///Users/Harsh/Desktop/Vision/client/src/player/player.ts#L284)**
   ```typescript
   // Ensure the YouTube embed helper URL uses your production domain
   const targetSrc = `https://your-production-server.com/youtube-embed?v=${videoId}`;
   ```
4. **[player.ts Origin Check](file:///Users/Harsh/Desktop/Vision/client/src/player/player.ts#L533)**
   ```typescript
   // Add your production domain to the message origin whitelist
   if (!event.origin.includes('localhost:3000') && !event.origin.includes('your-production-server.com')) return;
   ```

---

## 2. Backend Server Deployment (NestJS)

The NestJS server handles room synchronization, WebRTC signaling, and socket connections. It can be deployed to any Node.js hosting platform.

### Option A: Railway (Recommended)
1. Sign up/Log in to [Railway.app](https://railway.app/).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository.
4. Set the **Root Directory** to `server`.
5. Railway will automatically detect the Node environment and run `npm run build` followed by `npm run start:prod`.
6. Go to variables and expose `PORT` if needed (Railway will allocate one automatically).
7. Under **Settings**, generate a domain link (e.g. `https://xxx.up.railway.app`). Use this URL as your production server URL.

### Option B: Render.com
1. Sign up/Log in to [Render](https://render.com/).
2. Create a new **Web Service**.
3. Link your GitHub repository.
4. Set the **Root Directory** to `server`.
5. Configure the following build settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
6. Click **Deploy**. Use the provided service URL for your extension.

---

## 3. Chrome Extension Packaging & Publishing

Once the server is deployed and the client-side URLs are updated to point to production:

1. **Compile & Build the Client**:
   Navigate to the `client` directory and compile the production build:
   ```bash
   cd client
   npm install
   npm run build
   ```
   This generates the production bundle in the `client/dist/` directory.

2. **Package the Zip File**:
   Compress the contents of the `client/dist/` directory (not the directory itself, but the files inside it) into a standard `.zip` file (e.g., `vision-extension.zip`).

3. **Publish to Chrome Web Store**:
   - Go to the [Chrome Developer Console](https://chrome.google.com/webstore/devconsole).
   - Pay the developer signup fee if you haven't already.
   - Click **New Item** and upload `vision-extension.zip`.
   - Complete the store listing details (icons, descriptions, screenshots, privacy policy description).
   - Under **Permissions Search**, request reviews for permissions:
     - `activeTab` (allows checking current URL to match room stream URLs).
     - `scripting` / `storage` (allows injecting pointer cursors and saving room tokens).
   - Submit the extension for review.

---

## 4. Push to GitHub

To publish your source code on GitHub:

1. Create a new repository on [GitHub](https://github.com/).
2. Run the following commands in the workspace root folder:
   ```bash
   # Add your GitHub remote link
   git remote add origin https://github.com/your-username/vision.git
   
   # Push files to the main branch
   git branch -M main
   git push -u origin main
   ```
