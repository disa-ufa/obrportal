import os
import sys
import re
import json
import html
import shutil
import hashlib
import tempfile
import subprocess
import threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = Path(__file__).resolve().parents[2]
PAGE = "frontend/src/pages/AdminRegistriesPage.jsx"

EXTRA = [
    "frontend/src/api/client.js",
    "frontend/src/utils/mintrudWorkflow.js",
    "frontend/src/utils/mintrudWorkflow.test.js",
]

def git(*args):
    result = subprocess.run(
        ["git", "--no-optional-locks", "-C", str(ROOT), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    if result.returncode:
        raise RuntimeError(
            "GIT_ERROR:" + " ".join(args) +
            ":" + result.stderr[-500:]
        )
    return result.stdout

def state():
    return (
        git("branch", "--show-current").strip(),
        git("rev-parse", "HEAD").strip(),
        tuple(git(
            "status", "--porcelain=v1",
            "--untracked-files=all"
        ).splitlines()),
        git("diff", "--cached", "--name-only").strip(),
        git("diff", "--check")
    )

def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1048576), b""):
            h.update(block)
    return h.hexdigest().upper()

def chrome_path():
    for key, default in [
        ("PROGRAMFILES", "C:/Program Files"),
        ("PROGRAMFILES(X86)", "C:/Program Files (x86)"),
        ("LOCALAPPDATA", "C:/Users/Public")
    ]:
        candidate = Path(
            os.environ.get(key, default)
        ) / "Google/Chrome/Application/chrome.exe"

        if candidate.is_file():
            return str(candidate)

    return (
        shutil.which("chrome.exe") or
        shutil.which("chrome")
    )

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

HTML = r'''<!doctype html>
<html lang="ru">
<head><meta charset="UTF-8"></head>
<body>
<div id="root"></div>
<pre id="obr-result">{"phase":"HTML_ONLY"}</pre>
<script type="module" src="/src/obr-result-error-retry.js"></script>
</body>
</html>'''

JS = r'''
// All ambiguous outcomes forbid a second POST, including a lost success response.
const scenario = new URLSearchParams(location.search).get("scenario") || "unresolved";
const batchId = "synthetic-error-retry-001";
const base = "/api/v1/admin/mintrud/batches";
const detailPath = `${base}/${batchId}`;

const ids = [
  "synthetic-obligation-001",
  "synthetic-obligation-002",
  "synthetic-obligation-003"
];

const batch = {
  id: batchId,
  status: "submitted",
  schema_version: "1.0.9",
  obligation_count: 3,
  record_count: 3,
  has_artifact: true,
  artifact_sha256: "a".repeat(64),
  generated_at: "2026-10-18T08:00:00Z",
  imported_at: "2026-10-18T09:00:00Z",
  submitted_at: "2026-10-18T10:00:00Z",
  external_reference: "SYN-REFERENCE",
  reconciled_at: null
};

const items = ids.map((id, index) => ({
  id: `synthetic-item-${index + 1}`,
  obligation_id: id,
  position: index + 1,
  record_count: 1,
  result_status: null,
  external_id: null,
  errors_json: []
}));

const d = {
  phase: "INITIAL",
  checks: [],
  calls: [],
  errors: [],
  events: [],
  confirmations: [],
  payloads: [],
  postAttempts: 0,
  allowConfirmation: true,
  batch
};

function phase(name) {
  d.phase = name;
  document.getElementById("obr-result").textContent =
    JSON.stringify(d);
}

function check(name, condition) {
  const pass = Boolean(condition);
  d.checks.push({name, pass});
  if (!pass) throw new Error(`CHECK_FAILED:${name}`);
}

async function waitFor(fn, timeout = 12000) {
  const started = Date.now();

  while (Date.now() - started < timeout) {
    const value = fn();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return null;
}

const byId = id =>
  document.querySelector(`[data-testid="${id}"]`);

const formNode = () =>
  byId(
    `admin-registries-mintrud-batch-result-form-${batchId}`
  );

const openButton = () =>
  byId(
    `admin-registries-mintrud-batch-results-open-${batchId}`
  );

const row = id =>
  byId(
    `admin-registries-mintrud-batch-result-item-${id}`
  );

const submit = () =>
  formNode()?.querySelector('button[type="submit"]');

const postCount = () =>
  d.calls.filter(call =>
    call.method === "POST" &&
    call.path === `${detailPath}/result`
  ).length;

function setControl(node, value) {
  if (!node) {
    throw new Error("CONTROL_NOT_FOUND");
  }

  const proto = node.tagName === "SELECT"
    ? HTMLSelectElement.prototype
    : node.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

  Object.getOwnPropertyDescriptor(
    proto, "value"
  ).set.call(node, value);

  node.dispatchEvent(
    new Event(
      node.tagName === "SELECT" ? "change" : "input",
      {bubbles: true}
    )
  );

  if (node.tagName !== "SELECT") {
    node.dispatchEvent(
      new Event("change", {bubbles: true})
    );
  }
}

window.confirm = message => {
  d.confirmations.push(String(message));
  return d.allowConfirmation;
};

window.addEventListener("error", event => {
  d.errors.push(
    `WINDOW_ERROR:${event.message}`
  );
  phase("WINDOW_ERROR");
});

window.addEventListener(
  "unhandledrejection",
  event => {
    d.errors.push(
      `UNHANDLED_REJECTION:${String(event.reason)}`
    );
    phase("UNHANDLED_REJECTION");
  }
);

const respond = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {"Content-Type": "application/json"}
  });

function detail() {
  return {
    ...batch,
    items: items.map(item => ({
      ...item,
      errors_json: [...item.errors_json]
    }))
  };
}

window.fetch = async (input, options = {}) => {
  const raw = typeof input === "string"
    ? input
    : input.url;

  const url = new URL(raw, location.href);

  const method = String(
    options.method ||
    (
      typeof input === "object"
        ? input.method
        : "GET"
    )
  ).toUpperCase();

  const path = url.pathname;
  d.calls.push({method, path});

  if (url.origin !== location.origin) {
    d.errors.push("EXTERNAL_REQUEST_BLOCKED");
    return respond({detail: "blocked"}, 403);
  }

  if (method === "GET" && [
    "/api/v1/admin/frdo/batches",
    "/api/v1/admin/frdo/obligations",
    "/api/v1/admin/mintrud/obligations"
  ].includes(path)) {
    return respond([]);
  }

  if (method === "GET" && path === base) {
    return respond([{...batch}]);
  }

  if (method === "GET" && path === detailPath) {
    if (scenario === "unavailable" && d.postAttempts > 0) {
      d.events.push("readback-unavailable");
      return respond({detail: "Synthetic readback unavailable"}, 503);
    }
    return respond(detail());
  }

  if (
    method === "POST" &&
    path === `${detailPath}/result`
  ) {
    const payload = JSON.parse(options.body || "{}");
    d.payloads.push(payload);
    d.postAttempts += 1;

    const expected = [
      {
        obligation_id: ids[0],
        result_status: "accepted",
        external_id: "SYN-REC-001",
        errors: []
      },
      {
        obligation_id: ids[1],
        result_status: "rejected",
        external_id: null,
        errors: ["Invalid identifier"]
      },
      {
        obligation_id: ids[2],
        result_status: "correction_required",
        external_id: null,
        errors: ["Missing field X"]
      }
    ];

    if (
      JSON.stringify(payload.items) !==
      JSON.stringify(expected)
    ) {
      d.errors.push("RESULT_PAYLOAD_MISMATCH");
      return respond(
        {detail: "unexpected payload"},
        422
      );
    }

    if (d.postAttempts !== 1) {
      d.errors.push("UNEXPECTED_EXTRA_MUTATION");
      return respond({detail: "duplicate POST forbidden"}, 409);
    }

    if (scenario === "committed") {
      payload.items.forEach((item, index) => {
        items[index].result_status = item.result_status;
        items[index].external_id = item.external_id;
        items[index].errors_json = [...item.errors];
      });
      batch.reconciled_at = "2026-10-18T11:00:00Z";
      d.events.push("response_lost_after_commit");
    }
    d.events.push("synthetic-http-503");
    return respond({detail: "Synthetic uncertain response"}, 503);
  }

  d.errors.push(
    `UNEXPECTED_API:${method} ${path}`
  );
  return respond(
    {detail: "unexpected request"},
    403
  );
};

try {
  phase("STARTED");

  const React = await import("react");
  const ReactDOM = await import("react-dom/client");
  const page = await import(
    "./pages/AdminRegistriesPage.jsx"
  );

  check(
    "COMPONENT_EXPORTED",
    typeof page.AdminRegistriesPage === "function"
  );

  ReactDOM.createRoot(
    document.getElementById("root")
  ).render(
    React.createElement(page.AdminRegistriesPage)
  );

  check(
    "PAGE_RENDERED",
    Boolean(await waitFor(() =>
      byId("admin-registries-filters")
    ))
  );

  const tab = await waitFor(() =>
    byId("admin-registries-tab-mintrud")
  );

  check("MINTRUD_TAB_FOUND", Boolean(tab));
  tab.click();

  const open = await waitFor(openButton);
  check("RESULT_OPEN_FOUND", Boolean(open));
  open.click();

  check(
    "FORM_RENDERED",
    Boolean(await waitFor(formNode))
  );

  const rows = ids.map(row);
  check("THREE_ROWS_FOUND", rows.every(Boolean));

  check(
    "INITIAL_RESULTS_UNSELECTED",
    rows.every(r =>
      r.querySelector("select")?.value === ""
    )
  );

  setControl(
    rows[0].querySelector("select"),
    "accepted"
  );

  const externalId = await waitFor(() =>
    rows[0].querySelector("input")
  );

  check(
    "ACCEPTED_EXTERNAL_ID_INPUT",
    Boolean(externalId)
  );

  setControl(
    externalId,
    "  SYN-REC-001  "
  );

  setControl(
    rows[1].querySelector("select"),
    "rejected"
  );

  const rejectedErrors = await waitFor(() =>
    rows[1].querySelector("textarea")
  );

  check(
    "REJECTED_ERRORS_INPUT",
    Boolean(rejectedErrors)
  );

  setControl(
    rejectedErrors,
    " Invalid identifier \n"
  );

  setControl(
    rows[2].querySelector("select"),
    "correction_required"
  );

  const correctionErrors = await waitFor(() =>
    rows[2].querySelector("textarea")
  );

  check(
    "CORRECTION_ERRORS_INPUT",
    Boolean(correctionErrors)
  );

  setControl(
    correctionErrors,
    " Missing field X \n"
  );

  check(
    "COMPLETE_RESULTS_ENABLE_SAVE",
    Boolean(await waitFor(() =>
      submit() && !submit().disabled
    ))
  );

  const detailGetCount = () => d.calls.filter(call =>
    call.method === "GET" && call.path === detailPath
  ).length;
  const pending = () => byId(`admin-registries-mintrud-result-pending-${batchId}`);
  const recheck = () => byId(`admin-registries-mintrud-result-check-${batchId}`);
  const pendingStored = () => JSON.parse(sessionStorage.getItem(
    "obrportal_mintrud_result_pending_ids_v1"
  ) || "[]").includes(batchId);

  formNode().requestSubmit();

  check(
    "FIRST_POST_ATTEMPT",
    Boolean(await waitFor(() =>
      postCount() === 1
    ))
  );

  check(
    "SYNTHETIC_503_RETURNED",
    d.events.includes("synthetic-http-503")
  );

  await new Promise(resolve => setTimeout(resolve, 400));

  check("AUTOMATIC_READBACK_GET", Boolean(await waitFor(() => detailGetCount() === 2)));
  if (scenario === "committed") {
    check("SERVER_COMMITTED_BEFORE_RESPONSE_LOSS",
      batch.reconciled_at !== null && d.events.includes("response_lost_after_commit"));
    check("RESULTS_RESTORED_READONLY", Boolean(await waitFor(() => {
      const controls = [...(formNode()?.querySelectorAll("select,input,textarea") || [])];
      return controls.length === 6 && controls.every(c => c.disabled) && !submit();
    })));
    check("SERVER_RESULTS_RESTORED", ids.every((id, index) =>
      row(id).querySelector("select").value === items[index].result_status));
    check("SERVER_EXTERNAL_ID_RESTORED", row(ids[0]).querySelector("input").value === "SYN-REC-001");
    check("SERVER_ERRORS_RESTORED",
      row(ids[1]).querySelector("textarea").value.includes("Invalid identifier") &&
      row(ids[2]).querySelector("textarea").value.includes("Missing field X"));
    check("PENDING_CLEARED_ONLY_AFTER_CONFIRMED_GET", !pendingStored());
    formNode().requestSubmit();
    await new Promise(resolve => setTimeout(resolve, 150));
    check("READONLY_PROGRAMMATIC_RESUBMIT_BLOCKED", postCount() === 1 && d.confirmations.length === 1);
  } else {
  check(
    "FAILED_POST_DID_NOT_RECONCILE",
    batch.reconciled_at === null
  );

  check(
    "NO_AUTOMATIC_POST_RETRY",
    postCount() === 1
  );

  check(
    "FORM_EDITABLE_AFTER_FAILURE",
    Boolean(await waitFor(() =>
      rows.every(r =>
        !r.querySelector("select").disabled
      )
    ))
  );

  check(
    "SAVE_DISABLED_AFTER_503",
    Boolean(await waitFor(() =>
      submit() && submit().disabled
    ))
  );

  check(
    "RESULTS_PRESERVED_AFTER_FAILURE",
    rows[0].querySelector("select").value ===
      "accepted" &&
    rows[1].querySelector("select").value ===
      "rejected" &&
    rows[2].querySelector("select").value ===
      "correction_required"
  );

  check(
    "EXTERNAL_ID_PRESERVED_AFTER_FAILURE",
    rows[0].querySelector("input")?.value ===
      "  SYN-REC-001  "
  );

  check(
    "ERRORS_PRESERVED_AFTER_FAILURE",
    rows[1].querySelector("textarea")?.value
      .includes("Invalid identifier") &&
    rows[2].querySelector("textarea")?.value
      .includes("Missing field X")
  );

  check(
    "FIRST_CONFIRMATION_PRESENT",
    d.confirmations.length === 1
  );

  check("PENDING_WARNING_VISIBLE", Boolean(await waitFor(pending)));
  check("MANUAL_CHECK_AVAILABLE", Boolean(await waitFor(() => recheck() && !recheck().disabled)));
  check("PENDING_STORED", pendingStored());
  formNode().requestSubmit();
  await new Promise(resolve => setTimeout(resolve, 150));
  check("PROGRAMMATIC_RESUBMIT_BLOCKED", postCount() === 1);
  check("NO_SECOND_CONFIRMATION", d.confirmations.length === 1);
  const beforeCheck = d.calls.length;
  recheck().click();
  check("MANUAL_RECHECK_GET", Boolean(await waitFor(() => detailGetCount() === 3)));
  check("PENDING_AFTER_RECHECK", Boolean(await waitFor(() => recheck() && !recheck().disabled)) &&
    pendingStored() && Boolean(pending()) && Boolean(submit()) && submit().disabled);
  check("MANUAL_CHECK_GET_ONLY", d.calls.slice(beforeCheck).length === 1 &&
    d.calls.slice(beforeCheck).every(call => call.method === "GET" && call.path === detailPath));
  check("SERVER_REMAINS_UNRECONCILED", batch.reconciled_at === null &&
    items.every(item => item.result_status === null && item.external_id === null && item.errors_json.length === 0));
  check("INPUT_PRESERVED_AFTER_RECHECK",
    rows[0].querySelector("select").value === "accepted" &&
    rows[1].querySelector("select").value === "rejected" &&
    rows[2].querySelector("select").value === "correction_required" &&
    rows[0].querySelector("input").value === "  SYN-REC-001  " &&
    rows[1].querySelector("textarea").value.includes("Invalid identifier") &&
    rows[2].querySelector("textarea").value.includes("Missing field X"));
  if (scenario === "unavailable") {
    check("AUTOMATIC_AND_MANUAL_READBACK_UNAVAILABLE",
      d.events.filter(event => event === "readback-unavailable").length === 2);
  }
  formNode().requestSubmit();
  await new Promise(resolve => setTimeout(resolve, 150));
  check("RESUBMIT_AFTER_RECHECK_BLOCKED", postCount() === 1 && d.confirmations.length === 1);
  }
  check("EXACTLY_ONE_POST_ATTEMPT", postCount() === 1);
  check("EXACTLY_ONE_OPERATOR_CONFIRMATION", d.confirmations.length === 1);

  check(
    "NO_MOCK_ERRORS",
    d.errors.length === 0
  );

  phase("PASS");

} catch (error) {
  d.errors.push(
    `TEST_ERROR:${String(error.message || error)}`
  );
  phase("FAIL");
} finally {
  d.diagnostic = {
    scenario,
    detailGetCount: d.calls.filter(call => call.method === "GET" && call.path === detailPath).length,
    duplicatePostCount: Math.max(0, postCount() - 1),
    pendingStored: JSON.parse(sessionStorage.getItem("obrportal_mintrud_result_pending_ids_v1") || "[]").includes(batchId),
    postCount: postCount(),
    confirmCount: d.confirmations.length,
    reconciledAt: batch.reconciled_at,
    events: d.events,
    formPresent: Boolean(formNode()),
    submitPresent: Boolean(submit()),
    submitDisabled: submit()?.disabled ?? null
  };

  phase(d.phase);
}
'''

def main():
    print(
        "=== C4.4D.8AA.7D.1B.2G.2.1 API FAILURE AND RETRY ===",
        flush=True
    )

    print("\n=== 1. STRICT SOURCE PREFLIGHT ===",
          flush=True)

    before = state()
    branch, head, status, staged, diffcheck = before

    assert branch == "local/m2231", "BRANCH_MISMATCH"
    assert not staged, "STAGED_CHANGES"
    assert not diffcheck, "DIFF_CHECK_FAILED"
    assert (ROOT / PAGE).is_file(), "PAGE_MISSING"

    unexpected = [
        item for item in status
        if not (
            item.startswith(" M ") or
            item.startswith("?? ")
        )
    ]
    assert not unexpected, "UNEXPECTED_GIT_STATUS"

    modified = {
        item[3:] for item in status
        if item.startswith(" M ")
    }
    untracked = {
        item[3:] for item in status
        if item.startswith("?? ")
    }

    protected = sorted(
        modified | untracked | set(EXTRA) | {PAGE}
    )

    assert all(
        (ROOT / relative).is_file()
        for relative in protected
    ), "PROTECTED_FILE_MISSING"

    baseline = {
        relative: sha(ROOT / relative)
        for relative in protected
    }

    print("STRICT_PREFLIGHT=PASS", flush=True)
    print("PROTECTED_FILES=" + str(len(protected)), flush=True)
    print("PAGE_BASELINE_SHA256=" + baseline[PAGE], flush=True)

    temp = None
    server = None
    thread = None
    failure = None

    try:
        npm = (
            shutil.which("npm.cmd") or
            shutil.which("npm")
        )
        node = (
            shutil.which("node.exe") or
            shutil.which("node")
        )
        chrome = chrome_path()

        assert npm, "NPM_NOT_FOUND"
        assert node, "NODE_NOT_FOUND"
        assert chrome, "CHROME_NOT_FOUND"

        print(
            "\n=== 2. EXISTING NODE TESTS ===",
            flush=True
        )

        node_result = subprocess.run(
            [
                node, "--test",
                "src/utils/mintrudWorkflow.test.js",
                "src/utils/adminEnrollmentsCsv.test.js",
            ],
            cwd=ROOT / "frontend",
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=90
        )

        print(
            "NODE_TEST_EXIT=" +
            str(node_result.returncode),
            flush=True
        )

        for line in node_result.stdout.splitlines()[-12:]:
            print("NODE=" + line[:220], flush=True)

        if node_result.returncode:
            raise RuntimeError(
                "EXISTING_NODE_TESTS_FAILED:" +
                node_result.stderr[-900:]
            )

        print("EXISTING_NODE_TESTS=PASS",
              flush=True)

        print(
            "\n=== 3. COPY FRONTEND ===",
            flush=True
        )

        listing = subprocess.run(
            [
                "git", "--no-optional-locks",
                "-C", str(ROOT),
                "ls-files", "-z", "--", "frontend"
            ],
            capture_output=True
        )

        assert listing.returncode == 0, (
            "FRONTEND_LIST_FAILED"
        )

        files = [
            item.decode("utf-8")
            for item in listing.stdout.split(b"\0")
            if item
        ]

        assert files, "FRONTEND_LIST_EMPTY"

        temp = Path(
            tempfile.mkdtemp(prefix="obr_2g1_")
        )
        frontend = temp / "frontend"

        for relative in files:
            source = ROOT / relative
            target = temp / relative

            assert source.is_file(), (
                "SOURCE_MISSING:" + relative
            )

            target.parent.mkdir(
                parents=True,
                exist_ok=True
            )
            shutil.copy2(source, target)

        assert sha(temp / PAGE) == baseline[PAGE], (
            "COPY_HASH_MISMATCH"
        )

        (frontend / "index.html").write_text(
            HTML, encoding="utf-8"
        )

        (
            frontend / "src/obr-result-error-retry.js"
        ).write_text(
            JS, encoding="utf-8"
        )

        print(
            "FRONTEND_FILES_COPIED=" +
            str(len(files)),
            flush=True
        )
        print("TEMP_REACT_PATCH=NONE", flush=True)

        handler = partial(
            Handler,
            directory=str(frontend / "dist")
        )

        server = ThreadingHTTPServer(
            ("127.0.0.1", 0),
            handler
        )

        port = server.server_address[1]

        environment = os.environ.copy()
        environment["npm_config_offline"] = "true"
        environment["npm_config_audit"] = "false"
        environment["npm_config_fund"] = "false"
        environment["CI"] = "1"
        environment["VITE_API_BASE_URL"] = (
            f"http://127.0.0.1:{port}"
        )

        print(
            "\n=== 4. OFFLINE NPM CI ===",
            flush=True
        )

        install = subprocess.run(
            [
                npm, "ci", "--offline",
                "--ignore-scripts",
                "--no-audit", "--no-fund"
            ],
            cwd=frontend,
            env=environment,
            capture_output=True,
            text=True,
            errors="replace",
            timeout=180
        )

        if install.returncode:
            raise RuntimeError(
                "NPM_CI_FAILED:" +
                install.stderr[-1000:]
            )

        print("OFFLINE_NPM_CI=PASS", flush=True)

        print("\n=== 5. VITE BUILD ===", flush=True)

        build = subprocess.run(
            [npm, "run", "build"],
            cwd=frontend,
            env=environment,
            capture_output=True,
            text=True,
            errors="replace",
            timeout=180
        )

        if build.returncode:
            raise RuntimeError(
                "VITE_BUILD_FAILED:" +
                build.stderr[-1200:]
            )

        assert (
            frontend / "dist/index.html"
        ).is_file(), "BUILD_INDEX_MISSING"

        print("VITE_BUILD=PASS", flush=True)

        print(
            "\n=== 6. LOOPBACK SERVER ===",
            flush=True
        )

        thread = threading.Thread(
            target=server.serve_forever,
            daemon=True
        )
        thread.start()

        print("LOOPBACK_ONLY=PASS", flush=True)

        print(
            "\n=== 7. CHROME FAILURE AND RETRY ===",
            flush=True
        )

        browser = subprocess.run(
            [
                chrome,
                "--headless=new",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-background-networking",
                "--disable-extensions",
                "--disable-gpu",
                "--no-proxy-server",
                f"--user-data-dir={temp / 'chrome-profile'}",
                "--virtual-time-budget=35000",
                "--dump-dom",
                f"http://127.0.0.1:{port}/index.html"
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=85
        )

        print(
            "CHROME_EXIT=" +
            str(browser.returncode),
            flush=True
        )

        match = re.search(
            r'<pre id="obr-result"[^>]*>(.*?)</pre>',
            browser.stdout,
            re.DOTALL
        )

        if not match:
            print(
                "DOM_PREFIX=" +
                repr(browser.stdout[:900]),
                flush=True
            )
            raise RuntimeError(
                "BROWSER_REPORT_MISSING"
            )

        report = json.loads(
            html.unescape(match.group(1))
        )

        print(
            "BROWSER_PHASE=" +
            report.get("phase", "?"),
            flush=True
        )

        for item in report.get("checks", []):
            print(
                "CHECK_" + item["name"] + "=" +
                (
                    "PASS"
                    if item["pass"]
                    else "FAIL"
                ),
                flush=True
            )

        print(
            "CHECK_COUNT=" +
            str(len(report.get("checks", []))),
            flush=True
        )

        for call in report.get("calls", []):
            print(
                "API=" + call["method"] +
                " " + call["path"],
                flush=True
            )

        for error in report.get("errors", []):
            print(
                "BROWSER_ERROR=" + error,
                flush=True
            )

        if report.get("phase") != "PASS":
            print(
                "DOM_DIAG=" +
                json.dumps(
                    report.get("diagnostic", {}),
                    ensure_ascii=True
                )[:2500],
                flush=True
            )

            print(
                "CHROME_STDERR=" +
                repr(browser.stderr[-900:]),
                flush=True
            )

        assert browser.returncode == 0, (
            "CHROME_FAILED"
        )
        assert report.get("phase") == "PASS", (
            "BROWSER_TEST_FAILED"
        )
        assert all(
            item.get("pass") is True
            for item in report["checks"]
        ), "CHECK_FAILURE"

        print(
            "MINTRUD_API_FAILURE_RETRY_BROWSER=PASS",
            flush=True
        )

    except Exception as error:
        failure = str(error)

    finally:
        print(
            "\n=== 8. CLEANUP AND SOURCE POSTFLIGHT ===",
            flush=True
        )

        if server:
            if thread:
                server.shutdown()
                thread.join(timeout=10)
            server.server_close()

        if temp:
            try:
                shutil.rmtree(temp)
                print(
                    "TEMP_CLEANUP=PASS",
                    flush=True
                )
            except OSError as error:
                print(
                    "TEMP_CLEANUP_ERROR=" +
                    str(error),
                    flush=True
                )
                failure = (
                    failure or "TEMP_CLEANUP_FAILED"
                )

        try:
            after = state()

            changed = [
                relative
                for relative in protected
                if sha(ROOT / relative) !=
                baseline[relative]
            ]

            print(
                "SOURCE_HASH_CHANGED=" +
                str(len(changed)),
                flush=True
            )

            assert before == after, (
                "GIT_STATE_CHANGED"
            )
            assert not changed, (
                "SOURCE_HASH_CHANGED"
            )

            print(
                "SOURCE_POSTFLIGHT=PASS",
                flush=True
            )
            print(
                "GIT_POSTFLIGHT=PASS",
                flush=True
            )

        except Exception as error:
            print(
                "POSTFLIGHT_ERROR=" +
                str(error),
                flush=True
            )
            failure = (
                failure or "POSTFLIGHT_FAILED"
            )

    print("\n=== FINAL RESULT ===", flush=True)

    if failure:
        print("ERROR=" + failure, flush=True)
        print(
            "C4.4D.8AA.7D.1B.2G.2.1=FAIL",
            flush=True
        )
        print(
            "NO_AUTOMATIC_REPAIR=YES",
            flush=True
        )
        return 1

    print(
        "C4.4D.8AA.7D.1B.2G.2.1=PASS",
        flush=True
    )
    print(
        "API_MODE=SYNTHETIC_MOCK_ONLY",
        flush=True
    )
    print(
        "WORKTREE_MODIFIED=NO",
        flush=True
    )
    print(
        "NO_COMMIT_NO_DEPLOYMENT=PASS",
        flush=True
    )

    return 0

try:
    sys.exit(main())
except Exception as error:
    print(
        "UNEXPECTED_ERROR=" + str(error),
        flush=True
    )
    print(
        "C4.4D.8AA.7D.1B.2G.2.1=FAIL",
        flush=True
    )
    sys.exit(1)