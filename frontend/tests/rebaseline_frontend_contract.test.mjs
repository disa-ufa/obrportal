import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const source = path => readFileSync(
  new URL("../src/" + path, import.meta.url), "utf8"
);
const server = await createServer({
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  optimizeDeps: { noDiscovery: true },
});
after(() => server.close());
const load = path => server.ssrLoadModule("/src/" + path);
const { bindRegistrySession } = await load("utils/registrySession.js");
const render = (component, props) =>
  renderToStaticMarkup(createElement(component, props));

test("MintrudApplicabilityReview.jsx denies saving before review", async () => {
  const path = "components/admin/MintrudApplicabilityReview.jsx";
  const Component = (await load(path)).default;
  const html = render(Component, {
    obligationId: "synthetic",
    api: {},
    reload: async () => {},
    busy: false,
    onBusy: () => {},
    onSaved: () => {},
  });
  assert.match(html, /data-testid="mintrud-applicability-review"/);
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.match(source(path), /!review\?\.can_save \|\| pending \|\| busy/);
  assert.match(source(path), /window\.confirm\(/);
  assert.match(source(path), /expected_version: review\.decision_version/);
  assert.match(source(path), /expected_input_fingerprint: review\.input_fingerprint/);
  assert.match(source(path), /confirmed: true/);
});

test("RegistryBatchCard.jsx stays read-only with unknown result", async () => {
  const Component = (
    await load("components/admin/registries/RegistryBatchCard.jsx")
  ).default;
  const html = render(Component, {
    batch: {
      id: "synthetic",
      registry: "mintrud",
      status: "submitted",
      record_count: 2,
    },
    readOnly: true,
    pending: true,
  });
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /type="submit"/);
});

test("RegistryBatchDetail.jsx separates loading and failed GET", async () => {
  const Component = (
    await load("components/admin/registries/RegistryBatchDetail.jsx")
  ).default;
  assert.match(render(Component, { state: { loading: true } }), /role="status"/);
  assert.match(render(Component, { state: { error: true } }), /role="alert"/);
  assert.equal(render(Component, { state: {} }), "");
});

test("SelectedRegistryBatch.jsx rejects malformed or mismatched links", async () => {
  const Component = (
    await load("components/admin/registries/SelectedRegistryBatch.jsx")
  ).default;
  const bad = render(Component, {
    id: "not-a-uuid",
    registry: "frdo",
    onClose() {},
  });
  assert.match(bad, /role="alert"/);
  assert.doesNotMatch(bad, /type="submit"/);
  const pending = render(Component, {
    id: "11111111-1111-4111-8111-111111111111",
    registry: "mintrud",
    onClose() {},
  });
  assert.match(pending, /role="status"/);
  assert.doesNotMatch(pending, /type="submit"/);
});

test("useFrdoSubmissionFence.js starts without confirmed mutation", async () => {
  const { useFrdoSubmissionFence } = await load(
    "hooks/useFrdoSubmissionFence.js"
  );
  function Probe() {
    const state = useFrdoSubmissionFence(() => {});
    assert.deepEqual(state.pending, {});
    assert.equal(typeof state.confirm, "function");
    return createElement("span", null, "FRDO");
  }
  assert.match(render(Probe), /FRDO/);
  const code = source("hooks/useFrdoSubmissionFence.js");
  assert.match(code, /isCurrentAuthSession\(owner\.current\)/);
  assert.match(code, /canConfirmFrdoSubmission\(batch\)/);
  assert.match(code, /journal\.current\.begin\(batch\)/);
  assert.match(code, /journal\.current\.readback\(id, detail\)/);
  assert.match(code, /await check\(batch\.id\)/);
});

test("useMintrudPermissions.js fails closed without a verified session", async () => {
  const { useMintrudPermissions } = await load(
    "hooks/useMintrudPermissions.js"
  );
  function Probe() {
    const state = useMintrudPermissions();
    assert.deepEqual(state.permissions, []);
    assert.equal(state.canWriteNow(), false);
    return createElement("span", null, "DENIED");
  }
  assert.match(render(Probe), /DENIED/);
  const code = source("hooks/useMintrudPermissions.js");
  assert.match(code, /useSyncExternalStore\(subscribe, snapshot/);
  assert.match(code, /snapshot\(\) === session/);
  assert.match(code, /includes\("mintrud\.read"\)/);
  assert.match(code, /includes\("mintrud\.write"\)/);
});

test("registrySession.js refuses stale actor before API execution", async () => {
  let calls = 0;
  const guarded = bindRegistrySession(
    { submit: async () => { calls += 1; } },
    { generation: -1, accessToken: "stale-synthetic" },
  );
  await assert.rejects(guarded.submit(), Error);
  assert.equal(calls, 0);
});
