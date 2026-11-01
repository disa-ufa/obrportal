"""Pure contract tests for deterministic identity lock keys."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.registry_import_identity_keys import (
    identity_lock_key,
    identity_lock_keys,
)


class IdentityLockKeyTests(unittest.TestCase):
    def test_email_case_normalized(self):
        self.assertEqual(
            identity_lock_key("email", " STUDENT@TEST.INVALID "),
            identity_lock_key("email", "student@test.invalid"),
        )

    def test_different_kinds_are_distinct(self):
        self.assertNotEqual(
            identity_lock_key("email", "123"),
            identity_lock_key("phone", "123"),
        )

    def test_personal_data_not_exposed(self):
        value = "learner@example.invalid"
        key = identity_lock_key("email", value)

        self.assertNotIn(value, key)
        self.assertNotIn("learner", key)
        self.assertTrue(
            key.startswith("registry-import-identity:v1:")
        )

    def test_deterministic_sorted_deduplicated(self):
        first = identity_lock_keys([
            ("phone", "+79990000000"),
            ("email", "Learner@Example.Invalid"),
            ("email", "learner@example.invalid"),
        ])

        second = identity_lock_keys([
            ("email", "learner@example.invalid"),
            ("phone", "+79990000000"),
        ])

        self.assertEqual(first, second)
        self.assertEqual(len(first), 2)
        self.assertEqual(first, tuple(sorted(first)))

    def test_invalid_kind_rejected(self):
        with self.assertRaises(ValueError):
            identity_lock_key("password", "something")

    def test_empty_value_rejected(self):
        with self.assertRaises(ValueError):
            identity_lock_key("email", "  ")


if __name__ == "__main__":
    unittest.main()