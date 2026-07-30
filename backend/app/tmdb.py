import asyncio
import json
import re
import ssl
import httpx
from typing import Optional

_SSL_CTX = ssl.create_default_context()
_SSL_CTX.maximum_version = ssl.TLSVersion.TLSv1_2


async def _tmdb_request(client: httpx.AsyncClient, method: str, url: str, **kwargs):
    last_error = None
    for attempt in range(5):
        try:
            resp = await client.request(method, url, **kwargs)
            return resp
        except (httpx.ConnectError, httpx.RemoteProtocolError, httpx.TimeoutException) as e:
            last_error = e
            if attempt < 4:
                await asyncio.sleep(1 << attempt)
                continue
    raise last_error

TMDB_API_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

_CLEANUP_PATTERNS = [
    r"\b(?:official|4K|HD|FHD|UHD|HQ)\b",
    r"\b(?:trailer|teaser|preview|clip|scene|opening|ending|credits|tease)\b",
    r"\b(?:part|chapter|season|episode)\s+\d+\b",
    r"\b(?:19\d{2}|20\d{2})\b",
    r"\s+\d{3,4}p\b",
    r"\s*(?:10bit|8bit|HDR(?:10)?|SDR|DV|Dolby\s*Vision)\b",
    r"\s*(?:x264|x265|HEVC|AVC|H\.?264|H\.?265|AV1|VP9)\b",
    r"\s*(?:BluRay|WEB[\s-]?DL|WEB[\s-]?Rip|HDTV|HDRip|BRRip|DVDRip|AMZN|NF|HULU|iTunes|AppleTV|MAX|DSNP|HBO)\b",
    r"\s+(?:DDP|AC3|DTS|AAC|MP3|Atmos|TrueHD|FLAC)(?:\s+\d+(?:\.?\d+)?)?(?:\s*(?:kbps|Mb))?\b",
    r"\s*\d+(?:\.\d+)?\s*(?:kbps|Mbps|Mb|ch)\b",
    r"\s+[56]\.?1\b",
    r"\s+[78]\.?1\b",
    r"\s*\b(?:Hindi|English|Tamil|Telugu|Malayalam|Kannada|Bengali|Punjabi|French|German|Spanish|Korean|Japanese|Chinese|Russian|Arabic|Turkish|Italian|Portuguese|Dutch|Indonesian|Thai|Vietnamese)\b",
    r"\s*\b(?:UNRATED|EXTENDED|UNCUT|DIRECTORS?\s*CUT|THEATRICAL|REMUX|REPACK|PROPER|INTERNAL)\b",
    r"\s*\b(?:4kHDHub|HDHub|YIFY|RARBG|EVO|FGT|JFF|TayTO|EZTV|AAA|NTb|Hustle)\b",
    r"\s+[-–|+]\s+.*$", r"^[-–|+]\s+",
    r"\s+[-–|+]+\s*$",
    r"\s*\(.*?\)\s*$",
    r"\s+\d+\s*$",
    r"\s{2,}",
]


def clean_title(title: str) -> str:
    cleaned = title.strip()
    for pattern in _CLEANUP_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or title


def _tmdb_client():
    return httpx.AsyncClient(timeout=10.0, verify=_SSL_CTX)

async def tmdb_search(query: str, api_key: str, media_type: str = "movie") -> list[dict]:
    async with _tmdb_client() as client:
        resp = await _tmdb_request(client, "GET", f"{TMDB_API_BASE}/search/{media_type}",
            params={"api_key": api_key, "query": query, "language": "en-US", "page": 1},
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("results", [])[:10]
        return []


async def tmdb_details(tmdb_id: int, api_key: str, media_type: str = "movie") -> Optional[dict]:
    async with _tmdb_client() as client:
        resp = await _tmdb_request(client, "GET", f"{TMDB_API_BASE}/{media_type}/{tmdb_id}",
            params={"api_key": api_key, "language": "en-US"},
        )
        if resp.status_code != 200:
            return None
        details = resp.json()
        try:
            cr = await _tmdb_request(client, "GET", f"{TMDB_API_BASE}/{media_type}/{tmdb_id}/credits",
                params={"api_key": api_key, "language": "en-US"},
            )
            if cr.status_code == 200:
                cd = cr.json()
                cast = [
                    {"name": c.get("name"), "character": c.get("character"), "profile_path": c.get("profile_path")}
                    for c in (cd.get("cast") or [])[:10]
                ]
                directors = [c.get("name") for c in (cd.get("crew") or []) if c.get("job") == "Director"]
                details["_credits"] = {"cast": cast, "director": directors[0] if directors else None}
        except Exception:
            pass
        try:
            vr = await _tmdb_request(client, "GET", f"{TMDB_API_BASE}/{media_type}/{tmdb_id}/videos",
                params={"api_key": api_key, "language": "en-US"},
            )
            if vr.status_code == 200:
                vd = vr.json()
                for v in (vd.get("results") or []):
                    if v.get("site") == "YouTube" and v.get("type") == "Trailer" and v.get("official"):
                        details["_trailer_key"] = v["key"]
                        break
                if "_trailer_key" not in details:
                    for v in (vd.get("results") or []):
                        if v.get("site") == "YouTube" and v.get("type") == "Trailer":
                            details["_trailer_key"] = v["key"]
                            break
        except Exception:
            pass
        try:
            if media_type == "movie":
                rr = await _tmdb_request(client, "GET", f"{TMDB_API_BASE}/movie/{tmdb_id}/release_dates",
                    params={"api_key": api_key},
                )
                if rr.status_code == 200:
                    rd = rr.json()
                    for r in (rd.get("results") or []):
                        if r.get("iso_3166_1") == "US":
                            for rd_entry in (r.get("release_dates") or []):
                                cert = rd_entry.get("certification")
                                if cert:
                                    details["_certification"] = cert
                                    break
                            break
                    if "_certification" not in details:
                        for r in (rd.get("results") or []):
                            for rd_entry in (r.get("release_dates") or []):
                                cert = rd_entry.get("certification")
                                if cert:
                                    details["_certification"] = cert
                                    break
                            if "_certification" in details:
                                break
            else:
                rr = await _tmdb_request(client, "GET", f"{TMDB_API_BASE}/tv/{tmdb_id}/content_ratings",
                    params={"api_key": api_key},
                )
                if rr.status_code == 200:
                    rd = rr.json()
                    for r in (rd.get("results") or []):
                        if r.get("iso_3166_1") == "US":
                            rating = r.get("rating")
                            if rating:
                                details["_certification"] = rating
                                break
        except Exception:
            pass
        return details


def format_tmdb_result(item: dict, media_type: str) -> dict:
    poster = item.get("poster_path")
    backdrop = item.get("backdrop_path")
    return {
        "tmdb_id": item["id"],
        "tmdb_type": media_type,
        "title": item.get("title" if media_type == "movie" else "name", "Unknown"),
        "overview": item.get("overview", ""),
        "poster_url": f"{TMDB_IMAGE_BASE}/w500{poster}" if poster else None,
        "backdrop_url": f"{TMDB_IMAGE_BASE}/w1280{backdrop}" if backdrop else None,
        "vote_average": item.get("vote_average"),
        "release_date": item.get("release_date" if media_type == "movie" else "first_air_date"),
        "year": (item.get("release_date") or item.get("first_air_date") or "")[:4],
    }


def apply_tmdb_details(video, details: dict, tmdb_id: int, media_type: str):
    video.tmdb_id = tmdb_id
    video.tmdb_type = media_type
    video.tmdb_overview = details.get("overview")
    video.tmdb_vote_average = details.get("vote_average")
    video.tmdb_release_date = details.get("release_date") or details.get("first_air_date")
    poster = details.get("poster_path")
    backdrop = details.get("backdrop_path")
    if poster:
        video.tmdb_poster_url = f"{TMDB_IMAGE_BASE}/w500{poster}"
    if backdrop:
        video.tmdb_backdrop_url = f"{TMDB_IMAGE_BASE}/w1280{backdrop}"

    genres = [g.get("name") for g in (details.get("genres") or [])]
    credits_data = details.get("_credits", {})
    payload = {
        "cast": credits_data.get("cast", []),
        "director": credits_data.get("director"),
        "genres": genres,
        "runtime": details.get("runtime"),
        "tagline": details.get("tagline"),
        "status": details.get("status"),
        "trailer_key": details.get("_trailer_key"),
        "certification": details.get("_certification"),
    }
    video.tmdb_credits = json.dumps(payload, ensure_ascii=False) if any(v for v in payload.values()) else None

    collection_data = details.get("belongs_to_collection")
    video.tmdb_collection = collection_data.get("name") if collection_data else None


async def guess_tmdb(title: str, api_key: str):
    year_match = re.search(r"\b(19\d{2}|20\d{2})\b", title)
    year = year_match.group(0) if year_match else None

    queries = []
    cleaned = clean_title(title)
    queries.append(cleaned)
    if cleaned != title:
        queries.append(title)

    words = cleaned.split()
    if len(words) > 3:
        queries.append(" ".join(words[:3]))
    if len(words) > 2:
        queries.append(" ".join(words[:2]))
    if len(words) > 1:
        queries.append(words[0])

    orig_words = title.split()
    if len(orig_words) > 3:
        queries.append(" ".join(orig_words[:3]))
    if len(orig_words) > 2:
        queries.append(" ".join(orig_words[:2]))

    queries = list(dict.fromkeys(q for q in queries if len(q) > 2))

    for media_type in ("movie", "tv"):
        for q in queries:
            results = await tmdb_search(q, api_key, media_type)
            if results:
                if year:
                    for item in results:
                        item_year = (item.get("release_date") or item.get("first_air_date") or "")[:4]
                        if item_year == year:
                            details = await tmdb_details(item["id"], api_key, media_type)
                            if details:
                                return item["id"], media_type, details
                tmdb_item = results[0]
                details = await tmdb_details(tmdb_item["id"], api_key, media_type)
                if details:
                    return tmdb_item["id"], media_type, details
    return None, None, None
