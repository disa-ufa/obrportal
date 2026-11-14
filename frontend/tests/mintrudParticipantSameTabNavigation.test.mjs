import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/components/admin/MintrudProtocolDraftsPanel.jsx", import.meta.url),
  "utf8"
);

test("Mintrud participant correction opens in the current authenticated tab", () => {
  const links = source
    .split(/\r?\n/)
    .filter(line => line.includes("Открыть данные Минтруда</a>"));

  assert.equal(links.length, 1);

  const link = links[0];

  assert.match(link, /mintrudView=protocols/);
  assert.match(link, /protocolId=/);
  assert.match(link, /#participant=/);

  assert.doesNotMatch(link, /\btarget\s*=\s*["']_blank/);
  assert.doesNotMatch(link, /\brel\s*=\s*["']noreferrer/);
});