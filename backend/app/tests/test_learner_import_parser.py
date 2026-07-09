from io import BytesIO

import pytest
from openpyxl import Workbook

from app.services.learner_import_parser import parse_learner_import_file


def test_parse_csv_learner_import_normalizes_rows() -> None:
    content = (
        "\u0424\u0418\u041e;Email;\u0422\u0435\u043b\u0435\u0444\u043e\u043d;\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430;\u0421\u041d\u0418\u041b\u0421\n"
        "  \u0418\u0432\u0430\u043d\u043e\u0432   \u0418\u0432\u0430\u043d \u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447 ;IVANOV@MAIL.RU;8 (917) 123-45-67;\u041f\u0435\u0440\u0432\u0430\u044f \u043f\u043e\u043c\u043e\u0449\u044c;12345678901\n"
    ).encode("utf-8-sig")

    result = parse_learner_import_file("learners.csv", content)

    assert result.total_rows == 1
    assert result.valid_rows == 1
    assert result.invalid_rows == 0

    row = result.rows[0]
    assert row.row_number == 2
    assert row.status == "valid"
    assert row.normalized_data["full_name"] == "\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d \u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447"
    assert row.normalized_data["last_name"] == "\u0418\u0432\u0430\u043d\u043e\u0432"
    assert row.normalized_data["first_name"] == "\u0418\u0432\u0430\u043d"
    assert row.normalized_data["middle_name"] == "\u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447"
    assert row.normalized_data["email"] == "ivanov@mail.ru"
    assert row.normalized_data["phone"] == "+79171234567"
    assert row.normalized_data["program_title"] == "\u041f\u0435\u0440\u0432\u0430\u044f \u043f\u043e\u043c\u043e\u0449\u044c"
    assert row.normalized_data["snils"] == "123-456-789 01"


def test_parse_csv_learner_import_reports_row_errors() -> None:
    content = (
        "\u0424\u0418\u041e;Email;\u0422\u0435\u043b\u0435\u0444\u043e\u043d\n"
        ";bad-email;\n"
    ).encode("utf-8")

    result = parse_learner_import_file("learners.csv", content)

    assert result.total_rows == 1
    assert result.valid_rows == 0
    assert result.invalid_rows == 1
    assert result.rows[0].status == "invalid"
    assert "\u0424\u0418\u041e \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e." in result.rows[0].validation_errors
    assert "\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email." in result.rows[0].validation_errors


def test_parse_xlsx_learner_import_finds_header_below_top_rows() -> None:
    workbook = Workbook()
    sheet = workbook.active

    sheet.append(["\u041a\u0443\u0440\u0441\u0430\u043d\u0442\u044b \u043e\u0442 \u0420\u0426\u0414\u041e"])
    sheet.append([""])
    sheet.append([
        "\u0424\u0418\u041e",
        "Email",
        "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430",
        "\u0423\u041a\u0414",
        "\u0414\u0430\u0442\u044b \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
        "\u042d\u0442\u0430\u043f",
        "\u041e\u0446\u0435\u043d\u043a\u0430",
        "\u041d\u0430\u043b\u0438\u0447\u0438\u0435 \u0421\u041d\u0418\u041b\u0421",
        "\u041d\u043e\u043c\u0435\u0440 \u0443\u0434\u043e\u0441\u0442\u043e\u0432\u0435\u0440\u0435\u043d\u0438\u044f",
    ])
    sheet.append([
        "\u041f\u0435\u0442\u0440\u043e\u0432 \u041f\u0435\u0442\u0440 \u041f\u0435\u0442\u0440\u043e\u0432\u0438\u0447",
        "petrov@mail.ru",
        "\u041e\u043a\u0430\u0437\u0430\u043d\u0438\u0435 \u043f\u0435\u0440\u0432\u043e\u0439 \u043f\u043e\u043c\u043e\u0449\u0438",
        "01",
        "15 \u0444\u0435\u0432\u0440\u0430\u043b\u044f 2026 - 14 \u0444\u0435\u0432\u0440\u0430\u043b\u044f 2027",
        "\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0442\u0435\u0441\u0442",
        "\u0417\u0430\u0447\u0435\u0442",
        "\u0414\u0430",
        "\u0423-123",
    ])

    stream = BytesIO()
    workbook.save(stream)

    result = parse_learner_import_file("learners.xlsx", stream.getvalue())

    assert result.total_rows == 1
    assert result.valid_rows == 1

    row = result.rows[0]
    assert row.row_number == 4
    assert row.normalized_data["full_name"] == "\u041f\u0435\u0442\u0440\u043e\u0432 \u041f\u0435\u0442\u0440 \u041f\u0435\u0442\u0440\u043e\u0432\u0438\u0447"
    assert row.normalized_data["email"] == "petrov@mail.ru"
    assert row.normalized_data["program_title"] == "\u041e\u043a\u0430\u0437\u0430\u043d\u0438\u0435 \u043f\u0435\u0440\u0432\u043e\u0439 \u043f\u043e\u043c\u043e\u0449\u0438"
    assert row.normalized_data["course_code"] == "01"
    assert row.normalized_data["training_dates_text"] == "15 \u0444\u0435\u0432\u0440\u0430\u043b\u044f 2026 - 14 \u0444\u0435\u0432\u0440\u0430\u043b\u044f 2027"
    assert row.normalized_data["stage"] == "\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0442\u0435\u0441\u0442"
    assert row.normalized_data["grade"] == "\u0417\u0430\u0447\u0435\u0442"
    assert row.normalized_data["has_snils_text"] == "\u0414\u0430"
    assert row.normalized_data["document_number"] == "\u0423-123"


def test_parse_learner_import_rejects_unsupported_file_format() -> None:
    with pytest.raises(ValueError, match="Unsupported import file format"):
        parse_learner_import_file("learners.txt", b"full_name,email\n")
