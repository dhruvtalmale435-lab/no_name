import { test, expect } from "@playwright/test";
const password = "BrowserTestPassword!";
async function login(page, email = "admin@demo.local") {
  await page.goto("/");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Coordination overview" }),
  ).toBeVisible();
}

test("Readable typography, contrast, journey navigation and narrow-screen sign out", async ({
  page,
}) => {
  await page.goto("/");
  await page.screenshot({
    path: "docs/screenshots/refreshed-login.png",
    fullPage: true,
  });
  await login(page);
  const audit = await page.evaluate(() => {
    const rgb = (s) =>
      s
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
    const luminance = (rgb) =>
      rgb
        .map((v) => {
          const n = v / 255;
          return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
        })
        .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
    const findings = [];
    for (const selector of [
      ".eyebrow",
      ".section-copy",
      ".stat-card small",
      ".table-link",
      "th",
      "td small",
      ".demo-banner",
      ".badge",
      ".primary",
    ])
      for (const e of document.querySelectorAll(selector)) {
        if (!e.getClientRects().length) continue;
        const style = getComputedStyle(e);
        let background = "rgb(255,255,255)";
        for (let ancestor = e; ancestor; ancestor = ancestor.parentElement) {
          const color = getComputedStyle(ancestor).backgroundColor;
          if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
            background = color;
            break;
          }
        }
        const a = luminance(rgb(style.color)),
          b = luminance(rgb(background));
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        if (parseFloat(style.fontSize) < 12 || ratio < 4.5)
          findings.push({
            selector,
            text: e.textContent.trim().slice(0, 50),
            size: style.fontSize,
            contrast: Math.round(ratio * 100) / 100,
          });
      }
    return findings;
  });
  expect(audit).toEqual([]);
  await page.screenshot({
    path: "docs/screenshots/refreshed-overview.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Explore Compare & coordinate", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Overlap review", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  for (const width of [850, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Case registry", exact: true }),
    ).toBeVisible();
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll("body *")]
        .filter(
          (e) =>
            e.getBoundingClientRect().right > innerWidth + 1 &&
            !e.closest(".table-wrap"),
        )
        .map((e) => ({
          tag: e.tagName,
          className: e.className,
          right: Math.round(e.getBoundingClientRect().right),
        }))
        .slice(0, 10),
    }));
    expect(layout, JSON.stringify(layout)).toMatchObject({ pageWidth: width });
  }
  await page.screenshot({
    path: "docs/screenshots/refreshed-mobile.png",
    fullPage: true,
  });
});
test("Login, true dashboard counts, role-aware navigation, refresh and logout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const data = await (await page.request.get("/api/analytics")).json();
  await expect(page.locator(".stat-card").first().locator("strong")).toHaveText(
    String(data.total),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Coordination overview" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/overview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in to workspace" }),
  ).toBeVisible();
  expect((await page.request.get("/api/cases")).status()).toBe(401);
  expect(errors).toEqual([]);
});
test("Register through UI, alias matching, persistent search result, assign, update and timeline", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Register case", exact: true })
    .click();
  const d = page.getByRole("dialog", { name: "Register a complaint / case" });
  await d
    .getByLabel("Complaint title", { exact: true })
    .fill("Browser verified examination fees");
  await d.getByLabel("Institution name", { exact: true }).fill("NVIT");
  await d.getByLabel("Region", { exact: true }).selectOption("Northern");
  await d.getByLabel("Bureau", { exact: true }).selectOption("RB");
  await d.getByLabel("Category", { exact: true }).selectOption("Fees");
  await d
    .getByLabel("Alleged event period", { exact: true })
    .fill("2026 autumn");
  await d
    .getByLabel("Source reference", { exact: true })
    .fill("BROWSER-CREATE");
  await d
    .getByLabel("Allegations / description", { exact: true })
    .fill(
      "Students allege excess examination fees collected during the autumn semester.",
    );
  await d.getByRole("button", { name: "Register & check overlap" }).click();
  await expect(d).not.toBeVisible();
  await page
    .getByRole("button", { name: "Case registry", exact: true })
    .click();
  await page.getByLabel("Search cases").fill("BROWSER-CREATE");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.reload();
  await page
    .getByRole("button", { name: "Case registry", exact: true })
    .click();
  await page.getByLabel("Search cases").fill("BROWSER-CREATE");
  await page
    .getByRole("button", {
      name: "Browser verified examination fees",
      exact: true,
    })
    .click();
  const detail = page.getByRole("dialog");
  await expect(
    detail.getByText("Verified name / alias and region", { exact: true }),
  ).toBeVisible();
  await detail
    .getByLabel("Status", { exact: true })
    .selectOption("Under Process");
  await detail
    .getByLabel("Assigned officer", { exact: true })
    .selectOption("rb");
  await detail
    .getByLabel("Action / justification", { exact: true })
    .fill("Browser test confirms persistent scrutiny action");
  await detail
    .getByRole("button", { name: "Save action", exact: true })
    .click();
  await expect(
    detail.getByText("Case updated: Pending → Under Process", { exact: true }),
  ).toBeVisible();
  await expect(
    detail.getByLabel("Assigned officer", { exact: true }),
  ).toHaveValue("rb");
  await detail.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Institutions", exact: true }).click();
  await page
    .getByRole("button", {
      name: /North Valley Institute of Technology DEMO-1001/,
    })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Institution profile" })
      .getByRole("button", {
        name: "Browser verified examination fees",
        exact: true,
      }),
  ).toBeVisible();
});
test("Explainable overlap review persists in both source timelines; independent issue visible", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: /^Overlap review/ }).click();
  const card = page
    .locator(".overlap-card")
    .filter({ hasText: "Unauthorized semester examination fees" })
    .filter({ hasText: "Excess examination charges under scrutiny" });
  await card.getByRole("button", { name: "Compare & review" }).click();
  const d = page.getByRole("dialog", { name: "Compare & coordinate" });
  await expect(
    d.getByText("Same alleged event period", { exact: true }),
  ).toBeVisible();
  await d
    .getByLabel("Decision justification")
    .fill("Both bureaus should coordinate on the shared examination circular");
  await d.getByLabel("Responsible officer", { exact: true }).selectOption("rb");
  await d.getByLabel("Coordination deadline").fill("2026-12-31");
  await d
    .getByLabel("Coordination action", { exact: true })
    .fill("Exchange evidence and decide the lead bureau");
  await d.getByRole("button", { name: "Record review & coordination" }).click();
  await expect(d).not.toBeVisible();
  await expect(
    card.getByText("Related — coordination required", { exact: true }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Complete task" }).click();
  await expect(card.getByRole("button", { name: "Reopen task" })).toBeVisible();
  await card
    .getByRole("button", {
      name: "Unauthorized semester examination fees",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Coordination review", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  const independent = page
    .locator(".overlap-card")
    .filter({ hasText: "Faculty salary payments delayed" })
    .first();
  await expect(
    independent.getByText("Institution activity", { exact: true }),
  ).toBeVisible();
});
test("Read-only monitoring rejects direct writes; responsive layout and reports export", async ({
  page,
}) => {
  await login(page, "viewer@demo.local");
  await expect(
    page.getByRole("button", { name: "Register case", exact: true }),
  ).toHaveCount(0);
  const response = await page.request.post("/api/cases", { data: {} });
  expect(response.status()).toBe(403);
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "By bureau", exact: true }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Export cases" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("bureausetu-cases.csv");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("Failed API request presents recovery feedback and preserves usable navigation", async ({
  page,
}) => {
  await login(page);
  await page.route("**/api/analytics*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Test service temporarily unavailable" }),
    }),
  );
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Test service temporarily unavailable",
  );
  await page.unroute("**/api/analytics*");
  await page.getByRole("button", { name: "Dismiss error" }).click();
  await page.getByRole("button", { name: "Refresh data" }).click();
  await page
    .getByRole("button", { name: "Case registry", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "All cases" })).toBeVisible();
});
test("Server network failure never silently switches to the browser demo", async ({
  page,
}) => {
  await login(page);
  await page.route("**/api/analytics*", (route) =>
    route.abort("connectionfailed"),
  );
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Cannot connect to the server",
  );
  await expect(page.locator(".demo-banner")).toContainText(
    "Real database and workflows",
  );
  await page.unroute("**/api/analytics*");
  await page.getByRole("button", { name: "Dismiss error" }).click();
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(
    page.getByRole("heading", { name: "Coordination overview" }),
  ).toBeVisible();
});
test("CSV import, evidence attachment, invalid-form recovery and multi-user visibility", async ({
  page,
  browser,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Imports & policies", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import records", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Import bureau source records",
  });
  await dialog.getByLabel("Import format").selectOption("csv");
  await dialog.getByLabel("Import source").selectOption("RB import");
  const headers =
    "title,description,institutionName,permanentId,region,category,period,bureau,receivedAt,sourceId";
  const received = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const csv =
    headers +
    '\n"CSV browser complaint","Students allege an unauthorized autumn fee collection.",NVIT,,Northern,Fees,2026 autumn,RB,' +
    received +
    ",BROWSER-CSV";
  await dialog.getByLabel("Records", { exact: true }).fill(csv);
  await dialog.getByRole("button", { name: "Validate & import" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(/1 created \/ 0 skipped/)).toBeVisible();
  await page
    .getByRole("button", { name: "Case registry", exact: true })
    .click();
  await page.getByLabel("Search cases").fill("BROWSER-CSV");
  await page
    .getByRole("button", { name: "CSV browser complaint", exact: true })
    .click();
  const detail = page.getByRole("dialog");
  await detail.locator("input[type=file]").setInputFiles({
    name: "evidence.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic supporting evidence from the browser test"),
  });
  await detail.getByRole("button", { name: "Attach", exact: true }).click();
  await expect(
    detail.getByRole("link", { name: "evidence.txt" }),
  ).toBeVisible();
  await detail.getByLabel("Status", { exact: true }).selectOption("Disposed");
  await detail
    .getByLabel("Action / justification")
    .fill("Invalid direct disposal must be rejected");
  await detail
    .getByRole("button", { name: "Save action", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid status transition",
  );
  await expect(detail.getByLabel("Action / justification")).toHaveValue(
    "Invalid direct disposal must be rejected",
  );
  await detail
    .getByLabel("Status", { exact: true })
    .selectOption("Under Process");
  await detail
    .getByRole("button", { name: "Save action", exact: true })
    .click();
  await expect(
    detail.getByText("Case updated: Pending → Under Process", { exact: true }),
  ).toBeVisible();
  await detail.getByRole("button", { name: "Close dialog" }).click();
  const observer = await browser.newContext();
  const other = await observer.newPage();
  await login(other, "pgrc@demo.local");
  await other
    .getByRole("button", { name: "Case registry", exact: true })
    .click();
  await other.getByLabel("Search cases").fill("BROWSER-CSV");
  await expect(other.locator("tbody tr")).toHaveCount(1);
  await expect(
    other.locator("tbody tr").getByText("Under Process", { exact: true }),
  ).toBeVisible();
  await other
    .getByRole("button", { name: "CSV browser complaint", exact: true })
    .click();
  await expect(
    other.getByRole("button", { name: "Save action", exact: true }),
  ).toHaveCount(0);
  await observer.close();
});
