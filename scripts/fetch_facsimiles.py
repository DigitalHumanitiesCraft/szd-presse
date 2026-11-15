"""Download the first facsimile page of every record with a publication reference and store a
reduced JPEG for the site.

Images: Literaturarchiv Salzburg, Stefan Zweig Digital, CC BY 4.0 (imprint of stefanzweig.digital,
read 2026-11-15; METS rights block "CC-BY"). Requests run one after another with a pause, so the
GAMS server sees one polite client; files already present are skipped, so a rerun resumes.
"""

import io
import json
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

LONG_SIDE = 640
QUALITY = 70
PAUSE_S = 0.5


def fetch(pid: str) -> bytes:
    req = urllib.request.Request(f"https://gams.uni-graz.at/{pid}/IMG.1", headers={"User-Agent": "szd-presse/0.1"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def main(records_path: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    records = [r for r in json.loads(records_path.read_text(encoding="utf-8")) if r["published"] or r["classification"] == "Zeitungsausschnitte"]
    failed = []
    for i, rec in enumerate(records, 1):
        target = out_dir / f"{rec['pid'].replace(':', '_')}.jpg"
        if target.exists():
            continue
        try:
            img = Image.open(io.BytesIO(fetch(rec["pid"]))).convert("RGB")
            img.thumbnail((LONG_SIDE, LONG_SIDE))
            img.save(target, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        except Exception as exc:  # network or decoding error; record it and continue
            failed.append({"pid": rec["pid"], "error": str(exc)})
        print(f"{i}/{len(records)} {rec['pid']}", flush=True)
        time.sleep(PAUSE_S)
    (Path("data") / "facsimile_failures.json").write_text(json.dumps(failed, indent=1), encoding="utf-8")
    print(f"done, {len(failed)} failed")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
