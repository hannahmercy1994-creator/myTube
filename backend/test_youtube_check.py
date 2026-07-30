import httpx
api_key = "AIzaSyDyPc6Y3sDGKvxqVNOFeuznvDkHn0I0bp8"
ids = ["Y-yIXwLEbPo", "4pYVrpbT1hk", "f2rxJV6n-Eg"]
with httpx.Client(timeout=10) as c:
    r = c.get("https://www.googleapis.com/youtube/v3/videos", params={
        "part": "status", "id": ",".join(ids), "key": api_key
    })
    print("Status:", r.status_code)
    data = r.json()
    print("Items:", len(data.get("items", [])))
    for item in data.get("items", []):
        print(f"  {item['id']}: privacy={item['status']['privacyStatus']}, upload={item['status']['uploadStatus']}")
    if "error" in data:
        print("ERROR:", data["error"])
