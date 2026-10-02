"""Shared on-disk price cache and per-provider rate gates.

Every external price lookup goes through here so request handlers read local
data instead of calling rate-limited APIs on every click.
"""
import json
import logging
import os
import threading
import time
from collections import deque
from datetime import datetime

logger = logging.getLogger(__name__)

CACHE_FILE = os.getenv('PRICE_CACHE_FILE', 'price_cache.json')

_lock = threading.RLock()


def _load():
    try:
        with open(CACHE_FILE, 'r') as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


_store = _load()


def _save():
    tmp = f'{CACHE_FILE}.tmp'
    try:
        with open(tmp, 'w') as f:
            json.dump(_store, f)
        os.replace(tmp, CACHE_FILE)
    except OSError as e:
        logger.warning(f"Could not persist price cache: {e}")


def get(kind, key):
    """Return {'price': float, 'ts': epoch} or None."""
    with _lock:
        entry = _store.get(f'{kind}:{key}')
        return dict(entry) if entry else None


def put_many(kind, prices):
    now = time.time()
    with _lock:
        for key, price in prices.items():
            _store[f'{kind}:{key}'] = {'price': price, 'ts': now}
        _save()


def age(entry):
    return time.time() - entry['ts']


def iso(entry):
    return datetime.fromtimestamp(entry['ts']).isoformat()


class RateGate:
    """Sliding-window limiter with backoff, so we stay under a provider's free quota."""

    def __init__(self, name, max_calls, period):
        self.name = name
        self.max_calls = max_calls
        self.period = period
        self.calls = deque()
        self.blocked_until = 0.0
        self._lock = threading.Lock()

    def try_acquire(self):
        with self._lock:
            now = time.time()
            if now < self.blocked_until:
                return False
            while self.calls and now - self.calls[0] > self.period:
                self.calls.popleft()
            if len(self.calls) >= self.max_calls:
                logger.info(f"⏳ {self.name} budget used ({self.max_calls}/{self.period}s) - serving cached prices")
                return False
            self.calls.append(now)
            return True

    def backoff(self, seconds):
        with self._lock:
            self.blocked_until = max(self.blocked_until, time.time() + seconds)
        logger.warning(f"🧊 {self.name} cooling down for {seconds}s")


def retry_after(response, default=90):
    try:
        return max(10, int(response.headers.get('Retry-After', default)))
    except (TypeError, ValueError):
        return default
