import httpx

ids = [
    ("Castaway 1986", "Y-yIXwLEbPo"),
    ("Spider-Man Brand New Day", "f2rxJV6n-Eg"),
    ("The Social Network 2010", "ekRWgdSyDPo"),
    ("The Guilty 2021", "n85OmMmEBO4"),
    ("Night of the Living Dead 1968", "P-x9_w-D9m3"),
]

# Use oEmbed (no API key needed)
with httpx.Client(timeout=10) as c:
    for name, yid in ids:
        url = f"https://www.youtube.com/watch?v={yid}"
        r = c.get("https://www.youtube.com/oembed", params={"format": "json", "url": url})
        print(f"{name}: oEmbed={r.status_code}")

    # Also try the video page HEAD
    for name, yid in ids:
        url = f"https://www.youtube.com/watch?v={yid}"
        r = c.head(url, follow_redirects=True)
        print(f"{name}: HEAD={r.status_code}")
