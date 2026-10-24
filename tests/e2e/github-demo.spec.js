import { test, expect } from "@playwright/test";
const password = "LocalDemo-26264!";
async function enter(page, guided = false) {
  await page.goto("/?demo=1");
  await expect(page.getByLabel("Email address")).toHaveValue(
    "admin@demo.local",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    password,
  );
  await expect(page.locator(".judge-access")).toContainText(password);
  await page
    .getByRole("button", {
      name: guided ? "Start guided demo" : "Sign in to workspace",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: guided ? "Guided demo" : "Coordination overview",
      exact: true,
    }),
  ).toBeVisible();
}
async function register(page, sourceId = "JUDGE-DEMO-001") {
  await page
    .getByRole("button", { name: "Register case", exact: true })
    .click();
  const d = page.getByRole("dialog", { name: "Register a complaint / case" });
  await d
    .getByLabel("Complaint title", { exact: true })
    .fill("Judge demo examination fee complaint");
  await d.getByLabel("Institution name", { exact: true }).fill("NVIT");
  await d.getByLabel("Region", { exact: true }).selectOption("Northern");
  await d.getByLabel("Bureau", { exact: true }).selectOption("RB");
  await d.getByLabel("Category", { exact: true }).selectOption("Fees");
  await d
    .getByLabel("Alleged event period", { exact: true })
    .fill("2026 autumn");
  await d.getByLabel("Source reference", { exact: true }).fill(sourceId);
  await d
    .getByLabel("Allegations / description", { exact: true })
    .fill(
      "Students allege unauthorized examination fees collected during the autumn semester.",
    );
  await d.getByRole("button", { name: "Register & check overlap" }).click();
  await expect(d).not.toBeVisible();
}
test("GitHub demo prefilled access, guided walkthrough and all institutions/screens render without errors", async ({
  page,
}) => {
  const errors = [],
    apiRequests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/"))
      apiRequests.push(r.url());
  });
  await page.goto("/?demo=1");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    password,
  );
  await page.screenshot({
    path: "docs/screenshots/judge-demo-login.png",
    fullPage: true,
  });
  await enter(page, true);
  await expect(
    page.getByRole("heading", { name: "Show the coordination story" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open institutions", exact: true })
    .click();
  await expect(page.locator(".institution-card")).toHaveCount(6);
  const north = page.locator(".institution-card").filter({
    has: page.getByRole("heading", {
      name: "North Valley Institute of Technology",
      exact: true,
    }),
  });
  await expect(north).toContainText("DEMO-1001");
  await expect(north).toContainText("PGRC");
  await expect(north).toContainText("RB");
  await north.click();
  const profile = page.getByRole("dialog", { name: "Institution profile" });
  await expect(profile.getByText("NVIT", { exact: false })).toBeVisible();
  await expect(profile.locator("tbody tr")).toHaveCount(3);
  await profile
    .getByRole("button", {
      name: "Unauthorized semester examination fees",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Chronological action history" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  for (const name of [
    "Overview",
    "Case registry",
    "Institutions",
    "Overlap review",
    "Reports",
    "Notifications",
    "Imports & policies",
    "Guided demo",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: name === "Overview" ? "Coordination overview" : name,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Workspace could not render", { exact: true }),
    ).toHaveCount(0);
  }
  await page.screenshot({
    path: "docs/screenshots/judge-demo-guide.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Institutions", exact: true }).click();
  await page.screenshot({
    path: "docs/screenshots/judge-demo-institutions.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Coordination overview" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(apiRequests).toEqual([]);
});
test("GitHub demo registration, institution filter, case updates and refresh retain coherent records", async ({
  page,
}) => {
  await enter(page);
  await register(page);
  await expect(page.locator(".stat-card").first().locator("strong")).toHaveText(
    "14",
  );
  await page
    .getByRole("button", { name: "Case registry", exact: true })
    .click();
  await page.getByLabel("Search cases").fill("JUDGE-DEMO-001");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Judge demo examination fee complaint",
      exact: true,
    })
    .click();
  let d = page.getByRole("dialog");
  await expect(
    d.getByText("Verified name / alias and region", { exact: true }),
  ).toBeVisible();
  await d.getByLabel("Status", { exact: true }).selectOption("Under Process");
  await d.getByLabel("Assigned officer", { exact: true }).selectOption("rb");
  await d
    .getByLabel("Action / justification")
    .fill("Judge demonstration scrutiny has started");
  await d.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(
    d.getByText("Case updated: Pending → Under Process", { exact: true }),
  ).toBeVisible();
  await d.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(page.locator(".stat-card").first().locator("strong")).toHaveText(
    "14",
  );
  await page.getByRole("button", { name: "Institutions", exact: true }).click();
  await page.getByLabel("Search institutions").fill("NVIT");
  await expect(page.locator(".institution-card")).toHaveCount(1);
  await page.locator(".institution-card").click();
  await expect(page.getByRole("dialog").locator("tbody tr")).toHaveCount(4);
});
test("GitHub demo coordination, history, task completion and CSV download use real demo state", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Overlap review", exact: true })
    .click();
  const pair = page
    .locator(".overlap-card")
    .filter({ hasText: "Unauthorized semester examination fees" })
    .filter({ hasText: "Excess examination charges under scrutiny" });
  await pair.getByRole("button", { name: "Compare & review" }).click();
  const d = page.getByRole("dialog", { name: "Compare & coordinate" });
  await d
    .getByLabel("Decision justification")
    .fill("Coordinate review of the shared examination fee circular");
  await d.getByLabel("Responsible officer", { exact: true }).selectOption("rb");
  await d.getByLabel("Coordination deadline").fill("2026-12-31");
  await d
    .getByLabel("Coordination action", { exact: true })
    .fill("Share the fee circular and agree lead bureau");
  await d.getByRole("button", { name: "Record review & coordination" }).click();
  await expect(d).not.toBeVisible();
  await expect(
    pair.getByText("Related — coordination required", { exact: true }),
  ).toBeVisible();
  await pair.getByRole("button", { name: "Complete task" }).click();
  await expect(pair.getByRole("button", { name: "Reopen task" })).toBeVisible();
  await pair
    .getByRole("button", {
      name: "Unauthorized semester examination fees",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Coordination review", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Export cases" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("bureausetu-cases.csv");
});
test("GitHub demo reset is scoped to synthetic tab data and sign-out restores prefilled login", async ({
  page,
}) => {
  await enter(page);
  await register(page, "JUDGE-RESET");
  await page.getByRole("button", { name: "Guided demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset browser demo", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Synthetic browser demo restored",
  );
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.locator(".stat-card").first().locator("strong")).toHaveText(
    "13",
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    password,
  );
  await expect(page.getByLabel("Email address")).toHaveValue(
    "admin@demo.local",
  );
});
test("GitHub demo imports, evidence downloads and unresolved institution verification work end to end", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Imports & policies", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import records", exact: true })
    .click();
  let d = page.getByRole("dialog");
  await d.getByLabel("Import format").selectOption("csv");
  await d.getByLabel("Import source").selectOption("RB import");
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await d
    .getByLabel("Records", { exact: true })
    .fill(
      'title,description,institutionName,region,category,period,bureau,receivedAt,sourceId\n"Imported judge evidence case","Students report unauthorized fees during the autumn semester.",NVIT,Northern,Fees,2026 autumn,RB,' +
        date +
        ",JUDGE-CSV-001",
    );
  await d.getByRole("button", { name: "Validate & import" }).click();
  await expect(d).not.toBeVisible();
  await expect(
    page.getByText("1 created / 0 skipped", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Case registry", exact: true })
    .click();
  await page.getByLabel("Search cases").fill("JUDGE-CSV-001");
  await page
    .getByRole("button", { name: "Imported judge evidence case", exact: true })
    .click();
  d = page.getByRole("dialog");
  await d
    .locator("input[type=file]")
    .setInputFiles({
      name: "judge-evidence.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Synthetic evidence for the public judge demo"),
    });
  await d.getByRole("button", { name: "Attach", exact: true }).click();
  await expect(
    d.getByRole("link", { name: "judge-evidence.txt" }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    d.getByRole("link", { name: "judge-evidence.txt" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("judge-evidence.txt");
  await d.getByRole("button", { name: "Close dialog" }).click();
  await page.getByLabel("Search cases").fill("Identity");
  await page
    .getByRole("button", {
      name: "Institution identity needs verification",
      exact: true,
    })
    .click();
  d = page.getByRole("dialog");
  await d
    .getByLabel("Verified institution", { exact: true })
    .selectOption("north-valley");
  await d
    .getByLabel("Verification justification")
    .fill("Confirmed institution using the original synthetic correspondence");
  await d.getByRole("button", { name: "Confirm identity" }).click();
  await expect(d.getByText("Officer verified", { exact: true })).toBeVisible();
  await expect(d.getByText("Identity verified", { exact: true })).toBeVisible();
});
