"""Deterministic, privacy-preserving import identity lock keys."""

from __future__ import annotations

from hashlib import sha256
from typing import Iterable

VALID_KINDS = frozenset({"email", "phone", "snils"})
PREFIX = "registry-import-identity:v1:"


def identity_lock_key(kind: str, value: str) -> str:
    if kind not in VALID_KINDS:
        raise ValueError("Unsupported identity kind")

    if not isinstance(value, str):
        raise ValueError("Identity value must be text")

    normalized = value.strip()

    if kind == "email":
        normalized = normalized.lower()

    if not normalized:
        raise ValueError("Identity value must not be empty")

    digest = sha256(
        (kind + "\x00" + normalized).encode("utf-8")
    ).hexdigest()

    return PREFIX + digest


def identity_lock_keys(
    identities: Iterable[tuple[str, str]],
) -> tuple[str, ...]:
    return tuple(
        sorted(
            {
                identity_lock_key(kind, value)
                for kind, value in identities
            }
        )
    )