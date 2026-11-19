import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildMintrudContextPayload, protocolDisplayStatus } from "../src/utils/registryPresentation.js";

const server = await createServer({ configFile: false, plugins: [react()],
  server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true } });
after(() => server.close());
const components = {
  ...await server.ssrLoadModule("/src/components/admin/MintrudRegistryDetails.jsx"),
  ...await server.ssrLoadModule("/src/components/admin/AdminRegistryLearnerProfileForm.jsx"),
};
const render = (name, props) => renderToStaticMarkup(createElement(components[name], props));
const fields = { protocol_number: { source: "SYNTHETIC-1" }, knowledge_check_date: { source: "2026-11-01" }, knowledge_check_result: { source: "satisfactory" } };
const draft = { id: "synthetic-protocol", status: "draft", fields };

test("draft values and empty saved registry remain visibly distinct", () => {
  const protocol = render("MintrudProtocolDetails", { protocols: [draft] });
  const saved = render("SavedMintrudFields", { context: {} });
  assert.match(protocol, /Черновик/);
  assert.match(protocol, /SYNTHETIC-1/);
  assert.equal((protocol.match(/<li>/g) || []).length, 6);
  assert.equal((saved.match(/Не заполнено/g) || []).length, 3);
  assert.doesNotMatch(saved, /SYNTHETIC-1|2026-11-01|Удовлетворительно/);
});

test("save omits protected protocol fields and never takes draft values", () => {
  const form = { protocol_number: "", knowledge_check_date: "", knowledge_check_result: "", profession_or_position: " engineer " };
  assert.deepEqual(buildMintrudContextPayload(form, true), { profession_or_position: "engineer" });
  assert.equal(buildMintrudContextPayload(form, false).protocol_number, null);
  const page = readFileSync(new URL("../src/pages/MainMintrudRegistriesPage.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /value=\{previewValues\?/);
  assert.match(page, /buildMintrudContextPayload\(form, sourceFieldsLocked\)/);
  assert.match(page, /Boolean\(sourceProtocol\) \|\| Boolean\(previewValues\)/);
});

test("recording and confirmed synchronization have distinct statuses", () => {
  assert.equal(protocolDisplayStatus({ ...draft, status: "recorded" }), "Результаты комиссии зафиксированы");
  assert.equal(protocolDisplayStatus({ ...draft, status: "recorded", sync_provenance: { applied: true } }), "Реквизиты синхронизированы с реестром");
  assert.notEqual(protocolDisplayStatus({ ...draft, sync_provenance: { ever_synced: true } }), "Реквизиты синхронизированы с реестром");
  const stored = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.source]));
  const saved = render("SavedMintrudFields", { context: stored });
  assert.match(saved, /SYNTHETIC-1/);
  assert.match(saved, /01\.11\.2026/);
  assert.match(saved, /Удовлетворительно/);
});

test("missing sex warns with profile editing action without blocking Mintrud", () => {
  const warning = render("RegistryProfileCompletenessNotice", { profile: { sex: null }, registry: "mintrud", onEdit: () => {} });
  assert.match(warning, /Не указан пол слушателя. Заполните это поле в персональных данных/);
  assert.match(warning, /не блокирует XML Минтруда 1.0.9/);
  assert.match(warning, /Открыть персональные данные/);
  assert.equal(render("RegistryProfileCompletenessNotice", { profile: { sex: "female" }, registry: "mintrud" }), "");
  assert.equal(render("RegistryProfileCompletenessNotice", { profile: null, registry: "mintrud" }), "");
  assert.match(render("RegistryProfileCompletenessNotice", { profile: { sex: "" }, registry: "frdo" }), /Для ФРДО это обязательное поле/);
});

test("profile warning uses saved response and refreshes after a successful save", () => {
  const profile = readFileSync(new URL("../src/components/admin/AdminRegistryLearnerProfileForm.jsx", import.meta.url), "utf8");
  assert.match(profile, /profile=\{original\}/);
  assert.match(profile, /getAdminLearnerProfile\(userId\)/);
  assert.match(profile, /\[userId, refreshKey\]/);
  assert.ok(profile.indexOf("setOriginal(values);", profile.indexOf("await updateAdminLearnerProfile")) < profile.indexOf("await onSaved?.()"));
});
