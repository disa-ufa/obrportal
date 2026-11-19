import test from "node:test";
import assert from "node:assert/strict";

import {
  adminPostLoginDestination,
} from "../src/lib/adminPostLoginDestination.js";

test("preserves Mintrud participant hash after login", () => {
  const target =
    "/admin/registries?registry=mintrud&registryView=work" +
    "#participant=723618e8-a2c6-4852-a5f3-f579d99a9343:" +
    "e690f4d3-3107-4c8a-8a36-983fb239f086";

  assert.equal(adminPostLoginDestination(target), target);
});

test("preserves ordinary internal admin pages", () => {
  assert.equal(
    adminPostLoginDestination("/admin/courses?tab=users"),
    "/admin/courses?tab=users",
  );
});

test("rejects external and non-admin redirects", () => {
  for (const value of [
    undefined,
    null,
    "",
    "//example.com",
    "https://example.com",
    "/account",
    "/administration",
    "/admin\\example.com",
    "/admin\nexample.com",
  ]) {
    assert.equal(adminPostLoginDestination(value), "/admin");
  }
});
