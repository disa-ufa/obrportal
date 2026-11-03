import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(
  new URL("../src/pages/AdminCoursesPage.jsx", import.meta.url),
  "utf8"
);

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Missing start: ${startMarker}`);

  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Missing end: ${endMarker}`);

  return source.slice(start, end);
}

const stateSource = section(
  "function getMintrudRequirementUiState(values) {",
  "function getActiveMintrudProgramIds("
);

const getState = runInNewContext(
  `${stateSource}\ngetMintrudRequirementUiState;`,
  Object.create(null)
);

const mapping = section(
  "function MintrudProgramMappingState({",
  "\nfunction CourseFormFields({"
);

test("M3.1: automatic Mintrud applicability", () => {
  const cases = [
    ["occupational_safety_training", "auto", "required"],
    ["general_education", "auto", "not_required"],
    ["additional_general_education", "auto", "not_required"],
    ["dpo_advanced_training", "auto", "not_required"],
    ["dpo_professional_retraining", "auto", "not_required"],
    ["vocational_training", "auto", "not_required"],
    ["other", "auto", "not_required"],
    ["unspecified", "auto", "undetermined"],
  ];

  for (const [programType, mode, expected] of cases) {
    assert.equal(
      getState({
        regulatory_program_type: programType,
        mintrud_requirement_mode: mode,
      }),
      expected,
      `${programType}/${mode}`
    );
  }
});

test("M3.1: explicit administrator overrides", () => {
  assert.equal(
    getState({
      regulatory_program_type: "general_education",
      mintrud_requirement_mode: "required",
    }),
    "required"
  );

  assert.equal(
    getState({
      regulatory_program_type: "occupational_safety_training",
      mintrud_requirement_mode: "not_required",
    }),
    "not_required"
  );
});

test("M3.1: missing classification requires review", () => {
  assert.equal(getState({}), "undetermined");
  assert.equal(
    getState({
      regulatory_program_type: "unspecified",
      mintrud_requirement_mode: "auto",
    }),
    "undetermined"
  );
});

test("M3.1: non-required courses have compact status", () => {
  assert.match(
    mapping,
    /requirementState === "not_required"\s*&& !hasHistoricalAssignment/
  );
  assert.ok(mapping.includes("course-mintrud-not-required"));
  assert.ok(mapping.includes("Минтруд: не требуется"));
});

test("M3.1: historical mappings remain read-only and collapsed", () => {
  assert.ok(
    mapping.includes("historicalOnly && hasHistoricalAssignment")
  );
  assert.ok(
    mapping.includes("course-mintrud-historical-details")
  );
  assert.ok(mapping.includes("<details"));
  assert.ok(mapping.includes("<summary"));
  assert.ok(mapping.includes("normalizedAssigned.map"));
});

test("M3.1: full catalog is optional", () => {
  assert.ok(mapping.includes("showAllMintrudPrograms"));
  assert.ok(mapping.includes("visibleCatalog"));
  assert.ok(mapping.includes("normalizedSelectedProgramIds.includes"));
  assert.ok(mapping.includes("course-mintrud-show-all-programs"));
  assert.ok(mapping.includes("visibleCatalog.map"));
});

test("M3.1: original white-screen error cannot return", () => {
  assert.doesNotMatch(
    source,
    /className\s*=\s*\{\s*INPUT\s*\}/
  );
  assert.ok(mapping.includes("course-mintrud-program-search"));
});

test("M3.1: mappings are saved only when required and changed", () => {
  assert.match(
    source,
    /editMintrudProgramsDirty\s*&& getMintrudRequirementUiState\(editForm\) === "required"/
  );
  assert.match(
    source,
    /createMintrudSelectedProgramIds\.length > 0\s*&& getMintrudRequirementUiState\(form\) === "required"/
  );
});