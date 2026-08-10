const { test, expect } = require("@playwright/test");
const fs = require("fs/promises");
const path = require("path");

async function scrollReportToBottom(page, reportViewport) {
  await reportViewport.hover();

  let previousTop = -1;
  for (let index = 0; index < 40; index += 1) {
    const currentTop = await reportViewport.evaluate((element) => element.scrollTop);
    if (currentTop === previousTop && currentTop > 0) {
      break;
    }

    previousTop = currentTop;
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(50);
  }

  await expect.poll(async () => reportViewport.evaluate((element) => {
    const remaining = element.scrollHeight - element.clientHeight - element.scrollTop;
    return Math.max(0, Math.round(remaining));
  })).toBeLessThanOrEqual(2);
}

async function expectPhotoMagnifierAligned(photoPaper, position) {
  await photoPaper.hover({ position });

  const result = await photoPaper.evaluate((element, hoverPosition) => {
    const image = element.querySelector('.photos-carousel-image');
    const lens = element.closest('.photos-window')?.querySelector('.evidence-magnifier-lens');
    const previewSurface = lens?.querySelector('.evidence-magnifier-preview-surface');
    if (!(image instanceof HTMLImageElement) || !(lens instanceof HTMLElement) || !(previewSurface instanceof HTMLElement)) {
      return null;
    }

    const hostRect = element.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const naturalWidth = image.naturalWidth || 0;
    const naturalHeight = image.naturalHeight || 0;
    if (!naturalWidth || !naturalHeight || !imageRect.width || !imageRect.height) {
      return null;
    }

    const scale = Math.min(imageRect.width / naturalWidth, imageRect.height / naturalHeight);
    const contentWidth = naturalWidth * scale;
    const contentHeight = naturalHeight * scale;
    const offsetX = (imageRect.width - contentWidth) / 2;
    const offsetY = (imageRect.height - contentHeight) / 2;
    const imageBoxOffsetX = imageRect.left - hostRect.left;
    const imageBoxOffsetY = imageRect.top - hostRect.top;
    const lensRadius = lens.getBoundingClientRect().width / 2;
    const zoomScale = 3;

    const imageSpaceX = hoverPosition.x - imageBoxOffsetX;
    const imageSpaceY = hoverPosition.y - imageBoxOffsetY;
    const localX = Math.min(Math.max(imageSpaceX - offsetX, 0), contentWidth);
    const localY = Math.min(Math.max(imageSpaceY - offsetY, 0), contentHeight);
    const rawTranslateX = lensRadius - (localX * zoomScale);
    const rawTranslateY = lensRadius - (localY * zoomScale);
    const minTranslateX = lens.getBoundingClientRect().width - (contentWidth * zoomScale);
    const minTranslateY = lens.getBoundingClientRect().height - (contentHeight * zoomScale);
    const expectedX = Math.min(Math.max(rawTranslateX, minTranslateX), 0);
    const expectedY = Math.min(Math.max(rawTranslateY, minTranslateY), 0);

    const transform = previewSurface.style.transform || '';
    const match = transform.match(/translate\(([-0-9.]+)px, ([-0-9.]+)px\) scale\(([-0-9.]+)\)/);
    if (!match) {
      return { transform };
    }

    return {
      actualX: Number(match[1]),
      actualY: Number(match[2]),
      actualScale: Number(match[3]),
      expectedX,
      expectedY,
    };
  }, position);

  expect(result).not.toBeNull();
  expect(result.actualScale).toBeCloseTo(3, 4);
  expect(Math.abs(result.actualX - result.expectedX)).toBeLessThanOrEqual(4);
  expect(Math.abs(result.actualY - result.expectedY)).toBeLessThanOrEqual(4);
}

async function hoverSourceTextAndAssertLens(page, sourceTextLocator, lensLocator) {
  await expect(sourceTextLocator).toBeVisible();

  const hoverPoint = await sourceTextLocator.evaluate((element, textNeedle) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const textContent = String(textNode.textContent || "");
      const matchIndex = textContent.indexOf(textNeedle);
      if (matchIndex >= 0) {
        const range = document.createRange();
        range.setStart(textNode, matchIndex);
        range.setEnd(textNode, matchIndex + textNeedle.length);
        const rect = Array.from(range.getClientRects()).find((candidate) => candidate.width > 0 && candidate.height > 0);
        if (rect) {
          return {
            x: rect.left + Math.min(rect.width * 0.5, Math.max(4, rect.width - 4)),
            y: rect.top + Math.min(rect.height * 0.5, Math.max(4, rect.height - 4)),
          };
        }
      }
      textNode = walker.nextNode();
    }

    return null;
  }, "Spencer's injuries.");

  expect(hoverPoint).not.toBeNull();
  await page.mouse.move(hoverPoint.x, hoverPoint.y);
  await expect(lensLocator).toBeVisible();

  const lensVisibility = await page.evaluate(({ lensSelector, textNeedle }) => {
    const lens = document.querySelector(lensSelector);
    if (!(lens instanceof HTMLElement)) {
      return { found: false, visible: false, scaled: false };
    }

    const lensRect = lens.getBoundingClientRect();
    const walker = document.createTreeWalker(lens, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const textContent = String(textNode.textContent || "");
      const matchIndex = textContent.indexOf(textNeedle);
      if (matchIndex >= 0) {
        const range = document.createRange();
        range.setStart(textNode, matchIndex);
        range.setEnd(textNode, matchIndex + textNeedle.length);
        const rects = Array.from(range.getClientRects());
        const visibleRect = rects.find((rect) => rect.width > 0 && rect.height > 0 && rect.bottom > lensRect.top && rect.top < lensRect.bottom && rect.right > lensRect.left && rect.left < lensRect.right);
        if (!visibleRect) {
          return { found: true, visible: false, scaled: false };
        }

        const sourceMatches = Array.from(document.querySelectorAll('.report-document-text'));
        let sourceHeight = 0;
        for (const match of sourceMatches) {
          const sourceText = String(match.textContent || "");
          const sourceIndex = sourceText.indexOf(textNeedle);
          if (sourceIndex >= 0 && match.firstChild) {
            const sourceRange = document.createRange();
            let offset = 0;
            const sourceWalker = document.createTreeWalker(match, NodeFilter.SHOW_TEXT);
            let sourceNode = sourceWalker.nextNode();
            while (sourceNode) {
              const nodeText = String(sourceNode.textContent || "");
              const nextOffset = offset + nodeText.length;
              if (sourceIndex >= offset && sourceIndex + textNeedle.length <= nextOffset) {
                sourceRange.setStart(sourceNode, sourceIndex - offset);
                sourceRange.setEnd(sourceNode, sourceIndex - offset + textNeedle.length);
                const sourceRect = Array.from(sourceRange.getClientRects()).find((rect) => rect.width > 0 && rect.height > 0);
                if (sourceRect) {
                  sourceHeight = sourceRect.height;
                }
                break;
              }
              offset = nextOffset;
              sourceNode = sourceWalker.nextNode();
            }
          }
          if (sourceHeight > 0) {
            break;
          }
        }

        return {
          found: true,
          visible: true,
          scaled: sourceHeight > 0 ? visibleRect.height > sourceHeight * 1.8 : true,
        };
      }
      textNode = walker.nextNode();
    }

    return { found: false, visible: false, scaled: false };
  }, {
    lensSelector: ".reports-window .evidence-magnifier-lens",
    textNeedle: "Spencer's injuries.",
  });

  expect(lensVisibility.found).toBe(true);
  expect(lensVisibility.visible).toBe(true);
  expect(lensVisibility.scaled).toBe(true);
}

test("report magnifier renders scrolled bottom content and captures evidence", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.locator("#newGame").click();

  await page.locator("#reportsFolder").click();
  const reportsWindow = page.locator(".reports-window");
  await expect(reportsWindow).toBeVisible();

  const magnifierToggle = reportsWindow.locator(".evidence-magnifier-toggle");
  await magnifierToggle.click();
  await expect(magnifierToggle).toHaveAttribute("aria-pressed", "true");

  const reportViewport = reportsWindow.locator(".report-document-content").first();
  const lens = reportsWindow.locator(".evidence-magnifier-lens");

  await reportViewport.hover({ position: { x: 120, y: 120 } });
  await expect(lens).toBeVisible();

  await reportViewport.hover({ position: { x: 160, y: 260 } });
  await expect(lens).toBeVisible();

  await scrollReportToBottom(page, reportViewport);

  const sourceText = reportViewport.getByText("Spencer's injuries.");
  await hoverSourceTextAndAssertLens(page, sourceText, lens);

  const artifactsDir = path.resolve(testInfo.project.outputDir, "..", "docs", "tests", "artifacts");
  await fs.mkdir(artifactsDir, { recursive: true });
  const evidencePath = path.join(artifactsDir, "report-magnifier-bottom-spencers-injuries.png");
  await page.screenshot({ path: evidencePath, fullPage: false });
});

test("photo magnifier still renders at center and edge positions", async ({ page }) => {
  await page.goto("/");
  await page.locator("#newGame").click();

  await page.locator("#photosFolder").click();
  const photosWindow = page.locator(".photos-window");
  await expect(photosWindow).toBeVisible();

  const magnifierToggle = photosWindow.locator(".evidence-magnifier-toggle");
  await magnifierToggle.click();
  await expect(magnifierToggle).toHaveAttribute("aria-pressed", "true");

  const photoPaper = photosWindow.locator(".photo-paper-wrap");
  const lens = photosWindow.locator(".evidence-magnifier-lens");

  const lensStyle = await lens.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    const preview = element.querySelector(".evidence-magnifier-preview");
    return {
      borderRadius: computed.borderRadius,
      previewInset: preview ? window.getComputedStyle(preview).inset : "",
    };
  });
  expect(lensStyle.borderRadius).toBe("50%");
  expect(lensStyle.previewInset).toBe("4px");

  await photoPaper.hover({ position: { x: 80, y: 80 } });
  await expect(lens).toBeVisible();
  await expect(lens.locator(".evidence-magnifier-photo-preview")).toBeVisible();
  await expectPhotoMagnifierAligned(photoPaper, { x: 220, y: 160 });

  await photoPaper.hover({ position: { x: 20, y: 20 } });
  await expect(lens).toBeVisible();
  await expect(lens.locator(".evidence-magnifier-photo-preview")).toBeVisible();
  await expectPhotoMagnifierAligned(photoPaper, { x: 70, y: 130 });
});

test("honey dew standalone page awards two photo evidences", async ({ page }) => {
  const consoleEntries = [];
  page.on("console", async (message) => {
    const values = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => null)));
    consoleEntries.push({ text: message.text(), values });
  });

  await page.goto("/");
  await page.locator("#newGame").click();
  await page.locator("#desktopComputerHotspot").click();

  await page.getByRole("button", { name: "Netscape" }).click();
  const browserAddress = page.locator("input[aria-label='Browser address']");
  await browserAddress.fill("http://honeydewcavingclub.com");
  await browserAddress.press("Enter");
  await browserAddress.evaluate((element) => element.blur());

  await page.keyboard.press("-");
  await expect(page.locator(".debug-window")).toBeVisible();

  await page.locator(".debug-window .debug-window-button").click();

  await expect.poll(async () => page.locator(".notification-host .game-notification-reward").count()).toBe(2);

  const rewardTexts = await page.locator(".notification-host .game-notification-reward").allTextContents();
  expect(rewardTexts.every((text) => text.includes("Evidence unlocked in your Evidence folder!"))).toBe(true);

  await expect.poll(async () => consoleEntries.some((entry) => entry.text.includes("Evidence store in memory (raw):"))).toBe(true);
  const evidenceDebugEntry = consoleEntries.find((entry) => entry.text.includes("Evidence store in memory (raw):"));
  expect(evidenceDebugEntry).toBeTruthy();

  const rawStore = evidenceDebugEntry?.values?.[1];
  const photoEntries = Array.isArray(rawStore?.collections?.photos)
    ? rawStore.collections.photos
        .map((id) => rawStore?.evidencesById?.[String(id)])
        .filter(Boolean)
    : [];

  expect(photoEntries.map((entry) => entry.name)).toEqual(
    expect.arrayContaining([
      "standalone-honeydewcavingclub-team",
      "standalone-honeydewcavingclub",
    ])
  );
});

test("facsimile desktop object receives report and awards evidence once", async ({ page }) => {
  const consoleEntries = [];
  page.on("console", async (message) => {
    const values = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => null)));
    consoleEntries.push({ text: message.text(), values });
  });

  await page.goto("/");
  await page.locator("#newGame").click();

  await page.locator("#desktopFacsimileHotspot").click();
  const facsimileWindow = page.locator(".facsimile-window");
  await expect(facsimileWindow).toBeVisible();
  await expect(facsimileWindow.getByText("NO NEW MESSAGES")).toBeVisible();
  await facsimileWindow.locator(".story-window-close").click();
  await expect(facsimileWindow).toBeHidden();

  const idleSignal = await page.locator("#desktopFacsimile .facsimile-alert-light").evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      animationName: computed.animationName,
    };
  });
  expect(idleSignal.animationName === "none" || idleSignal.animationName === "").toBe(true);

  const queued = await page.evaluate(() => window.receiveFacsimileReport({
    id: "fax-night-shift-001",
    title: "CAVERN DISPATCH // NIGHT SHIFT",
    reportText: "Timestamp 02:17\nGenerator room access attempted by unknown party.",
    description: "Fax received from security relay.",
    evidenceName: "facsimile-night-shift-001",
  }));
  expect(queued).toBe(true);

  await expect(page.locator("#desktopFacsimile")).toHaveClass(/has-pending-message/);
  const pendingSignal = await page.locator("#desktopFacsimile .facsimile-alert-light").evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      animationName: computed.animationName,
    };
  });
  expect(pendingSignal.animationName).toContain("facsimileSignalBlink");

  await page.locator("#desktopFacsimileHotspot").click();
  await expect(facsimileWindow).toBeVisible();
  await expect(facsimileWindow.getByText("CAVERN DISPATCH // NIGHT SHIFT")).toBeVisible();
  await expect(facsimileWindow.getByText("Generator room access attempted by unknown party.")).toBeVisible();
  await facsimileWindow.locator(".story-window-close").click();

  await expect.poll(async () => page.locator(".notification-host .game-notification-reward").count()).toBe(1);
  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);
  const consumedSignal = await page.locator("#desktopFacsimile .facsimile-alert-light").evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      animationName: computed.animationName,
    };
  });
  expect(consumedSignal.animationName === "none" || consumedSignal.animationName === "").toBe(true);

  await page.locator("#desktopFacsimileHotspot").click();
  await expect(facsimileWindow.getByText("NO NEW MESSAGES")).toBeVisible();
  await facsimileWindow.locator(".story-window-close").click();
  await expect.poll(async () => page.locator(".notification-host .game-notification-reward").count()).toBe(1);

  await page.keyboard.press("-");
  await expect(page.locator(".debug-window")).toBeVisible();
  await page.locator(".debug-window .debug-window-button").click();

  await expect.poll(async () => consoleEntries.some((entry) => entry.text.includes("Evidence store in memory (raw):"))).toBe(true);
  const evidenceDebugEntry = consoleEntries
    .filter((entry) => entry.text.includes("Evidence store in memory (raw):"))
    .at(-1);
  expect(evidenceDebugEntry).toBeTruthy();

  const rawStore = evidenceDebugEntry?.values?.[1];
  const reportEntries = Array.isArray(rawStore?.collections?.reports)
    ? rawStore.collections.reports
        .map((id) => rawStore?.evidencesById?.[String(id)])
        .filter(Boolean)
    : [];

  const faxReports = reportEntries.filter((entry) => entry.name === "facsimile-night-shift-001");
  expect(faxReports).toHaveLength(1);
  expect(faxReports[0].reportText).toContain("Generator room access attempted by unknown party.");
});

test("facsimile queues and transfers five unique reports", async ({ page }) => {
  const consoleEntries = [];
  page.on("console", async (message) => {
    const values = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => null)));
    consoleEntries.push({ text: message.text(), values });
  });

  await page.goto("/");
  await page.locator("#newGame").click();

  const faxPayloads = Array.from({ length: 5 }, (_, index) => {
    const number = index + 1;
    return {
      id: `fax-batch-${number}`,
      title: `BATCH FAX ${number}`,
      reportText: `Batch transmission ${number}\nTunnel marker ${number} logged.`,
      description: `Fax batch description ${number}`,
      evidenceName: `facsimile-batch-${number}`,
    };
  });

  const queueResults = await page.evaluate((payloads) => payloads.map((payload) => window.receiveFacsimileReport(payload)), faxPayloads);
  expect(queueResults).toEqual([true, true, true, true, true]);

  await expect(page.locator("#desktopFacsimile")).toHaveClass(/has-pending-message/);

  for (const payload of faxPayloads) {
    await page.locator("#desktopFacsimileHotspot").click();
    const facsimileWindow = page.locator(".facsimile-window");
    await expect(facsimileWindow).toBeVisible();
    await expect(facsimileWindow.getByText(payload.title)).toBeVisible();
    await expect(facsimileWindow.getByText(`Tunnel marker ${payload.id.split("-").at(-1)} logged.`)).toBeVisible();
    await facsimileWindow.locator(".story-window-close").click();
  }

  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);

  await page.keyboard.press("-");
  await expect(page.locator(".debug-window")).toBeVisible();
  await page.locator(".debug-window .debug-window-button").click();

  await expect.poll(async () => consoleEntries.some((entry) => entry.text.includes("Evidence store in memory (raw):"))).toBe(true);
  const evidenceDebugEntry = consoleEntries
    .filter((entry) => entry.text.includes("Evidence store in memory (raw):"))
    .at(-1);
  expect(evidenceDebugEntry).toBeTruthy();

  const rawStore = evidenceDebugEntry?.values?.[1];
  const reportEntries = Array.isArray(rawStore?.collections?.reports)
    ? rawStore.collections.reports
        .map((id) => rawStore?.evidencesById?.[String(id)])
        .filter(Boolean)
    : [];

  const faxReports = reportEntries.filter((entry) => String(entry?.name || "").startsWith("facsimile-batch-"));
  expect(faxReports).toHaveLength(5);

  faxPayloads.forEach((payload) => {
    const match = faxReports.find((entry) => entry.name === payload.evidenceName);
    expect(match).toBeTruthy();
    expect(match.reportText).toContain(payload.reportText.split("\n")[1]);
  });
});

test("facsimile next cached message button advances queue and transfers evidence", async ({ page }) => {
  const consoleEntries = [];
  page.on("console", async (message) => {
    const values = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => null)));
    consoleEntries.push({ text: message.text(), values });
  });

  await page.goto("/");
  await page.locator("#newGame").click();

  const faxPayloads = [
    {
      id: "fax-next-1",
      title: "NEXT BUTTON REPORT 1",
      reportText: "Line A1\nLine B1",
      description: "Next button flow one",
      evidenceName: "facsimile-next-1",
    },
    {
      id: "fax-next-2",
      title: "NEXT BUTTON REPORT 2",
      reportText: "Line A2\nLine B2",
      description: "Next button flow two",
      evidenceName: "facsimile-next-2",
    },
  ];

  const queueResults = await page.evaluate((payloads) => payloads.map((payload) => window.receiveFacsimileReport(payload)), faxPayloads);
  expect(queueResults).toEqual([true, true]);

  await page.locator("#desktopFacsimileHotspot").click();
  const facsimileWindow = page.locator(".facsimile-window");
  await expect(facsimileWindow).toBeVisible();
  await expect(facsimileWindow.getByText("NEXT BUTTON REPORT 1")).toBeVisible();

  const nextButton = facsimileWindow.locator(".facsimile-next-message-button");
  await expect(nextButton).toBeEnabled();

  await nextButton.click();
  await expect(facsimileWindow.getByText("NEXT BUTTON REPORT 2")).toBeVisible();
  await expect(nextButton).toBeDisabled();

  await facsimileWindow.locator(".story-window-close").click();
  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);

  await page.keyboard.press("-");
  await expect(page.locator(".debug-window")).toBeVisible();
  await page.locator(".debug-window .debug-window-button").click();

  await expect.poll(async () => consoleEntries.some((entry) => entry.text.includes("Evidence store in memory (raw):"))).toBe(true);
  const evidenceDebugEntry = consoleEntries
    .filter((entry) => entry.text.includes("Evidence store in memory (raw):"))
    .at(-1);
  expect(evidenceDebugEntry).toBeTruthy();

  const rawStore = evidenceDebugEntry?.values?.[1];
  const reportEntries = Array.isArray(rawStore?.collections?.reports)
    ? rawStore.collections.reports
        .map((id) => rawStore?.evidencesById?.[String(id)])
        .filter(Boolean)
    : [];

  const transferred = reportEntries.filter((entry) => String(entry?.name || "").startsWith("facsimile-next-"));
  expect(transferred).toHaveLength(2);
});