import json
import sys

import pytest

import app.mintrud_scan_inventory_cli as cli


def test_explicit_limits_and_root_are_forwarded(monkeypatch, capsys, tmp_path):
    observed = []

    def fake_inventory(entries, depth, seconds):
        observed.append(
            (entries, depth, seconds, cli.settings.document_storage_dir)
        )
        return {
            "state": "READ_ONLY",
            "complete": True,
            "artifacts": [],
            "destructive_action_allowed": False,
        }

    monkeypatch.setattr(cli, "inventory", fake_inventory)
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "mintrud_scan_inventory_cli",
            "--root", str(tmp_path),
            "--max-entries", "7",
            "--max-depth", "0",
            "--max-seconds", "0.25",
        ],
    )

    cli.main()

    result = json.loads(capsys.readouterr().out)

    assert observed == [(7, 0, 0.25, str(tmp_path))]
    assert result["state"] == "READ_ONLY"
    assert result["complete"] is True
    assert result["destructive_action_allowed"] is False


def test_default_limits_are_bounded(monkeypatch, capsys, tmp_path):
    observed = []

    def fake_inventory(entries, depth, seconds):
        observed.append((entries, depth, seconds))
        return {"state": "READ_ONLY"}

    monkeypatch.setattr(cli, "inventory", fake_inventory)
    monkeypatch.setattr(
        sys,
        "argv",
        ["mintrud_scan_inventory_cli", "--root", str(tmp_path)],
    )

    cli.main()

    assert observed == [(5000, 16, 10)]
    assert json.loads(capsys.readouterr().out) == {
        "state": "READ_ONLY"
    }


@pytest.mark.parametrize(
    ("option", "value"),
    [
        ("--max-entries", "0"),
        ("--max-entries", "-1"),
        ("--max-depth", "-1"),
        ("--max-seconds", "0"),
        ("--max-seconds", "-0.5"),
    ],
)
def test_invalid_limits_refuse_inventory(
    monkeypatch, capsys, tmp_path, option, value
):
    calls = []
    original_root = cli.settings.document_storage_dir

    monkeypatch.setattr(
        cli, "inventory", lambda *args: calls.append(args)
    )
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "mintrud_scan_inventory_cli",
            "--root", str(tmp_path),
            option, value,
        ],
    )

    with pytest.raises(SystemExit) as error:
        cli.main()

    assert error.value.code == 2
    assert not calls
    assert cli.settings.document_storage_dir == original_root
    assert "Limits must be positive" in capsys.readouterr().err


def test_root_is_mandatory(monkeypatch, capsys):
    calls = []
    original_root = cli.settings.document_storage_dir

    monkeypatch.setattr(
        cli, "inventory", lambda *args: calls.append(args)
    )
    monkeypatch.setattr(
        sys, "argv", ["mintrud_scan_inventory_cli"]
    )

    with pytest.raises(SystemExit) as error:
        cli.main()

    assert error.value.code == 2
    assert not calls
    assert cli.settings.document_storage_dir == original_root
    assert "--root" in capsys.readouterr().err