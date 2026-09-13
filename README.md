# GatherAround

GatherAround is a distributed cloud storage aggregation platform that pools storage quotas from multiple Google Drive accounts into a unified virtual storage room. By using a greedy bin-packing allocation algorithm, the system dynamically routes file uploads to whichever linked Google Drive account has available capacity, presenting a seamless single virtual file system hierarchy.

---

## Key Features

- **Multi-Account Storage Pooling**: Aggregate storage allocations across multiple Google Drive accounts to eliminate capacity friction.
- **Greedy Bin-Packing Routing**: File uploads are automatically assigned to the linked storage host account with the maximum available capacity.
- **Password-Protected Rooms & Quotas**: Create private storage rooms where members join with a room password and allocate custom storage quotas from their connected Google Drive accounts.
- **Unified Virtual File System**: Create folders, navigate breadcrumb paths, search files, rename items, and move files across directories seamlessly.
- **In-App Media Preview & Streaming**: Preview images, PDFs, and media directly in-app, or stream downloads straight from Google Drive.
- **Self-Healing Resilience**: Automatically detects files deleted directly on Google Drive during preview/download attempts, cleans up orphaned database metadata, and notifies the UI in real-time.
- **Fully Responsive UI**: Mobile-optimized navigation rail, bottom action sheets, and compact modal headers designed for touch and desktop devices.

---

## Tech Stack & Cloud Architecture

| Layer | Technologies & Services |
| :--- | :--- |
| **Frontend** | React 18, Vite, Vanilla CSS3, Lucide Icons |
| **Backend API** | Python 3.11, FastAPI, Pydantic v2 |
| **Database & ORM** | Neon PostgreSQL 16 (DBaaS), Async SQLAlchemy, asyncpg |
| **Cloud Services** | Google Cloud OAuth 2.0, Google Drive API v3 |
| **Hosting & Deployment** | Render PaaS (Frontend CDN & Backend Container) |

---

## System Architecture

```
                                  +---------------------------------+
                                  |   React 18 Single Page App      |
                                  |   (Render Static Site / CDN)    |
                                  +----------------+----------------+
                                                   |
                                           HTTP / JWT Auth
                                                   |
                                                   v
                                  +----------------+----------------+
                                  |   FastAPI REST Application      |
                                  |   (Render Web Container)        |
                                  +--------+---------------+--------+
                                           |               |
                    +----------------------+               +----------------------+
                    |                                                             |
                    v                                                             v
  +-----------------+-----------------+                         +-----------------+-----------------+
  |      Neon PostgreSQL DBaaS        |                         |       Google Drive API v3       |
  |  (Users, Rooms, Quotas, Metadata) |                         | (Remote Uploads, Downloads, Del)|
  +-----------------------------------+                         +---------------------------------+
```

---

## Repository Structure

```
├── backend/
│   ├── app/
│   │   ├── core/           # Security, OAuth, Database config
│   │   ├── models/         # SQLAlchemy DB Models (users, rooms, file_items)
│   │   ├── routers/        # FastAPI API endpoints (auth, users, rooms, files)
│   │   ├── schemas/        # Pydantic validation schemas
│   │   └── services/       # Bin-packing logic, Drive API streaming & file service
│   ├── main.py             # FastAPI Application entrypoint
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # Modals, File Explorer, Layouts, Toolbars
│   │   ├── hooks/          # Custom hooks (useFileSystem, useAuth, useToast)
│   │   ├── styles/         # Design system, CSS tokens & responsive breakpoints
│   │   └── utils/          # Formatters & Constants
│   ├── index.html
│   └── vite.config.js
└── README.md
```

---

## Local Development Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & `npm`
- **PostgreSQL Database** (Local instance or Neon DB connection string)
- **Google Cloud Platform OAuth Client ID & Secret** (with Google Drive API enabled)

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in `backend/` with your environment variables:
   ```env
   DATABASE_URL=postgresql+asyncpg://user:password@host/dbname?ssl=require
   JWT_SECRET=your_super_secret_jwt_key
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   FRONTEND_URL=http://localhost:5173
   ```

5. Start the development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend will be running at `http://localhost:8000`.  
   Interactive API docs available at `http://localhost:8000/docs`.

---

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in `frontend/`:
   ```env
   VITE_BACKEND_URL=http://localhost:8000
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## Live Deployments & API Documentation

- **Web Application**: [https://gather-around.onrender.com](https://gather-around.onrender.com)
- **Backend Server**: [https://cloud-storage-aggregator.onrender.com](https://cloud-storage-aggregator.onrender.com)
- **Interactive OpenAPI Docs**: [https://cloud-storage-aggregator.onrender.com/docs](https://cloud-storage-aggregator.onrender.com/docs)
