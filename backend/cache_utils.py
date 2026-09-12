import time
import logging
from typing import Any, Optional, Dict, Tuple

logger = logging.getLogger("cache")

class TTLCache:
    def __init__(self, default_ttl_seconds: float = 3.0):
        self.default_ttl = default_ttl_seconds
        self._cache: Dict[str, Tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            timestamp, data = self._cache[key]
            if time.time() - timestamp < self.default_ttl:
                logger.debug(f"Cache HIT for key: {key}")
                return data
            else:
                logger.debug(f"Cache EXPIRED for key: {key}")
                del self._cache[key]
        return None

    def set(self, key: str, data: Any):
        self._cache[key] = (time.time(), data)
        logger.debug(f"Cache SET for key: {key}")

    def invalidate(self, key_prefix: str = ""):
        if not key_prefix:
            self._cache.clear()
            logger.debug("Cache INVALIDATED completely")
        else:
            keys_to_del = [k for k in self._cache if k.startswith(key_prefix)]
            for k in keys_to_del:
                self._cache.pop(k, None)
            logger.debug(f"Cache INVALIDATED for prefix: {key_prefix}")

ttl_cache = TTLCache(default_ttl_seconds=3.0)
