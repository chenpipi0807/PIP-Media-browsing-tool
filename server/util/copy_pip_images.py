from __future__ import annotations

import json
import shutil
from pathlib import Path
import sys


def copy_selected_images(
    json_path: Path,
    source_dir: Path,
    dest_dir: Path,
) -> None:
    if not json_path.exists():
        print(f"[ERROR] JSON file not found: {json_path}")
        sys.exit(1)

    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"[ERROR] Failed to parse JSON: {e}")
        sys.exit(1)

    if not isinstance(data, dict) or "pip" not in data or not isinstance(data["pip"], list):
        print("[ERROR] JSON must contain a key 'pip' with a list of filenames.")
        sys.exit(1)

    filenames: list[str] = [str(x) for x in data["pip"]]

    if not source_dir.exists():
        print(f"[ERROR] Source directory does not exist: {source_dir}")
        sys.exit(1)

    dest_dir.mkdir(parents=True, exist_ok=True)

    copied = 0
    missing: list[str] = []

    for name in filenames:
        src = source_dir / name
        dst = dest_dir / name
        if src.exists():
            # Ensure parent folders exist (flat copy, but safe)
            dst.parent.mkdir(parents=True, exist_ok=True)
            try:
                shutil.copy2(src, dst)
                print(f"[OK] Copied: {src.name}")
                copied += 1
            except Exception as e:
                print(f"[ERROR] Failed to copy {src} -> {dst}: {e}")
        else:
            print(f"[MISS] Not found: {src}")
            missing.append(name)

    print("\n===== Summary =====")
    print(f"Total listed: {len(filenames)}")
    print(f"Copied: {copied}")
    print(f"Missing: {len(missing)}")
    if missing:
        print("Missing files:")
        for m in missing:
            print(f" - {m}")


if __name__ == "__main__":
    # Defaults based on the user's request
    project_root = Path(__file__).resolve().parents[1]
    default_json = project_root / "server" / "pooca0915.json"

    json_arg = Path(sys.argv[1]) if len(sys.argv) > 1 else default_json
    source_arg = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(r"C:\\Poly-designer-Tool\\pooca\\0913")
    dest_arg = Path(sys.argv[3]) if len(sys.argv) > 3 else Path(r"C:\\Users\\ZYB\\Downloads\\0915xuan")

    print("Using:")
    print(f" - JSON:   {json_arg}")
    print(f" - Source: {source_arg}")
    print(f" - Dest:   {dest_arg}")

    copy_selected_images(json_arg, source_arg, dest_arg)
