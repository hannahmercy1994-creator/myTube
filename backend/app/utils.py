import httpx
import re
from typing import Optional

YOUTUBE_ID_PATTERN = re.compile(
    r"(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})"
)


def extract_youtube_id(url: str) -> Optional[str]:
    match = YOUTUBE_ID_PATTERN.search(url)
    return match.group(1) if match else None


async def fetch_youtube_title(youtube_id: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"https://www.youtube.com/watch?v={youtube_id}",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
            )
            if resp.status_code == 200:
                match = re.search(r'<title>(.+?)</title>', resp.text)
                if match:
                    title = match.group(1).replace(" - YouTube", "").strip()
                    return title
    except Exception:
        pass
    return None
