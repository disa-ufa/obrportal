// Uses the built application and synthetic responses. API traffic never reaches a backend.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { preview } from "vite";

import { browserPath, chromium } from "./frdo_browser_runtime.mjs";

const enrollment = "a15cc510-d620-4fa7-8961-f1502bbfd137";
const course = "b15cc510-d620-4fa7-8961-f1502bbfd137";
const overview = `/account/courses/${enrollment}`;
const courseApi = "/api/v1" + overview;
const server = await preview({
  build: { outDir: process.env.UI_BUILD_DIR || "dist" },
  preview: { host: "127.0.0.1", port: 0 },
});
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({
  headless: true, executablePath: browserPath,
  args: ["--disable-background-networking", "--proxy-server=http://127.0.0.1:1"],
});
const screenshotDir = process.env.M4_SCREENSHOT_DIR;
if (screenshotDir) await mkdir(screenshotDir, { recursive: true });

function fixture(overrides = {}) {
  return {
    done: 0, status: "active", profile: {}, employment: {}, lessonError: "",
    readinessUnavailable: false, completedElsewhere: false, conflict: false, extraIssue: null, admin: false, policy: false,
    readinessReads: 0, finalPosts: 0, documentReads: 0, profilePatches: 0, employmentPatches: 0,
    ...overrides,
  };
}

function issue(field, owner = "learner") {
  return { field, code: `completion.${field}.missing`, resolvable_by: owner, message: "PRIVATE_FIXTURE_VALUE" };
}

function readiness(state) {
  if (state.completedElsewhere) {
    return { is_ready: false, status: "already_completed", missing_fields: [], invalid_fields: [],
      requires_administrator_action: false, policy_unresolved: false };
  }
  const missing = [];
  if (!state.profile.first_name) missing.push(issue("learner_profile.first_name"));
  if (!state.employment.profession_or_position) missing.push(issue("employer.profession_or_position"));
  if (state.admin) missing.push(issue("employer.reporting_scenario", "administrator"));
  const invalid = state.extraIssue ? [state.extraIssue] : [];
  const isReady = !missing.length && !invalid.length && !state.policy;
  return {
    is_ready: isReady, status: isReady ? "ready" : state.policy ? "policy_unresolved" : "incomplete",
    missing_fields: missing, invalid_fields: invalid,
    requires_administrator_action: state.admin, policy_unresolved: state.policy,
  };
}

function courseDetail(state) {
  return {
    enrollment_id: enrollment, course_id: course, course_title: "Учебный курс · синтетические данные",
    status: state.status, completed_at: state.status === "completed" ? "2026-11-17T12:30:00Z" : null,
    lessons_total: 2, lessons_completed: state.done, required_lessons_total: 2, required_lessons_completed: state.done,
    required_progress_percent: state.done * 50, progress_percent: state.done * 50,
    modules: [{
      id: "module-a", title: "Учебный модуль", lessons: [1, 2].map((number) => ({
        id: `lesson-${number}`, title: `Занятие ${number}`, is_required: true,
        is_completed: number <= state.done, content_type: "text", blocks: [],
      })),
    }],
  };
}

async function setupBrowser(width) {
  const height = { 390: 1240, 768: 1024, 1280: 1100 }[width];
  const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: "block" });
  await context.addInitScript(() => sessionStorage.setItem("obrportal_access_token", "synthetic-browser-session"));
  let state = fixture();
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    const path = url.pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, json: data });
    const method = request.method();
    if (path === "/api/v1/auth/me") {
      return json({ id: "synthetic-learner", full_name: "Учебный пользователь", email: "learner@example.invalid", roles: [] });
    }
    if (path === courseApi && method === "GET") return json(courseDetail(state));
    if (path === courseApi + "/completion-readiness") {
      state.readinessReads += 1;
      return state.readinessUnavailable ? json({ detail: "PRIVATE_FIXTURE_VALUE" }, 503) : json(readiness(state));
    }
    if (path === "/api/v1/account/profile/citizenship-options") return json(["643"]);
    if (path === "/api/v1/account/profile") {
      if (method === "PATCH") {
        state.profilePatches += 1;
        state.profile = { ...state.profile, ...request.postDataJSON() };
      }
      return json(state.profile);
    }
    if (path === courseApi + "/employment") {
      if (method === "PATCH") {
        state.employmentPatches += 1;
        state.employment = { ...state.employment, ...request.postDataJSON() };
      }
      return json({ requirement: "employer_required", can_edit: state.status !== "completed", ...state.employment });
    }
    if (path === "/api/v1/account/documents") {
      state.documentReads += 1;
      assert.equal(url.searchParams.get("enrollment_id"), enrollment);
      return json({ items: [{ id: "document-a", enrollment_id: enrollment, status: "draft" }] });
    }
    if (path.startsWith(courseApi + "/lessons/") && path.endsWith("/complete")) {
      if (state.lessonError) return json({ detail: { code: state.lessonError } }, 409);
      state.done += 1;
      const review = readiness(state);
      if (state.done === 2 && review.is_ready) state.status = "completed";
      return json({
        ...courseDetail(state), completion_readiness: state.done === 2 && !review.is_ready ? review : null,
      });
    }
    if (path === courseApi + "/complete" && method === "POST") {
      state.finalPosts += 1;
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (state.conflict) {
        state.extraIssue = issue("learner_profile.snils");
        return json({ detail: { code: "completion.profile_incomplete", ...readiness(state) } }, 409);
      }
      state.status = "completed";
      return json({ enrollment_id: enrollment, course_id: course, status: "completed" });
    }
    assert.equal(method, "GET", "Unexpected mutation in browser fixture");
    return json({});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const diagnostics = [];
  page.on("pageerror", (error) => diagnostics.push(error.message));
  page.on("console", (message) => {
    if (message.text().includes("PRIVATE_FIXTURE_VALUE")) diagnostics.push("Diagnostic exposed values");
  });
  return { context, page, diagnostics, get state() { return state; }, reset: (overrides) => { state = fixture(overrides); } };
}

const readyData = { profile: { first_name: "Учебный" }, employment: { profession_or_position: "Учебная должность" } };

async function screenshot(page, name) {
  if (!screenshotDir) return;
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: join(screenshotDir, name), animations: "disabled" });
}

async function assertNoHorizontalOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
}

try {
  for (const width of [390, 768, 1280]) {
    const stand = await setupBrowser(width);
    const { page, context } = stand;
    const panel = page.getByTestId("learner-course-finalization");
    const finalAction = page.getByTestId("learner-course-finalize-button");
    const lessonAction = page.getByTestId("learner-course-complete-lesson-button");
    const document = page.getByTestId("learner-course-completion-document-status");
    try {
      await page.goto(origin + overview + "/lessons/lesson-1");
      try {
        await lessonAction.waitFor();
      } catch (cause) {
        // Report only non-sensitive routing/test state, never tokens or profile values.
        const pathname = new URL(page.url()).pathname;
        const markers = await Promise.all([
          "public-route-loading-state",
          "learner-course-content-active-lesson",
          "learner-course-lesson-not-found",
          "learner-course-start-required",
        ].map(async (id) => [id, await page.getByTestId(id).count()]));
        throw new Error(`Lesson action missing: pathname=${pathname}, markers=${JSON.stringify(markers)}, pageErrors=${stand.diagnostics.length}`, { cause });
      }
      assert.equal(await panel.count(), 0);
      for (const [error, message] of [
        ["required_quiz_not_passed", "обязательные тесты"],
        ["required_assignment_not_completed", "обязательные задания"],
      ]) {
        stand.state.lessonError = error;
        await lessonAction.click();
        await page.getByTestId("learner-course-lesson-completion-error").getByText(message, { exact: false }).waitFor();
        assert.equal(stand.state.done, 0);
      }
      stand.state.lessonError = "";
      await lessonAction.click();
      await page.waitForURL("**/lesson-2");
      assert.equal(await panel.count(), 0);
      await lessonAction.click();
      await panel.getByText("Вы успешно прошли обучение.", { exact: false }).waitFor();
      assert.equal(new URL(page.url()).pathname, overview);
      assert.equal(stand.state.status, "active");
      assert.equal(stand.state.done, 2);
      assert.match(await page.getByTestId("learner-course-progress-summary").innerText(), /100%/);
      assert.equal(await lessonAction.count(), 0);
      assert.equal(await page.getByTestId("learner-course-lesson-completion-error").count(), 0);
      assert.equal(await finalAction.count(), 0);
      assert.equal(stand.state.documentReads, 0);
      assert.ok(await panel.getByText("Имя", { exact: true }).isVisible());
      assert.ok(await panel.getByText("Должность или профессия", { exact: true }).isVisible());
      await assertNoHorizontalOverflow(page);
      if (width === 390) await screenshot(page, "01-incomplete-390.png");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "learner-course-finalization-title");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), "Открыть профиль");
      await page.keyboard.press("Enter");
      await page.getByTestId("account-learner-profile").getByLabel("Имя", { exact: true }).fill("Учебный");
      await assertNoHorizontalOverflow(page);
      const beforeProfile = stand.state.readinessReads;
      await page.getByRole("button", { name: "Сохранить данные", exact: true }).click();
      await panel.getByText("Персональные данные сохранены в профиле слушателя.").waitFor();
      await page.getByTestId("learner-completion-return").click();
      await panel.getByText("Имя", { exact: true }).waitFor({ state: "hidden" });
      assert.equal(stand.state.profilePatches, 1);
      assert.ok(stand.state.readinessReads > beforeProfile);
      await panel.getByRole("link", { name: "Открыть сведения о работодателе" }).click();
      assert.equal(new URL(page.url()).pathname, overview);
      await panel.getByLabel("Должность или профессия").fill("Учебная должность");
      await assertNoHorizontalOverflow(page);
      const beforeEmployment = stand.state.readinessReads;
      await panel.getByRole("button", { name: "Сохранить сведения" }).click();
      await panel.getByText("Обязательные сведения заполнены.").waitFor();
      assert.equal(stand.state.employmentPatches, 1);
      assert.ok(stand.state.readinessReads > beforeEmployment);
      assert.equal(stand.state.finalPosts, 0);
      await page.getByTestId("learner-completion-return").click();
      await finalAction.waitFor();
      assert.equal(new URL(page.url()).search, "");
      assert.equal(await finalAction.isEnabled(), true);
      await assertNoHorizontalOverflow(page);
      if (width === 768) await screenshot(page, "02-ready-768.png");

      await finalAction.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Завершаем обучение…" }).waitFor();
      assert.equal(await finalAction.isDisabled(), true);
      await finalAction.evaluate((button) => button.click());
      await document.getByText("Документ сформирован и ожидает публикации.").waitFor();
      assert.equal(stand.state.finalPosts, 1);
      assert.equal(stand.state.documentReads, 1);
      assert.equal(await panel.count(), 0);
      assert.equal(await page.getByTestId("learner-course-course-completed").getAttribute("data-document-status"), "draft");
      if (width === 1280) await screenshot(page, "03-completed-1280.png");
      assert.doesNotMatch(await page.locator("body").innerText(), /PRIVATE_FIXTURE_VALUE/);
      assert.deepEqual(stand.diagnostics, []);

      if (width === 1280) {
        stand.reset({ ...readyData, done: 2, conflict: true });
        await page.goto(origin + overview);
        await finalAction.click();
        await panel.getByText("СНИЛС", { exact: true }).waitFor();
        await panel.getByRole("alert").getByText("Данные для завершения изменились.", { exact: false }).waitFor();
        await panel.getByText("Проверяем сведения для оформления…").waitFor({ state: "hidden" });
        assert.equal(await page.evaluate(() => document.activeElement?.id), "learner-course-finalization-title");
        assert.equal(stand.state.finalPosts, 1);
        assert.ok(stand.state.readinessReads >= 2);
        assert.equal(await finalAction.count(), 0);
        assert.match(await page.getByTestId("learner-course-progress-summary").innerText(), /100%/);

        stand.reset({ ...readyData, done: 2, admin: true, policy: true });
        await page.goto(origin + overview);
        await page.getByTestId("learner-completion-policy-unresolved").waitFor();
        assert.equal(await page.getByTestId("learner-completion-admin-action").isVisible(), true);
        assert.equal(await panel.getByRole("link").count(), 0);
        assert.equal(await finalAction.count(), 0);

        stand.reset({ ...readyData, done: 2, readinessUnavailable: true });
        await page.goto(origin + overview);
        await panel.getByRole("alert").getByText("Не удалось проверить готовность данных.").waitFor();
        assert.equal(await finalAction.count(), 0);
        stand.state.readinessUnavailable = false;
        await panel.getByRole("button", { name: "Повторить проверку" }).click();
        await finalAction.waitFor();

        stand.reset({ done: 2, completedElsewhere: true });
        await page.goto(origin + overview + "?completion=profile");
        await panel.getByText("Курс уже завершён.", { exact: false }).waitFor();
        assert.equal(await panel.getByText("Вы успешно прошли обучение.", { exact: false }).count(), 0);
        assert.equal(await page.getByTestId("account-learner-profile").count(), 0);
        assert.equal(stand.state.finalPosts, 0);

        stand.reset({ done: 2, status: "completed" });
        await page.goto(origin + overview);
        await document.getByText("Документ сформирован и ожидает публикации.").waitFor();
        assert.equal(await panel.count(), 0);
        assert.equal(stand.state.readinessReads, 0);
        assert.equal(stand.state.finalPosts, 0);

        stand.reset({ ...readyData, done: 1 });
        await page.goto(origin + overview + "/lessons/lesson-2");
        await lessonAction.click();
        await document.getByText("Документ сформирован и ожидает публикации.").waitFor();
        assert.equal(stand.state.status, "completed");
        assert.equal(stand.state.finalPosts, 0);
        assert.equal(stand.state.documentReads, 1);
        assert.doesNotMatch(await page.locator("body").innerText(), /PRIVATE_FIXTURE_VALUE/);
        assert.deepEqual(stand.diagnostics, []);
      }
      console.log(`M4_BROWSER_${width}=PASS`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
