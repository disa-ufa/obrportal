"""Read-only inventory; accepts root and documented resource limits only."""
import argparse
import json
from app.core.config import settings
from app.services.mintrud_scan_inventory import inventory

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True)
    parser.add_argument('--max-entries', type=int, default=5000)
    parser.add_argument('--max-depth', type=int, default=16)
    parser.add_argument('--max-seconds', type=float, default=10)
    args = parser.parse_args()
    if args.max_entries < 1 or args.max_depth < 0 or args.max_seconds <= 0:
        parser.error('Limits must be positive (depth may be zero)')
    settings.document_storage_dir = args.root
    print(json.dumps(inventory(args.max_entries, args.max_depth, args.max_seconds)))

if __name__ == '__main__':
    main()
