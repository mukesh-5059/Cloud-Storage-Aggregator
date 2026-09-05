import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, rooms, users

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("main")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FastAPI Study Backend",
    description="Backend API with Google OAuth, Custom JWT, and Private Rooms management",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    logger.info(f"HTTP {request.method} {request.url.path} - Status {response.status_code} - Completed in {duration_ms:.1f}ms")
    return response

app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(users.router)

@app.get("/")
def root():
    return {"message": "FastAPI Study Backend API is running"}
