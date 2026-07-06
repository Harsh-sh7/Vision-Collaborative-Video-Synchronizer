# API Specification

This document defines the REST endpoints available on the backend server for room management and onboarding.

---

## 1. REST Endpoints

All REST APIs have the base URL prefix `/api/v1`.

### User Registration (Onboarding)
* **Endpoint**: `POST /auth/register`
* **Request Body**:
  ```json
  {
    "displayName": "Alice",
    "avatarUrl": "https://cdn.example.com/avatar.png"
  }
  ```
* **Response**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "user-uuid-v4",
      "displayName": "Alice"
    }
  }
  ```

---

## 2. Room Management

### Create Room
* **Endpoint**: `POST /rooms`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Body**:
  ```json
  {
    "passcode": "optional-password-string",
    "collaborativeMode": false,
    "allowWebcams": true
  }
  ```
* **Response**:
  ```json
  {
    "roomId": "room-uuid-v4",
    "roomCode": "ABCD-123",
    "inviteUrl": "https://party.example.com/join/ABCD-123"
  }
  ```

### Verify Invite Link
* **Endpoint**: `GET /rooms/verify/:roomCode`
* **Response**:
  ```json
  {
    "valid": true,
    "roomId": "room-uuid-v4",
    "requiresPasscode": false,
    "isLocked": false
  }
  ```
