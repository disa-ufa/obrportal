import assert from "node:assert/strict";
import test, { after } from "node:test";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const storage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};
globalThis.sessionStorage = storage();
globalThis.localStorage = storage();
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
after(() => server.close());
const api = await server.ssrLoadModule("/src/api/client.js");
const { default: Review } = await server.ssrLoadModule("/src/components/admin/RegistryAutomaticApplicability.jsx");

test("both registry cards start with inspection and require a fresh server response before confirmation", () => {
  for (const registry of ["mintrud", "frdo"]) {
    const html = renderToStaticMarkup(createElement(Review, { registry, obligationId: "synthetic" }));
    assert.match(html, /Показать расчёт применимости/);
    assert.doesNotMatch(html, /Подтвердить автоматический расчёт/);
  }
});

test("read is uncached and a 409 from the registry POST is returned without retry", async () => {
  api.storeToken("synthetic-operator");
  const request = { expected_version: 0, expected_rule_version: "current", expected_input_fingerprint: "a".repeat(64) };
  for (const registry of ["mintrud", "frdo"]) {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ path: new URL(url, "http://local.invalid").pathname, options });
      if (options.method === "POST") return { ok: false, status: 409, text: async () => '{"detail":{"code":"registry.applicability_changed"}}' };
      return { ok: true, status: 200, text: async () => JSON.stringify({ registry, can_confirm: true }) };
    };
    assert.equal((await api.getRegistryAutomaticApplicability(registry, "synthetic/id")).registry, registry);
    await assert.rejects(api.confirmRegistryAutomaticApplicability(registry, "synthetic/id", request), error => error.status === 409);
    const prefix = `/api/v1/admin/${registry}/obligations/synthetic%2Fid/applicability`;
    assert.deepEqual(calls.map(call => call.path), [prefix, `${prefix}/confirm-auto`]);
    assert.equal(calls[0].options.cache, "no-store");
    assert.equal(calls[1].options.headers.Authorization, "Bearer synthetic-operator");
    assert.deepEqual(JSON.parse(calls[1].options.body), request);
  }
});
