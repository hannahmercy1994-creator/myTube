import time
from collections import OrderedDict


class TTLCache:
    def __init__(self, maxsize=512, ttl=30):
        self.maxsize = maxsize
        self.ttl = ttl
        self._data: OrderedDict[str, tuple[float, object]] = OrderedDict()

    def _evict(self):
        now = time.time()
        expired = [k for k, (ts, _) in self._data.items() if now - ts > self.ttl]
        for k in expired:
            del self._data[k]

    def get(self, key: str):
        self._evict()
        entry = self._data.get(key)
        if entry is None:
            return None
        ts, value = entry
        if time.time() - ts > self.ttl:
            del self._data[key]
            return None
        return value

    def set(self, key: str, value: object):
        self._evict()
        while len(self._data) >= self.maxsize:
            self._data.popitem(last=False)
        self._data[key] = (time.time(), value)

    def invalidate(self, prefix: str | None = None):
        if prefix is None:
            self._data.clear()
        else:
            self._data = OrderedDict(
                (k, v) for k, v in self._data.items() if not k.startswith(prefix)
            )


video_cache = TTLCache(ttl=30)
