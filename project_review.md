# RoomVault / NodeVault — Project Review & Backend Walkthrough

---

## What Is This Project?

**RoomVault** (internally also called **NodeVault**) is a **collaborative cloud storage pooling application**. The concept:

1. Users authenticate via **Google OAuth**.
2. They create or join password-protected **Rooms** (like Discord servers).
3. Each room member can **connect their Google Drive** and **contribute storage quota** from their personal Drive into the room's shared pool.
4. The room then has a **virtual file system** (folders + files) that any member can browse, upload to, organize, and delete from — all backed by the pooled Google Drive storage.

Think of it as: *"Discord meets Google Drive" — a shared storage room where everyone chips in their Drive space.*

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | **Python + FastAPI** (REST API, async) |
| Database | **MongoDB Atlas** (via `pymongo`) |
| Auth | **Google OAuth 2.0** + self-issued **JWT** tokens |
| Drive Integration | **Google Drive API v3** (via `httpx`) |
| Frontend | **React 19** + **Vite 8** (SPA) |
| Frontend Auth | `@react-oauth/google` |
| UI Framework | Vanilla CSS (Discord-inspired dark theme) |
| Icons | `lucide-react` |

---

## Backend Bugs & Issues

### 🔴 Critical

#### 1. SHA-256 Password Hashing — No Salt
**File:** [main.py#L107-108](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L107-L108)
```python
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()
```
Plain SHA-256 without salt. Identical passwords produce identical hashes — trivially rainbow-table attackable. For a college DA this is fine, but in production you'd use `bcrypt` or `argon2`.

#### 2. CORS Allows All Origins
**File:** [main.py#L55](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L55)
```python
allow_origins=["http://localhost:5173", ..., "*"],
```
The `"*"` wildcard makes every other entry pointless. With `allow_credentials=True`, this is a security misconfiguration. Browsers will reject credentialed requests to `"*"` origins anyway, so this is also functionally broken for cross-origin cookie/auth scenarios.

#### 3. Hardcoded `used_storage_gb` — Never Computed
**File:** [main.py#L640](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L640)
```python
used_storage_gb = 4.2
```
This is always returned as `4.2 GB` regardless of actual file sizes in the room. The room detail endpoint never sums `size_bytes` from `files_collection`. The storage progress bar in the UI is a lie.

#### 4. `delete_file` Has No Authorization Check
**File:** [main.py#L732-739](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L732-L739)
```python
@app.delete("/api/files/{file_id}")
def delete_file(file_id: str, user: dict = Depends(get_current_user_doc)):
    try:
        files_collection.delete_one({"_id": ObjectId(file_id)})
    except Exception:
        files_collection.delete_one({"_id": file_id})
    return {"message": "File deleted successfully"}
```
Any authenticated user can delete **any file in any room** they aren't even a member of. No check that the user belongs to the room, or owns the file.

#### 5. `move_file` Has No Room Membership Check
**File:** [main.py#L698-710](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L698-L710)
Same issue — any authenticated user can move any file across any room.

#### 6. Backend Runs on Bare `None` Collections If MongoDB Fails
**File:** [main.py#L42-48](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L42-L48)
If MongoDB connection fails, all collections are set to `None`. Only `get_current_user_doc` and `google_login` check for `None` — every other endpoint will crash with `AttributeError: 'NoneType' object has no attribute 'find_one'` at runtime.

### 🟡 Medium

#### 7. Demo/Placeholder Data in Production Endpoint
**File:** [main.py#L631-638](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L631-L638)
When a room has no files, the API returns hardcoded demo files (`android_studio`, `Project Kavach Proposal.pdf`, etc.) with fake IDs like `"demo_1"`. These "demo" files can't be moved or deleted (fake IDs won't match any MongoDB document). This creates confusing ghost entries.

#### 8. `5 * (1024 ** 4)` = 5 PB, Not 5 TB
**File:** [main.py#L384](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L384)
```python
total_bytes = 5 * (1024 ** 4)  # Comment says 5 TB
```
`1024 ** 4` = 1 TiB in *bytes*? No — `1024**4 = 2^40` bytes = 1 TiB. So `5 * (1024**4) = 5 TiB`. The comment says "5 TB" but uses TiB. This is technically close enough but the *intent* is ambiguous. More critically, `1024**3 = 1 GiB`, so `5 * 1024**4 = 5120 GiB ≈ 5 TB`. Actually this one is correct — `1024^4` bytes = 1 TiB ≈ 1.1 TB. So `5 * 1024^4 ≈ 5.5 TB`, not 5 TB. Minor inaccuracy in the comment.

#### 9. `upload_file` Doesn't Upload Actual File Content
**File:** [main.py#L713-729](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L713-L729)
The "upload" endpoint only creates a metadata record in MongoDB. It never receives file bytes, never writes to Google Drive. It's purely a metadata stub. The frontend also only sends JSON metadata, not actual file content.

#### 10. Room ID Collision Loop Could Theoretically Hang
**File:** [main.py#L448-451](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L448-L451)
```python
while True:
    room_id = generate_room_id()
    if not rooms_collection.find_one({"room_id": room_id}):
        break
```
With 6 alphanumeric chars (36^6 ≈ 2.2 billion combos) this is extremely unlikely to loop forever, but there's no safety limit. Harmless in practice.

#### 11. Naive `datetime.now()` Mixed With `timezone.utc`
**File:** [main.py#L689](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L689) vs [main.py#L692](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L692)
```python
"date_modified": datetime.now().strftime("%b %d, %Y"),    # local tz
"created_at": datetime.now(timezone.utc).isoformat()       # UTC
```
`date_modified` uses local time, `created_at` uses UTC. Inconsistent.

### 🟢 Minor / Style

#### 12. JWT Secret Default Is a Weak Hardcoded String
**File:** [main.py#L23](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L23)
```python
JWT_SECRET = os.getenv("JWT_SECRET", "nodevault_secret_key_change_in_prod")
```
If `.env` is missing `JWT_SECRET`, the fallback is a known string in your source code. Anyone can forge tokens.

#### 13. Google Drive 403 Fallback Stores `access_token` as `refresh_token`
**File:** [main.py#L355](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L355)
```python
"drive_refresh_token": access_token
```
Access tokens expire in ~1 hour. Storing one as a "refresh token" means the saved token becomes useless quickly.

---

## Frontend Bugs & Issues

### 🔴 Critical

#### 14. React `useEffect` Missing Dependencies — Stale Closures
**File:** [App.jsx#L75-93](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L75-L93)
```jsx
useEffect(() => { if (token) fetchCurrentUser(token); }, [token]);
useEffect(() => { if (token && user) fetchMyRooms(); }, [token, user]);
useEffect(() => { ... fetchRoomDetails(activeRoomId, currentFolderId); }, [activeRoomId, currentFolderId]);
```
- The first two effects reference `fetchCurrentUser` and `fetchMyRooms` which themselves close over `token` — but these functions aren't in the dependency array. This can cause stale closure bugs.
- The third effect uses `token` but doesn't list it as a dependency. If `token` changes while `activeRoomId` stays the same, the effect won't re-fire.

#### 15. `handleMoveFile` Doesn't Check Response Status
**File:** [App.jsx#L409-425](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L409-L425)
The move endpoint is `await fetch(...)` but the response status is never checked. If the server returns an error, the UI silently proceeds as if it succeeded.

### 🟡 Medium

#### 16. No Loading/Error States on Room Detail Fetch
When switching rooms or navigating folders, there's no loading indicator. The UI shows stale data from the previous room until the new data arrives.

#### 17. `handleDeleteFile` Doesn't Check Response Status Either
**File:** [App.jsx#L427-439](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L427-L439)
Same pattern as move — fire-and-forget.

#### 18. Lucide React Icons Used but Potentially Version-Sensitive
The components import from `lucide-react` (`FolderClosed`, `FileText`, `Copy`, `Search`, etc.). These icon names change across versions. If `lucide-react@0.475.0` doesn't have a specific icon name, the app will crash at import time.

#### 19. `authorizeDrive` Doesn't Check `res.ok` Before Using Data
**File:** [App.jsx#L233-236](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L233-L236)
After calling `/api/drive/connect-drive`, the code does `res.json()` and immediately calls `setDriveConnected(true)` without checking `res.ok`. If the backend errors, the UI falsely shows "Drive connected."

#### 20. `fetchMyRooms` — Potential Crash on `data.rooms.length`
**File:** [App.jsx#L128](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L128)
Line 127 does `setRooms(data.rooms || [])`, but line 128 checks `data.rooms.length` directly. If `data.rooms` is `undefined`, this throws before the fallback on L127.

#### 21. `selectedItemId` Never Resets Across Room/Folder Navigations
**File:** [MainWorkspace.jsx#L36](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/components/MainWorkspace.jsx#L36)
`selectedItemId` is local state inside `MainWorkspace`. When the parent switches rooms or folders, `selectedItemId` retains the old value — it could match a different file in the new listing.

#### 22. Dead UI Elements — Search Input & Download Button
- **Search input** in [MainWorkspace.jsx#L86-89](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/components/MainWorkspace.jsx#L86-L89): no state, no `onChange`, no filtering logic. Purely decorative.
- **Download button** in [MainWorkspace.jsx#L57-59](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/components/MainWorkspace.jsx#L57-L59): just calls `alert()`.

#### 23. `member.name.substring()` Crash If Name Is Undefined
**Files:** [RightMembersPanel.jsx#L86](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/components/RightMembersPanel.jsx#L86), [DiscordProfilePopout.jsx#L25](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/components/DiscordProfilePopout.jsx#L25)
No optional chaining on `m.name` / `member.name`. If a member doc has `name: undefined`, you get a `TypeError`.

#### 24. `App.css` Is Entirely Dead Code
**File:** [App.css](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.css)
Contains 185 lines of Vite scaffold boilerplate (`.counter`, `.hero`, `#center`, etc.). It's never imported by `App.jsx` — completely unused.

#### 25. JWT in `localStorage` — XSS Vulnerable
**File:** [App.jsx#L192](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L192)
Token stored in `localStorage` is readable by any XSS payload. `httpOnly` cookies would be more secure. Acceptable for a college DA, but worth knowing.

---

## Architecture Overview (How the Backend Works)

Here's a teach-you-the-backend walkthrough:

### Structure

The entire backend is a single file: [main.py](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py) (~740 lines). It's a **FastAPI** application with these logical sections:

```
┌─────────────────────────────────────┐
│  1. Imports & Config (L1–24)        │  ← env vars, constants
│  2. MongoDB Setup (L26–48)          │  ← connect, get collections
│  3. FastAPI App + CORS (L50–59)     │
│  4. Pydantic Models (L62–105)       │  ← request body schemas
│  5. Utility Functions (L107–148)    │  ← hash, JWT, auth dependency
│  6. Auth Endpoints (L151–299)       │  ← login, /me
│  7. Drive Endpoints (L302–432)      │  ← connect Google Drive
│  8. Room Endpoints (L435–672)       │  ← create, join, list, details, contribute
│  9. File Endpoints (L675–740)       │  ← create folder, upload, move, delete
└─────────────────────────────────────┘
```

### Key Concepts Explained

#### A. How FastAPI Works Here

FastAPI is a Python web framework that auto-generates API docs. Each endpoint is a decorated function:

```python
@app.post("/api/rooms/create")          # HTTP method + URL path
def create_room(
    payload: CreateRoomRequest,          # Auto-parsed JSON body → Pydantic model
    user: dict = Depends(get_current_user_doc)  # Dependency injection (auth check)
):
    ...
```

- **`@app.get` / `@app.post` / `@app.delete`** — Register route handlers.
- **Pydantic models** (`CreateRoomRequest`, etc.) — Define + validate the JSON body shape. If a request doesn't match, FastAPI auto-returns a 422 error.
- **`Depends(get_current_user_doc)`** — This is FastAPI's dependency injection. Before the endpoint runs, it calls `get_current_user_doc()`, which extracts the `Authorization: Bearer <token>` header, decodes the JWT, looks up the user in MongoDB, and returns the user document. If auth fails, it raises an `HTTPException` and the endpoint never executes.

#### B. Authentication Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  React   │───>│ Google   │───>│ FastAPI  │───>│ MongoDB  │
│ Frontend │    │  OAuth   │    │ Backend  │    │  Atlas   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │
     │  1. User clicks "Sign In"     │               │
     │──> Google popup ──────────>   │               │
     │  2. Google returns access_token               │
     │<──────────────────────────    │               │
     │  3. POST /api/auth/login      │               │
     │   {access_token: "..."}  ────>│               │
     │               │               │  4. GET /oauth2/v3/userinfo
     │               │               │──> Google ──> │
     │               │               │  5. Gets email, name, picture
     │               │               │               │
     │               │               │  6. Upsert user doc
     │               │               │──────────────>│
     │               │               │               │
     │               │               │  7. Create JWT(email, name)
     │  8. Return {token, user}      │               │
     │<──────────────────────────────│               │
     │  9. Store token in localStorage               │
```

The JWT payload contains `sub` (user ID), `email`, `name`, `picture`. It expires in 7 days. Every subsequent API call sends `Authorization: Bearer <jwt>`.

#### C. Data Model (MongoDB Collections)

```
users:
  _id, email, name, picture,
  drive_refresh_token, drive_folder_id,
  drive_total_space_bytes, drive_used_bytes, drive_available_bytes,
  created_at, last_login

rooms:
  _id, room_id (e.g. "RM-A3K9X2"), name, password_hash, owner_id, created_at

room_members:
  _id, room_id, user_id, role ("owner"|"member"),
  contributed_storage_gb, joined_at

files:
  _id, room_id, name, is_folder, owner_id, owner_name, provider_name,
  parent_id (for nesting), date_modified, size_bytes, size_str, created_at
```

#### D. How Rooms Work

- **Create**: Generate a unique `RM-XXXXXX` code → insert room doc + member doc (role=owner).
- **Join**: Look up room by ID, verify password hash → insert member doc (role=member).
- **List**: Find all `room_members` for current user → join with `rooms` collection.
- **Details**: Return room info + all members + all files at the current folder level.

#### E. File System (Virtual)

Files and folders live in the `files` collection. Folders have `is_folder: True`. Nesting is via `parent_id`:
- Root-level items have `parent_id` of `null`, `""`, or `"root"`.
- Subfolders/files have `parent_id` set to the parent folder's `_id`.
- The frontend navigates by passing `?parent_id=xxx` to the room details endpoint.

#### F. Google Drive Integration

The `/api/drive/connect-drive` endpoint:
1. Exchanges the OAuth code for access + refresh tokens
2. Calls the Google Drive API `about` endpoint to get real storage quota
3. Finds or creates a `NodeVaultPool` folder in the user's Drive
4. Saves everything to MongoDB

> [!IMPORTANT]
> The Drive integration is **incomplete** — files are never actually uploaded to Google Drive. The "upload" endpoint is metadata-only. The storage contribution is just a number in MongoDB, not enforced against real Drive quota.

---

## Summary of All Issues Found

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | 🔴 | Backend [L107](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L107) | Unsalted SHA-256 password hashing |
| 2 | 🔴 | Backend [L55](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L55) | CORS wildcard `"*"` with credentials |
| 3 | 🔴 | Backend [L640](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L640) | `used_storage_gb` hardcoded to `4.2` |
| 4 | 🔴 | Backend [L732](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L732) | `delete_file` has no authorization |
| 5 | 🔴 | Backend [L698](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L698) | `move_file` has no authorization |
| 6 | 🔴 | Backend [L42](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L42) | `None` collections crash endpoints |
| 7 | 🟡 | Backend [L631](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L631) | Hardcoded demo files returned as real data |
| 8 | 🟡 | Backend [L384](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L384) | Comment says 5 TB, value is ~5.5 TB |
| 9 | 🟡 | Backend [L713](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L713) | Upload is metadata-only (no real file transfer) |
| 10 | 🟡 | Backend [L448](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L448) | Infinite loop possible on room ID gen |
| 11 | 🟡 | Backend [L689](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L689) | `datetime.now()` vs `datetime.now(utc)` inconsistency |
| 12 | 🟢 | Backend [L23](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L23) | Weak default JWT secret |
| 13 | 🟢 | Backend [L355](file:///home/mukes/VIT/cloud/DA1_take2/backend/main.py#L355) | Access token stored as refresh token |
| 14 | 🔴 | Frontend [App.jsx#L75](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L75) | `useEffect` missing dependencies (stale closures) |
| 15 | 🔴 | Frontend [App.jsx#L409](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L409) | `handleMoveFile` ignores response status |
| 16 | 🟡 | Frontend | No loading states during room/folder fetches |
| 17 | 🟡 | Frontend [App.jsx#L427](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L427) | `handleDeleteFile` ignores response status |
| 18 | 🟡 | Frontend | Lucide icon name compatibility risk |
| 19 | 🔴 | Frontend [App.jsx#L233](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L233) | `authorizeDrive` no `res.ok` check |
| 20 | 🔴 | Frontend [App.jsx#L128](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L128) | `fetchMyRooms` crash on `data.rooms.length` |
| 21 | 🟡 | Frontend [MainWorkspace.jsx#L36](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/components/MainWorkspace.jsx#L36) | `selectedItemId` never resets on navigation |
| 22 | 🟢 | Frontend [MainWorkspace.jsx](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/components/MainWorkspace.jsx) | Dead search input + download stub |
| 23 | 🟡 | Frontend [RightMembersPanel.jsx#L86](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/components/RightMembersPanel.jsx#L86) | `member.name.substring()` crash if undefined |
| 24 | 🟢 | Frontend [App.css](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.css) | 185 lines of dead Vite boilerplate CSS |
| 25 | 🟢 | Frontend [App.jsx#L192](file:///home/mukes/VIT/cloud/DA1_take2/frontend/src/App.jsx#L192) | JWT in `localStorage` (XSS vulnerable) |
