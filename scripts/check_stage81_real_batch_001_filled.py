from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-real-batch-001-filled.md"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.13 real batch filled guard failed: {message}")

def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")

def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")

manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)

if EMAIL_RE.search(stage_doc):
    fail("stage doc contains raw email-like value")
if PHONE_RE.search(stage_doc):
    fail("stage doc contains raw phone-like value")

for marker in [
    "Stage 81.13 - real-batch-001 filled card",
    "stage81_13_status=real_batch_001_filled_sanitized_completed",
    "stage81_13_batch_id=real-batch-001",
    "stage81_13_decision=commit_sanitized_batch_card_only",
    "stage81_13_next_stage=81.14",
    "curator_email_masked:",
    "learner_email_masked:",
    "curator_phone_masked:",
    "learner_phone_masked:",
    "password_recorded: `no`",
    "Знакомство с образовательным порталом",
    "znakomstvo-s-obrazovatelnym-portalom",
    "REAL-BATCH-001",
    "Нуриев Фаниль Жамилевич",
]:
    require(stage_doc, marker, "stage81.13 doc")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
if "81.13" not in stages:
    fail("stage 81.13 record is missing")

stage = stages["81.13"]
if stage.get("status") != "real_batch_001_filled_sanitized_completed":
    fail("stage 81.13 status mismatch")
if stage.get("raw_contacts_committed") is not False:
    fail("raw_contacts_committed must be false")
if stage.get("password_committed") is not False:
    fail("password_committed must be false")

policy = stage.get("sanitized_contact_policy") or {}
if policy.get("raw_contacts_committed") is not False:
    fail("sanitized_contact_policy.raw_contacts_committed must be false")
if policy.get("password_committed") is not False:
    fail("sanitized_contact_policy.password_committed must be false")

for key in ["curator_email_masked", "learner_email_masked", "phone_masked"]:
    value = str(policy.get(key, ""))
    if not value or "***" not in value:
        fail(f"sanitized_contact_policy.{key} must be masked")

print("stage 81.13 real batch filled guard passed")
