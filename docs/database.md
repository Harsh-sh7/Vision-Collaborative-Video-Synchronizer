# Database Design & Schemas

This document defines the storage layers and primary schema models used by the PostgreSQL database and Redis session cache.

---

## 1. PostgreSQL Schema Models

```
  ┌───────────────┐          ┌───────────────┐
  │     Users     │1        *│   Room_Users  │
  │ (Credentials) ├─────────>│ (Memberships) │
  └───────────────┘          └───────┬───────┘
                                     │*
                                     │
                                     │1
                             ┌───────▼───────┐
                             │     Rooms     │
                             │ (Config/State)│
                             └───────────────┘
```

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Rooms Table
```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) UNIQUE NOT NULL,
    passcode_hash TEXT, -- Nullable (open rooms)
    host_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    collaborative_mode BOOLEAN DEFAULT FALSE,
    active_engine VARCHAR(20) DEFAULT 'web',
    active_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Room Users (Membership Join Table)
```sql
CREATE TABLE room_users (
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(15) DEFAULT 'participant', -- 'host', 'co-host', 'participant'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);
```

---

## 2. Redis Cache Keys & Structures

Redis is used for fast lookup of transient room data and pub/sub signaling.

### Session Keys
* **Key Format**: `session:user:{userId}`
* **Type**: Hash
* **Fields**: `roomId`, `role`, `socketId`, `lastHeartbeat`.

### Room Playback States
* **Key Format**: `room:playback:{roomId}`
* **Type**: Hash
* **Fields**: `state` (playing/paused), `currentTime`, `playbackRate`, `updatedAt` (timestamp).

### Presence Maps
* **Key Format**: `room:presence:{roomId}`
* **Type**: Set containing active `userId` values in the room.
