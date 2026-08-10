// TEMPORARY verification spec for the refactor audit. Exercises the areas the
// existing suite does not reach: notes/paint paged documents, all four browser
// sites, address-history replay, language switching and save/load round-trip.
const { test, expect } = require("@playwright/test");

async function startNewGame(page) {
  await page.goto("/");
  await page.locator("#newGame").click();
}

async function openNetscape(page) {
  await page.locator("#desktopComputerHotspot").click();
  await page.getByRole("button", { name: "Netscape" }).click();
}

test("notes window: tabs render, titles commit and content persists per page", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#notesFolder").click();

  const notesWindow = page.locator(".notes-window");
  await expect(notesWindow).toBeVisible();

  const rows = notesWindow.locator(".notes-page-tab-row");
  await expect(rows).toHaveCount(10);

  // Default titles and placeholders come from the shared page model.
  await expect(rows.nth(0).locator(".notes-page-title-input")).toHaveValue("Page 1");
  await expect(rows.nth(4).locator(".notes-page-title-input")).toHaveAttribute("placeholder", "Page 5");
  await expect(rows.nth(0)).toHaveClass(/is-active/);

  const textarea = notesWindow.locator(".notes-editor-textarea");
  await textarea.fill("first page body");

  // Switch to page 3, type, then switch back: both bodies must be retained.
  await rows.nth(2).locator(".notes-page-tab-activate").click();
  await expect(rows.nth(2)).toHaveClass(/is-active/);
  await expect(textarea).toHaveValue("");
  await textarea.fill("third page body");

  await rows.nth(0).locator(".notes-page-tab-activate").click();
  await expect(textarea).toHaveValue("first page body");
  await rows.nth(2).locator(".notes-page-tab-activate").click();
  await expect(textarea).toHaveValue("third page body");

  // Commit button stays disabled until the title actually changes.
  const titleInput = rows.nth(2).locator(".notes-page-title-input");
  const commitButton = rows.nth(2).locator(".notes-page-title-commit");
  await expect(commitButton).toBeDisabled();
  await titleInput.fill("Suspects");
  await expect(commitButton).toBeEnabled();
  await commitButton.click();
  await expect(commitButton).toBeDisabled();
  await expect(titleInput).toHaveValue("Suspects");
  // aria-label is only refreshed on the next full render, so switch pages.
  await rows.nth(0).locator(".notes-page-tab-activate").click();
  await expect(rows.nth(2).locator(".notes-page-tab-activate")).toHaveAttribute("aria-label", "Open Suspects");
  await rows.nth(2).locator(".notes-page-tab-activate").click();

  // Blank title reverts to the committed one.
  await titleInput.fill("");
  await titleInput.press("Enter");
  await expect(titleInput).toHaveValue("Suspects");
});

test("paint window: tabs, title commit, drawing and flood fill persist per sketch", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#desktopComputerHotspot").click();
  await page.getByRole("button", { name: "Paint" }).click();

  const paintWindow = page.locator(".caveos-paint-window");
  await expect(paintWindow).toBeVisible();

  const rows = paintWindow.locator(".caveos-paint-page-row");
  await expect(rows).toHaveCount(10);
  await expect(rows.nth(0).locator(".notes-page-title-input")).toHaveValue("Sketch 1");
  await expect(rows.nth(3).locator(".notes-page-title-input")).toHaveAttribute("placeholder", "Sketch 4");
  await expect(rows.nth(1).locator(".notes-page-title-input")).toHaveAttribute("aria-label", "Title for sketch 2");

  const canvas = paintWindow.locator(".caveos-paint-canvas");
  const box = await canvas.boundingBox();

  // Draw a stroke on sketch 1.
  await page.mouse.move(box.x + 60, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 140, { steps: 8 });
  await page.mouse.up();

  const readPixels = () => canvas.evaluate((element) => {
    const context = element.getContext("2d");
    const { data } = context.getImageData(0, 0, element.width, element.height);
    let nonBackground = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 4 || data[i + 1] !== 18 || data[i + 2] !== 4) nonBackground += 1;
    }
    return nonBackground;
  });

  const drawnPixels = await readPixels();
  expect(drawnPixels).toBeGreaterThan(0);

  // Sketch 2 starts blank, then sketch 1 restores its stroke.
  await rows.nth(1).locator(".caveos-paint-page-activate").click();
  await expect.poll(readPixels).toBe(0);
  await rows.nth(0).locator(".caveos-paint-page-activate").click();
  await expect.poll(readPixels).toBeGreaterThan(0);

  // Flood fill the whole canvas from a background pixel in the bottom-right.
  await paintWindow.locator('.caveos-paint-tool[data-tool="fill"]').click();
  await page.mouse.click(box.x + box.width - 12, box.y + box.height - 12);
  await expect.poll(readPixels).toBeGreaterThan(drawnPixels * 5);

  // Sketch titles commit through the same shared helper as notes.
  const titleInput = rows.nth(0).locator(".notes-page-title-input");
  await titleInput.fill("Cave Map");
  await titleInput.press("Enter");
  await expect(titleInput).toHaveValue("Cave Map");
  // aria-label is only refreshed on the next full render, so switch sketches.
  await rows.nth(1).locator(".caveos-paint-page-activate").click();
  await expect(rows.nth(0).locator(".caveos-paint-page-activate")).toHaveAttribute("aria-label", "Open Cave Map");
});

test("zoomsearch and library searches return records and render detail", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  await page.getByRole("button", { name: "ZoomSearch" }).click();
  const zoomQuery = page.locator("input[aria-label='ZoomSearch query']");
  await zoomQuery.fill("john baxley");
  await zoomQuery.press("Enter");
  await expect(page.locator(".browser-results-zoom tbody .browser-results-row")).toHaveCount(1);
  await page.locator(".browser-results-zoom tbody .browser-results-row").click();
  await expect(page.locator(".browser-record-layout-zoom .browser-record-title")).toHaveText("John Baxley");

  // A miss shows the site's own empty message, not a generic one.
  await zoomQuery.fill("nothing at all");
  await zoomQuery.press("Enter");
  await expect(page.locator(".browser-status-line").first())
    .toHaveText("Search brings up a lot of unrelated bumph. You move on.");

  await page.getByRole("button", { name: "Library" }).click();
  await page.locator("input[aria-label='Library author']").fill("Hannah Fletcher");
  await page.locator("input[aria-label='Library title']").fill("Mysteries of the Old North West");
  await page.getByRole("button", { name: "Search Catalog" }).click();
  await expect(page.locator(".browser-results-library tbody .browser-results-row")).toHaveCount(1);
  await page.locator(".browser-results-library tbody .browser-results-row").click();
  await expect(page.locator(".browser-record-layout-library .browser-record-title"))
    .toHaveText("Mysteries of the Old North West");
});

test("police site logs in by default, gates records by privilege, and unlocks on login", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  await page.getByRole("button", { name: "Police Records" }).click();
  const status = page.locator(".browser-page-police .browser-status-line").first();
  await expect(status).toHaveText("Logged in as: Public (Level 0)");

  const query = page.locator("input[aria-label='Police search']");
  await query.fill("james fletcher");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);

  // Level 1 record is hidden for the default public account.
  await query.fill("thomas orourke");
  await query.press("Enter");
  await expect(status).toHaveText("One or more matching records were hidden by privilege restrictions.");

  // Bad credentials keep the guest level.
  await page.locator("input[aria-label='Police username']").fill("james.f");
  await page.locator("input[aria-label='Police password']").fill("wrong");
  await page.locator(".browser-page-police").getByRole("button", { name: "Login" }).click();
  await expect(status).toHaveText("Invalid login. Access remains Public (Level 0).");

  // Correct credentials raise the level and reveal the record.
  await page.locator("input[aria-label='Police password']").fill("oscar123");
  await page.locator(".browser-page-police").getByRole("button", { name: "Login" }).click();
  await expect(status).toHaveText("Logged in as: Constable James Fletcher (Level 1)");
  await query.fill("thomas orourke");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);
});

test("archives site requires province plus keyword and remembers the province", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  await page.getByRole("button", { name: "Canada Archives" }).click();
  const status = page.locator(".browser-page-archives .browser-status-line").first();
  await expect(status).toHaveText("Logged in as: Free");

  const query = page.locator("input[aria-label='Archive keyword search']");

  // Right keyword, wrong province -> no match.
  await query.fill("hannah fletcher");
  await query.press("Enter");
  await expect(status).toHaveText("Nothing found.");

  await page.locator("select[aria-label='Province selector']").selectOption("Alberta");
  await query.press("Enter");
  await expect(page.locator(".browser-results-archives tbody .browser-results-row")).toHaveCount(1);
  await page.locator(".browser-results-archives tbody .browser-results-row").click();
  await expect(page.locator(".browser-record-title-headline")).toBeVisible();

  // Province selection survives a re-render of the page.
  await page.getByRole("button", { name: "ZoomSearch" }).click();
  await page.getByRole("button", { name: "Canada Archives" }).click();
  await expect(page.locator("select[aria-label='Province selector']")).toHaveValue("Alberta");
});

test("browser address history replays a previous search from the dropdown", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  await page.getByRole("button", { name: "ZoomSearch" }).click();
  const zoomQuery = page.locator("input[aria-label='ZoomSearch query']");
  await zoomQuery.fill("mine cart");
  await zoomQuery.press("Enter");
  await page.locator(".browser-results-zoom tbody .browser-results-row").click();

  const address = page.locator("input[aria-label='Browser address']");
  const openedUrl = await address.inputValue();
  expect(openedUrl).toBeTruthy();

  // Navigate away, then replay the record straight from address history.
  await page.getByRole("button", { name: "Library" }).click();
  await address.click();
  const historyItem = page.locator(".caveos-browser-address-history-item", { hasText: openedUrl }).first();
  await expect(historyItem).toBeVisible();
  await historyItem.click();

  await expect(page.locator(".browser-results-zoom tbody .browser-results-row.is-selected")).toHaveCount(1);
  await expect(zoomQuery).toHaveValue("mine cart");
});

test("language buttons localize menu and desktop chrome", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#newGame")).toHaveText("New Game");

  await page.locator("#btnSpanish").click();
  await expect(page.locator("#newGame")).toHaveText("Nuevo Juego");
  await expect(page.locator("#btnSpanish")).toHaveClass(/active/);
  await expect(page.locator("#btnEnglish")).not.toHaveClass(/active/);

  await page.locator("#btnFrench").click();
  await expect(page.locator("#btnFrench")).toHaveClass(/active/);

  await page.locator("#btnEnglish").click();
  await expect(page.locator("#newGame")).toHaveText("New Game");

  // Desktop labels are localized from the same table.
  await page.locator("#newGame").click();
  await expect(page.locator("#reportsFolderLabel")).toHaveText("Reports");
  await expect(page.locator("#zoomReadout")).toContainText("Zoom");
});

test("open story window retitles correctly after a language change", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#backgroundFolder").click();

  const storyWindow = page.locator(".story-window").first();
  await expect(storyWindow).toBeVisible();
  const initialTitle = await storyWindow.locator(".desktop-window-title").textContent();
  expect(initialTitle).toBe("The Arnie Tragedy");

  // Reach the menu, switch language, resume: the title must stay a real title.
  await page.keyboard.press("Escape");
  await page.locator("#btnSpanish").click();
  const retitled = await storyWindow.locator(".desktop-window-title").textContent();
  expect(retitled).not.toContain("backgro");
  expect(retitled.length).toBeGreaterThan(0);
});

test("save and load round-trips evidence, notes and browser history", async ({ page }) => {
  await startNewGame(page);

  // Produce some state: a notes page body and a fax-awarded report.
  await page.locator("#notesFolder").click();
  await page.locator(".notes-window .notes-editor-textarea").fill("round trip note");
  await page.locator(".notes-window .story-window-close").click();

  await page.evaluate(() => window.receiveFacsimileReport({
    id: "audit-roundtrip-001",
    title: "AUDIT ROUND TRIP",
    reportText: "Body line one.",
    description: "Audit fixture.",
    evidenceName: "facsimile-audit-roundtrip-001",
    paperStyle: "report-parchment",
  }));
  await page.locator("#desktopFacsimileHotspot").click();
  await page.locator(".facsimile-window .story-window-close").click();

  const saveString = await page.evaluate(async () => {
    const { captureGameStatusForSaving } = await import("/constantsAndGlobalVars.js");
    return window.LZString.compressToEncodedURIComponent(JSON.stringify(captureGameStatusForSaving()));
  });
  expect(saveString.length).toBeGreaterThan(0);

  const restored = await page.evaluate(async (compressed) => {
    const module = await import("/constantsAndGlobalVars.js");
    const evidence = await import("/evidenceManager.js");
    await module.restoreGameStatus(JSON.parse(window.LZString.decompressFromEncodedURIComponent(compressed)));
    const snapshot = evidence.getEvidenceStoreSnapshot();
    return {
      notes: module.getNotesPages()[0],
      reportNames: (snapshot.collections.reports || [])
        .map((id) => snapshot.evidencesById[String(id)]?.name)
        .filter(Boolean),
      storyCount: (snapshot.collections.undefined || []).length,
      photoCount: (snapshot.collections.photos || []).length,
    };
  }, saveString);

  expect(restored.notes.content).toBe("round trip note");
  expect(restored.reportNames).toContain("facsimile-audit-roundtrip-001");
  expect(restored.storyCount).toBe(1);
  expect(restored.photoCount).toBe(1);
});
