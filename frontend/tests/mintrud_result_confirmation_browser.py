import os
import sys
import re
import json
import html
import shutil
import hashlib
import tempfile
import threading
import subprocess
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
        raise RuntimeError("GIT_FAILED:" + " ".join(args))
    return result.stdout

def state():
    return (
        git("branch", "--show-current").strip(),
        git("rev-parse", "HEAD").strip(),
        tuple(git("status", "--porcelain=v1",
                  "--untracked-files=all").splitlines()),
        git("diff", "--cached", "--name-only").strip(),
        git("diff", "--check"),
    )

def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1048576), b""):
            h.update(block)
    return h.hexdigest().upper()

def chrome_path():
    candidates = [
        Path(os.environ.get("PROGRAMFILES", "C:/Program Files"))
        / "Google/Chrome/Application/chrome.exe",
        Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)"))
        / "Google/Chrome/Application/chrome.exe",
        Path(os.environ.get("LOCALAPPDATA", "C:/Users/Public"))
        / "Google/Chrome/Application/chrome.exe",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    return shutil.which("chrome.exe") or shutil.which("chrome")

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

HTML = r'''<!doctype html>
<html lang="ru">
<head><meta charset="UTF-8"></head>
<body>
<div id="root"></div>
<pre id="obr-result">{"phase":"HTML_ONLY"}</pre>
<script type="module" src="/src/obr-confirm-worktree.js"></script>
</body>
</html>'''

JS = r'''
const batchId = "synthetic-confirm-worktree-001";
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

const items = ids.map((id, i) => ({
  id: `synthetic-item-${i + 1}`,
  obligation_id: id,
  position: i + 1,
  record_count: 1,
  result_status: null,
  external_id: null,
  errors_json: []
}));

const d = {
  phase: "INITIAL",
  checks: [],
  calls: [],
  confirmations: [],
  errors: [],
  allowConfirmation: false,
  payload: null,
  batch
};

function phase(value) {
  d.phase = value;
  document.getElementById("obr-result").textContent =
    JSON.stringify(d);
}

function check(name, condition) {
  const pass = Boolean(condition);
  d.checks.push({name, pass});
  if (!pass) throw new Error(`CHECK_FAILED:${name}`);
}

async function waitFor(fn, timeout = 10000) {
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
  byId(`admin-registries-mintrud-batch-result-form-${batchId}`);

const openButton = () =>
  byId(`admin-registries-mintrud-batch-results-open-${batchId}`);

const row = id =>
  byId(`admin-registries-mintrud-batch-result-item-${id}`);

const postCount = () =>
  d.calls.filter(call =>
    call.method === "POST" &&
    call.path === `${detailPath}/result`
  ).length;

const detailCount = () =>
  d.calls.filter(call =>
    call.method === "GET" &&
    call.path === detailPath
  ).length;

function setControl(node, value) {
  if (!node) throw new Error("CONTROL_MISSING");

  const proto = node.tagName === "SELECT"
    ? HTMLSelectElement.prototype
    : node.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

  Object.getOwnPropertyDescriptor(proto, "value")
    .set.call(node, value);

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

window.addEventListener("error", event => {
  d.errors.push(`WINDOW_ERROR:${event.message}`);
  phase("WINDOW_ERROR");
});

window.addEventListener("unhandledrejection", event => {
  d.errors.push(`REJECTION:${String(event.reason)}`);
  phase("REJECTION");
});

window.confirm = message => {
  d.confirmations.push(String(message));
  return d.allowConfirmation;
};

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
  const raw = typeof input === "string" ? input : input.url;
  const url = new URL(raw, window.location.href);
  const method = String(
    options.method ||
    (typeof input === "object" ? input.method : "GET")
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
    "/api/v1/admin/mintrud/obligations",
  ].includes(path)) {
    return respond([]);
  }

  if (method === "GET" && path === base) {
    return respond([{...batch}]);
  }

  if (method === "GET" && path === detailPath) {
    return respond(detail());
  }

  if (method === "POST" && path === `${detailPath}/result`) {
    const payload = JSON.parse(options.body || "{}");
    d.payload = payload;

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
        errors: ["Invalid identifier", "Duplicate record"]
      },
      {
        obligation_id: ids[2],
        result_status: "correction_required",
        external_id: null,
        errors: ["Missing field X"]
      }
    ];

    if (
      batch.reconciled_at ||
      JSON.stringify(payload.items) !== JSON.stringify(expected)
    ) {
      d.errors.push("RESULT_PAYLOAD_MISMATCH");
      return respond({detail: "invalid results"}, 422);
    }

    payload.items.forEach((result, i) => {
      items[i].result_status = result.result_status;
      items[i].external_id = result.external_id;
      items[i].errors_json = [...result.errors];
    });

    batch.reconciled_at = "2026-10-18T11:00:00Z";
    return respond(detail());
  }

  d.errors.push(`UNEXPECTED_API:${method} ${path}`);
  return respond({detail: "unexpected request"}, 403);
};

try {
  phase("STARTED");

  const React = await import("react");
  const ReactDOM = await import("react-dom/client");
  const page = await import("./pages/AdminRegistriesPage.jsx");

  check(
    "COMPONENT_EXPORTED",
    typeof page.AdminRegistriesPage === "function"
  );

  ReactDOM.createRoot(
    document.getElementById("root")
  ).render(React.createElement(page.AdminRegistriesPage));

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

  const form = await waitFor(formNode);
  check("FORM_FOUND", Boolean(form));
  check("DETAIL_FETCHED", detailCount() === 1);

  const rows = ids.map(row);
  check("THREE_ROWS_FOUND", rows.every(Boolean));

  check(
    "ALL_UNSELECTED",
    rows.every(r => r.querySelector("select")?.value === "")
  );

  check(
    "RUSSIAN_PLACEHOLDER",
    rows.every(r =>
      r.querySelector("select")?.options[0]
        ?.textContent.trim() === "Выберите результат"
    )
  );

  const submit = () =>
    formNode()?.querySelector('button[type="submit"]');

  check(
    "EMPTY_SUBMIT_DISABLED",
    Boolean(submit()) && submit().disabled
  );

  form.requestSubmit();
  await new Promise(resolve => setTimeout(resolve, 150));

  check("EMPTY_POST_BLOCKED", postCount() === 0);
  check("EMPTY_NO_DIALOG", d.confirmations.length === 0);

  setControl(rows[0].querySelector("select"), "accepted");

  const inputA = await waitFor(() =>
    rows[0].querySelector("input")
  );
  check("ACCEPTED_INPUT_FOUND", Boolean(inputA));
  setControl(inputA, "  SYN-REC-001  ");

  setControl(rows[1].querySelector("select"), "rejected");

  const errorsB = await waitFor(() =>
    rows[1].querySelector("textarea")
  );
  check("REJECTED_INPUT_FOUND", Boolean(errorsB));

  setControl(
    errorsB,
    " Invalid identifier \n Duplicate record \n"
  );

  check("PARTIAL_SUBMIT_DISABLED", submit().disabled);
  form.requestSubmit();
  await new Promise(resolve => setTimeout(resolve, 150));

  check("PARTIAL_POST_BLOCKED", postCount() === 0);
  check("PARTIAL_NO_DIALOG", d.confirmations.length === 0);

  setControl(
    rows[2].querySelector("select"),
    "correction_required"
  );

  const errorsC = await waitFor(() =>
    rows[2].querySelector("textarea")
  );
  check("CORRECTION_INPUT_FOUND", Boolean(errorsC));
  setControl(errorsC, " Missing field X \n");

  check(
    "ALL_RESULTS_EXPLICIT",
    rows[0].querySelector("select").value === "accepted" &&
    rows[1].querySelector("select").value === "rejected" &&
    rows[2].querySelector("select").value ===
      "correction_required"
  );

  check(
    "COMPLETE_SUBMIT_ENABLED",
    Boolean(await waitFor(() =>
      submit() && !submit().disabled
    ))
  );

  d.allowConfirmation = false;
  form.requestSubmit();

  check(
    "CANCEL_DIALOG_SHOWN",
    Boolean(await waitFor(() =>
      d.confirmations.length === 1
    ))
  );

  const message = d.confirmations[0];

  check(
    "CONFIRMATION_TITLE",
    message.includes("Подтвердить окончательную сверку")
  );
  check(
    "CONFIRMATION_WARNING",
    message.includes("изменить результаты")
  );
  check("CONFIRMATION_TOTAL", message.includes("Всего записей: 3"));
  check("CONFIRMATION_ACCEPTED", message.includes("Принято: 1"));
  check("CONFIRMATION_REJECTED", message.includes("Отклонено: 1"));
  check(
    "CONFIRMATION_CORRECTION",
    message.includes("Требуют исправления: 1")
  );

  check("CANCEL_NO_POST", postCount() === 0);
  check("CANCEL_NO_RECONCILIATION", batch.reconciled_at === null);
  check(
    "CANCEL_FORM_EDITABLE",
    rows.every(r => !r.querySelector("select").disabled)
  );

  d.allowConfirmation = true;
  form.requestSubmit();

  check(
    "SECOND_DIALOG_SHOWN",
    Boolean(await waitFor(() =>
      d.confirmations.length === 2
    ))
  );
  check(
    "CONFIRMATION_STABLE",
    d.confirmations[1] === message
  );

  check(
    "POST_EXACTLY_ONCE",
    Boolean(await waitFor(() => postCount() === 1))
  );
  check(
    "RECONCILED",
    Boolean(await waitFor(() => batch.reconciled_at))
  );

  check("THREE_POSTED", d.payload?.items?.length === 3);
  check(
    "ACCEPTED_ID_TRIMMED",
    d.payload.items[0].external_id === "SYN-REC-001"
  );
  check(
    "REJECTED_ERRORS",
    JSON.stringify(d.payload.items[1].errors) ===
    JSON.stringify(["Invalid identifier", "Duplicate record"])
  );
  check(
    "CORRECTION_ERRORS",
    JSON.stringify(d.payload.items[2].errors) ===
    JSON.stringify(["Missing field X"])
  );

  check(
    "RECONCILED_VIEW_SETTLED",
    Boolean(await waitFor(() => {
      const currentForm = formNode();

      if (!currentForm || !batch.reconciled_at) {
        return false;
      }

      const controls = [
        ...currentForm.querySelectorAll(
          "select,input,textarea"
        )
      ];

      return (
        controls.length === 6 &&
        controls.every(control => control.disabled) &&
        !currentForm.querySelector(
          'button[type="submit"]'
        )
      );
    }, 12000))
  );

  check(
    "READONLY_AFTER_RECONCILIATION",
    Boolean(await waitFor(() => {
      const controls = [
        ...formNode().querySelectorAll("select,input,textarea")
      ];
      return (
        controls.length === 6 &&
        controls.every(control => control.disabled)
      );
    }))
  );

  check(
    "SUBMIT_HIDDEN",
    Boolean(formNode()) && !submit()
  );

  check("CLOSE_BUTTON_PRESENT", Boolean(openButton()));
  openButton().click();

  check(
    "FORM_CLOSED",
    Boolean(await waitFor(() => !formNode()))
  );

  const fetchedBefore = detailCount();
  openButton().click();

  check(
    "REOPEN_FETCHES_DETAILS",
    Boolean(await waitFor(() =>
      detailCount() > fetchedBefore
    ))
  );

  check(
    "REOPEN_FORM_VISIBLE",
    Boolean(await waitFor(formNode))
  );

  check(
    "REOPEN_RESULTS_PRESERVED",
    row(ids[0]).querySelector("select").value === "accepted" &&
    row(ids[1]).querySelector("select").value === "rejected" &&
    row(ids[2]).querySelector("select").value ===
      "correction_required"
  );

  check(
    "REOPEN_READONLY",
    Boolean(await waitFor(() => {
      const controls = [
        ...formNode().querySelectorAll("select,input,textarea")
      ];
      return (
        controls.length === 6 &&
        controls.every(control => control.disabled) &&
        !submit()
      );
    }))
  );

  check("NO_EXTRA_POST", postCount() === 1);
  check("NO_MOCK_ERRORS", d.errors.length === 0);

  phase("PASS");
} catch (error) {
  d.errors.push(`TEST_ERROR:${String(error.message || error)}`);
  phase("FAIL");
} finally {
  d.diagnostic = {
    confirmCount: d.confirmations.length,
    postCount: postCount(),
    reconciledAt: batch.reconciled_at,
    formPresent: Boolean(formNode())
  };
  phase(d.phase);
}
'''

def main():
    print(
        "=== C4.4D.8AA.7D.1B.2G.3 WORKTREE CONFIRMATION REGRESSION ===",
        flush=True
    )

    print("\n=== 1. STRICT SOURCE PREFLIGHT ===", flush=True)

    before = state()
    branch, head, status, staged, diffcheck = before

    assert branch == "local/m2231", "BRANCH_MISMATCH"
    assert not staged, "STAGED_CHANGES"
    assert not diffcheck, "DIFF_CHECK_FAILED"

    unexpected = [
        entry for entry in status
        if not (
            entry.startswith(" M ") or
            entry.startswith("?? ")
        )
    ]

    assert not unexpected, "UNEXPECTED_GIT_STATUS"
    assert (ROOT / PAGE).is_file(), "PAGE_MISSING"

    modified = {
        entry[3:] for entry in status
        if entry.startswith(" M ")
    }

    untracked = {
        entry[3:] for entry in status
        if entry.startswith("?? ")
    }

    protected = sorted(
        modified | untracked | set(EXTRA) | {PAGE}
    )

    assert all(
        (ROOT / relative).is_file()
        for relative in protected
    ), "PROTECTED_SOURCE_MISSING"

    baseline = {
        relative: sha(ROOT / relative)
        for relative in protected
    }

    print("STRICT_PREFLIGHT=PASS", flush=True)
    print(
        "PROTECTED_FILES=" + str(len(protected)),
        flush=True
    )
    print(
        "PAGE_BASELINE_SHA256=" + baseline[PAGE],
        flush=True
    )

    temp = None
    server = None
    thread = None
    failure = None

    try:
        npm = shutil.which("npm.cmd") or shutil.which("npm")

        chrome_candidates = [
            Path(os.environ.get("PROGRAMFILES", "C:/Program Files"))
            / "Google/Chrome/Application/chrome.exe",
            Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)"))
            / "Google/Chrome/Application/chrome.exe",
            Path(os.environ.get("LOCALAPPDATA", "C:/Users/Public"))
            / "Google/Chrome/Application/chrome.exe",
        ]

        chrome = next(
            (str(p) for p in chrome_candidates if p.is_file()),
            shutil.which("chrome.exe") or shutil.which("chrome")
        )

        assert npm, "NPM_NOT_FOUND"
        assert chrome, "CHROME_NOT_FOUND"

        result = subprocess.run(
            [
                "git", "--no-optional-locks", "-C", str(ROOT),
                "ls-files", "-z", "--", "frontend"
            ],
            capture_output=True
        )
        assert result.returncode == 0, "FRONTEND_LIST_FAILED"

        files = [
            item.decode("utf-8")
            for item in result.stdout.split(b"\0") if item
        ]
        assert files, "FRONTEND_FILES_EMPTY"

        print("\n=== 2. ISOLATED COPY OF WORKTREE ===",
              flush=True)

        temp = Path(tempfile.mkdtemp(prefix="obr_2f3_"))
        frontend = temp / "frontend"

        for relative in files:
            source = ROOT / relative
            target = temp / relative
            assert source.is_file(), "SOURCE_NOT_FOUND:" + relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)

        assert sha(temp / PAGE) == baseline[PAGE], (
            "COPIED_PAGE_HASH_MISMATCH"
        )

        (frontend / "index.html").write_text(
            HTML, encoding="utf-8"
        )
        (frontend / "src/obr-confirm-worktree.js").write_text(
            JS, encoding="utf-8"
        )

        print("FRONTEND_FILES_COPIED=" + str(len(files)),
              flush=True)
        print("UPDATED_WORKTREE_COPIED=PASS", flush=True)
        print("TEMP_REACT_PATCH=NONE", flush=True)

        handler = partial(
            Handler, directory=str(frontend / "dist")
        )

        server = ThreadingHTTPServer(
            ("127.0.0.1", 0), handler
        )
        port = server.server_address[1]

        env = os.environ.copy()
        env["npm_config_offline"] = "true"
        env["npm_config_audit"] = "false"
        env["npm_config_fund"] = "false"
        env["CI"] = "1"
        env["VITE_API_BASE_URL"] = f"http://127.0.0.1:{port}"

        print("\n=== 3. OFFLINE NPM CI ===", flush=True)

        install = subprocess.run(
            [
                npm, "ci", "--offline", "--ignore-scripts",
                "--no-audit", "--no-fund"
            ],
            cwd=frontend, env=env,
            capture_output=True, text=True,
            errors="replace", timeout=180
        )

        if install.returncode:
            raise RuntimeError(
                "OFFLINE_NPM_CI_FAILED:" + install.stderr[-1000:]
            )

        print("OFFLINE_NPM_CI=PASS", flush=True)

        print("\n=== 4. VITE BUILD ===", flush=True)

        build = subprocess.run(
            [npm, "run", "build"],
            cwd=frontend, env=env,
            capture_output=True, text=True,
            errors="replace", timeout=180
        )

        if build.returncode:
            raise RuntimeError(
                "VITE_BUILD_FAILED:" + build.stderr[-1200:]
            )

        assert (frontend / "dist/index.html").is_file(), (
            "BUILD_INDEX_MISSING"
        )

        print("VITE_BUILD=PASS", flush=True)

        print("\n=== 5. LOOPBACK SERVER ===", flush=True)

        thread = threading.Thread(
            target=server.serve_forever, daemon=True
        )
        thread.start()

        print("LOOPBACK_ONLY=PASS", flush=True)

        print("\n=== 6. CHROME WORKTREE CONFIRMATION ===",
              flush=True)

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
            capture_output=True, text=True,
            encoding="utf-8", errors="replace",
            timeout=85
        )

        print("CHROME_EXIT=" + str(browser.returncode),
              flush=True)

        match = re.search(
            r'<pre id="obr-result"[^>]*>(.*?)</pre>',
            browser.stdout, re.DOTALL
        )

        if not match:
            print("DOM_PREFIX=" + repr(browser.stdout[:900]),
                  flush=True)
            raise RuntimeError("BROWSER_REPORT_MISSING")

        report = json.loads(html.unescape(match.group(1)))

        print("BROWSER_PHASE=" + report.get("phase", "?"),
              flush=True)

        for item in report.get("checks", []):
            print(
                "CHECK_" + item["name"] + "=" +
                ("PASS" if item["pass"] else "FAIL"),
                flush=True
            )

        print(
            "CHECK_COUNT=" + str(len(report.get("checks", []))),
            flush=True
        )

        for call in report.get("calls", []):
            print(
                "API=" + call["method"] + " " + call["path"],
                flush=True
            )

        for error in report.get("errors", []):
            print("BROWSER_ERROR=" + error, flush=True)

        if report.get("phase") != "PASS":
            print(
                "DOM_DIAG=" + json.dumps(
                    report.get("diagnostic", {}),
                    ensure_ascii=True
                )[:2000],
                flush=True
            )

        assert browser.returncode == 0, "CHROME_FAILED"
        assert report.get("phase") == "PASS", "BROWSER_TEST_FAILED"
        assert len(report.get("checks", [])) >= 35, (
            "INSUFFICIENT_CHECK_COUNT"
        )
        assert all(
            check.get("pass") is True
            for check in report["checks"]
        ), "CHECK_FAILED"

        print("WORKTREE_CONFIRMATION_BROWSER=PASS",
              flush=True)

    except Exception as error:
        failure = str(error)

    finally:
        print("\n=== 7. CLEANUP AND SOURCE POSTFLIGHT ===",
              flush=True)

        if server:
            if thread:
                server.shutdown()
                thread.join(timeout=10)
            server.server_close()

        if temp:
            try:
                shutil.rmtree(temp)
                print("TEMPORARY_RESOURCES_REMOVED=PASS",
                      flush=True)
            except OSError as error:
                print("TEMP_CLEANUP_ERROR=" + str(error),
                      flush=True)
                failure = failure or "TEMP_CLEANUP_FAILED"

        try:
            after = state()

            changed = [
                path for path in protected
                if sha(ROOT / path) != baseline[path]
            ]

            print("SOURCE_HASH_CHANGED=" + str(len(changed)),
                  flush=True)

            assert before == after, "GIT_STATE_CHANGED"
            assert not changed, "SOURCE_CHANGED"

            print("SOURCE_POSTFLIGHT=PASS", flush=True)
            print("GIT_POSTFLIGHT=PASS", flush=True)

        except Exception as error:
            print("POSTFLIGHT_ERROR=" + str(error),
                  flush=True)
            failure = failure or "POSTFLIGHT_FAILED"

    print("\n=== FINAL RESULT ===", flush=True)

    if failure:
        print("ERROR=" + failure, flush=True)
        print("C4.4D.8AA.7D.1B.2G.3=FAIL", flush=True)
        print("NO_AUTOMATIC_REPAIR=YES", flush=True)
        return 1

    print("C4.4D.8AA.7D.1B.2G.3=PASS", flush=True)
    print("TEST_TARGET=UPDATED_WORKTREE_REACT", flush=True)
    print("API_MODE=SYNTHETIC_MOCK_ONLY", flush=True)
    print("WORKTREE_MODIFIED=NO", flush=True)
    print("NO_COMMIT_NO_DEPLOYMENT=PASS", flush=True)
    return 0

try:
    sys.exit(main())
except Exception as error:
    print("UNEXPECTED_ERROR=" + str(error), flush=True)
    print("C4.4D.8AA.7D.1B.2G.3=FAIL", flush=True)
    sys.exit(1)