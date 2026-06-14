import csv, json, os, sys, time, urllib.request

KEY = os.environ["LINEAR_KEY"]
TEAM = "788de6fb-b794-4510-bc69-486691cb6ca1"      # Helios-Labs
PROJECT = "b3672f55-f0e7-4bf8-84ae-b1480ea6a6dc"   # DISPATCH.AI
CSV_PATH = os.path.join(os.path.dirname(__file__), "dispatch-ai-issues.csv")

PRIORITY = {"urgent": 1, "high": 2, "medium": 3, "low": 4, "": 0}

LABELS = {
    "security": "14bd51e5-38e2-4cbb-a2a2-f36f9fb1a131",
    "architecture": "1e0e55ef-d930-4f8a-9662-4f5bfc2e024d",
    "refactor-blocker": "bd35c065-74a6-4801-8028-a97b0e7e041e",
    "provider": "c3c9118c-c0d8-4f50-8249-789ee75d9950",
    "materialize": "d998a613-8f1f-47f9-99b5-ce6dd445be5d",
    "frontend": "d27db8fe-aa80-4623-ae02-1b04c8fe59be",
    "backend": "3c0d5d13-b509-4444-b846-9f7ecdf7e9ac",
    "performance": "94cf23f1-a5fa-409a-a5d5-abecf2e8cb8e",
    "hygiene": "525eac5e-d5b5-47a4-a7bb-e045a92277c7",
    "tests": "96a27ed0-11e4-442f-9529-965720a17f55",
    "docs": "a3b49de0-377f-4a40-b316-d3343afd4d08",
    "bug": "006a9752-eb85-431c-81c2-2d2b94b949f1",
    "tech-debt": "c8f5f4c6-e11c-4dc0-a409-ed7347c295d1",
}

MUT = """mutation Create($input: IssueCreateInput!) {
  issueCreate(input: $input) { success issue { identifier url } }
}"""

def post(query, variables):
    body = json.dumps({"query": query, "variables": variables}).encode()
    req = urllib.request.Request("https://api.linear.app/graphql", data=body,
        headers={"Authorization": KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

created, failed = [], []
with open(CSV_PATH, newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

for i, row in enumerate(rows):
    label_ids = [LABELS[l.strip().lower()] for l in row["Labels"].split(",")
                 if l.strip().lower() in LABELS]
    inp = {
        "teamId": TEAM,
        "projectId": PROJECT,
        "title": row["Title"].strip(),
        "description": row["Description"].strip(),
        "priority": PRIORITY.get(row["Priority"].strip().lower(), 0),
        "labelIds": label_ids,
    }
    try:
        res = post(MUT, {"input": inp})
        if res.get("data", {}).get("issueCreate", {}).get("success"):
            iss = res["data"]["issueCreate"]["issue"]
            created.append(iss["identifier"])
            print(f"[{i+1}/{len(rows)}] {iss['identifier']}  {row['Title'][:60]}")
        else:
            failed.append((row["Title"], res))
            print(f"[{i+1}/{len(rows)}] FAILED  {row['Title'][:60]}  ->  {json.dumps(res)[:200]}")
    except Exception as e:
        failed.append((row["Title"], str(e)))
        print(f"[{i+1}/{len(rows)}] ERROR  {row['Title'][:60]}  ->  {e}")
    time.sleep(0.2)

print(f"\nDone. Created {len(created)}, failed {len(failed)}.")
if created:
    print("Range:", created[0], "..", created[-1])
if failed:
    print("Failures:", [t for t, _ in failed])
