# WebSocket Protocol & Event Schema

This document details the bidirectional message payload formats used over the WebSocket channel (`ws://` / `wss://`) to keep room states synchronized.

---

## 1. Core Connection Events

### `ROOM_JOIN`
* **Direction**: Client -> Server
* **Payload**:
  ```json
  {
    "roomId": "room-12345",
    "token": "jwt-auth-token-string",
    "displayName": "Alice",
    "avatar": "https://cdn.example.com/avatar1.png"
  }
  ```

### `ROOM_JOINED`
* **Direction**: Server -> Client (acknowledgment)
* **Payload**:
  ```json
  {
    "userId": "user-abc",
    "roomId": "room-12345",
    "role": "host",
    "activeEngine": "web",
    "state": {
      "playbackState": "PAUSED",
      "currentTime": 0.0,
      "playbackRate": 1.0
    },
    "participants": [
      { "userId": "user-abc", "displayName": "Alice", "presence": "Ready" }
    ]
  }
  ```

---

## 2. Playback Events

### `MEDIA_STATE_CHANGE`
* **Direction**: Client <-> Server
* **Payload**:
  ```json
  {
    "requestId": "uuid-v4-string",
    "roomId": "room-12345",
    "action": "PLAY" | "PAUSE" | "SEEK",
    "currentTime": 45.2,
    "playbackRate": 1.0,
    "timestamp": 178330992388
  }
  ```

### `MEDIA_SYNC_CORRECTION`
* **Direction**: Server -> Client (issued if a client drifts significantly)
* **Payload**:
  ```json
  {
    "roomId": "room-12345",
    "currentTime": 46.5,
    "playbackRate": 1.0,
    "serverTime": 178330992399
  }
  ```

---

## 3. Interactive Collaboration Events

### `CURSOR_UPDATE`
* **Direction**: Client -> Server (throttled) / Server -> Clients (batched)
* **Payload**:
  ```json
  {
    "x": 0.542, 
    "y": 0.231,
    "laserActive": false
  }
  ```
  *(Note: Coordinates are normalized between `0.0` and `1.0` representing screen offset percentages inside the player boundaries).*

### `CHAT_MESSAGE`
* **Direction**: Client <-> Server
* **Payload**:
  ```json
  {
    "messageId": "msg-9923",
    "text": "Check out that scene!",
    "timestamp": 178330992450
  }
  ```

### `EMOJI_REACTION`
* **Direction**: Client <-> Server
* **Payload**:
  ```json
  {
    "reactionType": "FIRE" | "HEART" | "LAUGH"
  }
  ```

---

## 4. Presence & Recovery Events

### `HEARTBEAT`
* **Direction**: Client -> Server (sent every 5s)
* **Payload**:
  ```json
  {
    "roomId": "room-12345",
    "currentTime": 45.2,
    "presence": "Watching"
  }
  ```

### `USER_PRESENCE_CHANGE`
* **Direction**: Server -> Clients
* **Payload**:
  ```json
  {
    "userId": "user-abc",
    "presence": "Buffering" | "Reconnecting" | "Away" | "Ready"
  }
  ```
