from app.mintrud_learn_program_catalog import (
    MINTRUD_EDUCATED_PERSON_XSD_SHA256_V109,
    MINTRUD_LEARN_PROGRAM_BY_ID_V109,
    MINTRUD_LEARN_PROGRAM_CATALOG_SOURCE_V109,
    MINTRUD_LEARN_PROGRAM_CATALOG_V109,
    MINTRUD_LEARN_PROGRAM_IDS_V109,
    MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109,
)


EXPECTED_IDS_V109 = {
    1,
    2,
    3,
    4,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
}


def test_mintrud_v109_catalog_has_exact_program_domain():
    assert len(MINTRUD_LEARN_PROGRAM_CATALOG_V109) == 28
    assert MINTRUD_LEARN_PROGRAM_IDS_V109 == EXPECTED_IDS_V109
    assert set(MINTRUD_LEARN_PROGRAM_BY_ID_V109) == EXPECTED_IDS_V109
    assert 5 not in MINTRUD_LEARN_PROGRAM_IDS_V109


def test_mintrud_v109_catalog_has_unique_ids_codes_and_exact_schema():
    ids = [
        item.learn_program_id
        for item in MINTRUD_LEARN_PROGRAM_CATALOG_V109
    ]
    codes = [
        item.code
        for item in MINTRUD_LEARN_PROGRAM_CATALOG_V109
    ]

    assert len(ids) == len(set(ids))
    assert len(codes) == len(set(codes))

    assert all(
        item.schema_version == MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109
        for item in MINTRUD_LEARN_PROGRAM_CATALOG_V109
    )


def test_mintrud_v109_catalog_preserves_authoritative_anchor_values():
    assert MINTRUD_LEARN_PROGRAM_BY_ID_V109[1].code == "ИД34"
    assert (
        MINTRUD_LEARN_PROGRAM_BY_ID_V109[1].title
        == "Оказание первой помощи пострадавшим"
    )
    assert MINTRUD_LEARN_PROGRAM_BY_ID_V109[4].code == "ИД46Б"
    assert MINTRUD_LEARN_PROGRAM_BY_ID_V109[29].code == "ИД46В_24"
    assert (
        MINTRUD_LEARN_PROGRAM_BY_ID_V109[29].title
        == "Безопасные методы и приемы работ в театрах"
    )


def test_mintrud_v109_catalog_records_source_provenance():
    assert (
        MINTRUD_LEARN_PROGRAM_CATALOG_SOURCE_V109
        == "https://edu.rosmintrud.ru/api/Reference/GetLearnProgram?IsActive=true"
    )
    assert (
        MINTRUD_EDUCATED_PERSON_XSD_SHA256_V109
        == "3016889f51b5c142b8fd5baa97b31a356b07032f0dc13f8ef687b851532948fc"
    )
