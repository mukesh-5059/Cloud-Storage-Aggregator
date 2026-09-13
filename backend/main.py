import logging
import time
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import auth, rooms, users, files
from services import gdrive_service

class CustomColoredFormatter(logging.Formatter):
    GREY = "\x1b[38;20m"
    GREEN = "\x1b[32;1m"
    CYAN = "\x1b[36;1m"
    YELLOW = "\x1b[33;1m"
    RED = "\x1b[31;1m"
    RESET = "\x1b[0m"
    DIM = "\x1b[90m"

    def format(self, record):
        color = self.GREEN if record.levelno == logging.INFO else (
            self.YELLOW if record.levelno == logging.WARNING else (
                self.RED if record.levelno >= logging.ERROR else self.GREY
            )
        )
        time_str = f"{self.DIM}{self.formatTime(record, '%Y-%m-%d %H:%M:%S')}{self.RESET}"
        level_str = f"{color}[{record.levelname}]{self.RESET}"
        name_str = f"{self.CYAN}{record.name}{self.RESET}"
        return f"{time_str} {level_str} {name_str}: {record.getMessage()}"

handler = logging.StreamHandler()
handler.setFormatter(CustomColoredFormatter())

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.handlers = [handler]

logger = logging.getLogger("main")

logging.getLogger("uvicorn.access").disabled = True


Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing shared HTTP client pool for Google Drive API...")
    gdrive_service.http_client = httpx.AsyncClient(timeout=30.0)
    yield
    logger.info("Closing shared HTTP client pool...")
    await gdrive_service.http_client.aclose()

app = FastAPI(
    title="GatherAround API",
    description="GatherAround Backend API — Collaborative Google Drive Quota Aggregation",
    version="1.0.0",
    lifespan=lifespan
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

    status_code = response.status_code
    if status_code < 300:
        status_str = f"\x1b[32;1m{status_code}\x1b[0m"
    elif status_code < 400:
        status_str = f"\x1b[36;1m{status_code}\x1b[0m"
    elif status_code < 500:
        status_str = f"\x1b[33;1m{status_code}\x1b[0m"
    else:
        status_str = f"\x1b[31;1m{status_code}\x1b[0m"

    method_str = request.method
    if request.method == "OPTIONS":
        preflight_target = request.headers.get("access-control-request-method")
        if preflight_target:
            method_str = f"OPTIONS (Preflight for {preflight_target.upper()})"

    logger.info(f"HTTP {method_str} {request.url.path} - Status {status_str} - Completed in {duration_ms:.1f}ms")
    return response

app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(users.router)
app.include_router(files.router)

@app.get("/")
def root():
    return {"message": "GatherAround API is running"}

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

