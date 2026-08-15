// ECHOTRAIL — the CaveOS media library.
//
// Everything here is driven the way a player drives it: a real click on the
// desktop icon, real clicks on the column headers to sort, a real double click
// on a row to play it, real clicks on the transport. Nothing calls an opener or
// a playback function directly, because a test that did would still pass with
// the click wiring torn out.
//
// Playback is asserted through the audio manager's own state rather than by
// listening for sound, which no browser automation can do. That is a real
// limitation and it is worth being precise about what it does and does not
// prove: it proves the player's gesture reached the audio layer and changed its
// state, and it does not prove a speaker made a noise. The gesture half — the
// half that actually breaks — is genuine throughout.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { startNewGame, openComputer } = require("../../support/game-helpers");
const {
  CAVEOS_LANGUAGES,
  closeCaveOsWindow,
  selectCaveOsTheme,
  startNewGameInLanguage,
  switchLanguageMidGame,
} = require("../../support/caveos-helpers");

// The six authored tracks, and the titles they are shown under. Duplicated from
// echotrailManager.js on purpose: this is the one place in the suite that should
// fail if a display name is quietly changed, because these names are the whole
// reason the mapping exists.
const AUTHORED_TRACKS = [
  { fileName: "backgroundMusic_1.mp3", displayName: "Smoke Under the Door" },
  { fileName: "backgroundMusic_2.mp3", displayName: "Nightwatch Blues" },
  { fileName: "backgroundMusic_3.mp3", displayName: "Rain on Ninth Street" },
  { fileName: "backgroundMusic_4.mp3", displayName: "Last Call at the Cellar" },
  { fileName: "backgroundMusic_5.mp3", displayName: "A Slow Trail of Ash" },
  { fileName: "backgroundMusic_6.mp3", displayName: "Echoes in the Hollow" },
];

const HOUSE_ARTIST = "The Askew Quartet";

// A real click on the desktop icon — the same single click a player makes.
async function openEchotrail(page) {
  await openComputer(page);
  await page.locator(".computer-icon-echotrail").click();
  await expect(page.locator(".caveos-echotrail-window")).toBeVisible();
}

async function startAndOpenEchotrail(page) {
  await startNewGame(page);
  await openEchotrail(page);
}

const rows = (page) => page.locator(".caveos-echotrail-row");
const rowNames = (page) => page.locator(".caveos-echotrail-row-name");

const columnButton = (page, columnId) =>
  page.locator(`.caveos-echotrail-column-${columnId} .caveos-echotrail-column-button`);

// The heading text alone. The button also holds the sort arrow, so asserting a
// heading against the button would compare "Name" with "Name▲".
const columnLabel = (page, columnId) =>
  page.locator(`.caveos-echotrail-column-${columnId} .caveos-echotrail-column-label`);

const readNames = (page) => rowNames(page).evaluateAll(
  (cells) => cells.map((cell) => cell.textContent.trim())
);

// The audio layer's own view of what is playing, read off the live singleton the
// app itself uses — not a stub. The point is that the player's gesture reached
// the real manager and changed its state.
const echotrailState = (page) => page.evaluate(async () => {
  const { audioManager } = await import("/audioManager.js");
  return audioManager.getEchotrailState();
});

// Whether the game's own background rotation currently holds the music slot.
const gameMusicRunning = (page) => page.evaluate(async () => {
  const { audioManager } = await import("/audioManager.js");
  return Boolean(audioManager.currentMusic);
});

const gameMusicTracks = (page) => page.evaluate(async () => {
  const { audioManager } = await import("/audioManager.js");
  return [...audioManager.musicTracks];
});

/* ---------------------------------------------------------------------------
   The library and its rules
   --------------------------------------------------------------------------- */

test("ECHOTRAIL opens from the desktop with the six authored tracks", async ({ page }) => {
  await startAndOpenEchotrail(page);

  await expect(page.locator(".caveos-echotrail-window .desktop-window-title"))
    .toHaveText("ECHOTRAIL");
  await expect(rows(page)).toHaveCount(6);

  // Every authored track is listed under its invented title, not its filename.
  const names = await readNames(page);
  AUTHORED_TRACKS.forEach(({ displayName, fileName }) => {
    expect(names).toContain(displayName);
    expect(names).not.toContain(fileName);
  });
});

test("reopening after closing gives one window, not a second copy", async ({ page }) => {
  await startAndOpenEchotrail(page);

  // Closed from its own title bar rather than by clicking the icon again. The
  // window opens centred, over the icon that opened it, so a real mouse cannot
  // reach the icon a second time — the same trait every other CaveOS app window
  // has, and the reason the suite closes app windows this way throughout.
  await closeCaveOsWindow(page, "caveos-echotrail-window");

  await page.locator(".computer-icon-echotrail").click();
  await expect(page.locator(".caveos-echotrail-window")).toHaveCount(1);
});

test("every authored row is credited to the house artist and typed as MP3 audio", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const authors = await page.locator(".caveos-echotrail-cell-author").evaluateAll(
    (cells) => cells.map((cell) => cell.textContent.trim())
  );
  expect(new Set(authors)).toEqual(new Set([HOUSE_ARTIST]));

  const types = await page.locator(".caveos-echotrail-cell-type").evaluateAll(
    (cells) => cells.map((cell) => cell.textContent.trim())
  );
  expect(new Set(types)).toEqual(new Set([localization.en.echotrailFileTypeAudio]));
});

test("each row carries a small audio icon, and the columns take the rest of the width", async ({ page }) => {
  await startAndOpenEchotrail(page);

  // The "Details view" shape: a small fixed icon, with the space going to text.
  const iconBox = await page.locator(".caveos-echotrail-row-icon").first().boundingBox();
  expect(iconBox.width).toBeLessThanOrEqual(20);
  expect(iconBox.height).toBeLessThanOrEqual(20);

  await expect(page.locator(".caveos-echotrail-row-icon.is-audio")).toHaveCount(6);

  // Name is the column given the slack, so it must be the widest of the four.
  const widths = await page.locator(".caveos-echotrail-column").evaluateAll(
    (headers) => headers.map((header) => ({
      id: header.className,
      width: Math.round(header.getBoundingClientRect().width),
    }))
  );
  const nameWidth = widths.find(({ id }) => id.includes("column-name")).width;
  widths
    .filter(({ id }) => !id.includes("column-name"))
    .forEach(({ width }) => {
      expect(nameWidth).toBeGreaterThan(width);
    });
});

test("lengths are read from the files themselves", async ({ page }) => {
  await startAndOpenEchotrail(page);

  // Every row starts on the placeholder and is filled in as each file's
  // metadata arrives, so this waits for real durations rather than asserting
  // whatever happened to be painted first.
  await expect.poll(
    async () => {
      const lengths = await page.locator(".caveos-echotrail-cell-length").evaluateAll(
        (cells) => cells.map((cell) => cell.textContent.trim())
      );
      return lengths.filter((value) => /^\d+:[0-5]\d$/.test(value)).length;
    },
    { timeout: 15000 }
  ).toBe(6);
});

/* ---------------------------------------------------------------------------
   Sorting
   --------------------------------------------------------------------------- */

test("the list opens sorted by name ascending, and the header says so", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const names = await readNames(page);
  expect(names).toEqual([...names].sort((first, second) => first.localeCompare(second)));

  await expect(page.locator(".caveos-echotrail-column-name"))
    .toHaveAttribute("aria-sort", "ascending");
});

test("clicking the sorted column reverses it", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const ascending = await readNames(page);

  await columnButton(page, "name").click();
  await expect(page.locator(".caveos-echotrail-column-name"))
    .toHaveAttribute("aria-sort", "descending");
  expect(await readNames(page)).toEqual([...ascending].reverse());

  // And back again, so the toggle is genuinely a toggle.
  await columnButton(page, "name").click();
  await expect(page.locator(".caveos-echotrail-column-name"))
    .toHaveAttribute("aria-sort", "ascending");
  expect(await readNames(page)).toEqual(ascending);
});

test("clicking a different column sorts by it ascending and releases the old one", async ({ page }) => {
  await startAndOpenEchotrail(page);

  await columnButton(page, "length").click();

  await expect(page.locator(".caveos-echotrail-column-length"))
    .toHaveAttribute("aria-sort", "ascending");
  // The previously sorted column must give up its sort state, or two columns
  // would both claim to be sorted.
  await expect(page.locator(".caveos-echotrail-column-name"))
    .toHaveAttribute("aria-sort", "none");
});

test("sorting by length orders by real duration, not by the text in the cell", async ({ page }) => {
  await startAndOpenEchotrail(page);

  // Waits for every length to be known first; sorting on placeholders would
  // prove nothing about the comparison.
  await expect.poll(
    async () => {
      const lengths = await page.locator(".caveos-echotrail-cell-length").evaluateAll(
        (cells) => cells.map((cell) => cell.textContent.trim())
      );
      return lengths.every((value) => /^\d+:[0-5]\d$/.test(value));
    },
    { timeout: 15000 }
  ).toBe(true);

  await columnButton(page, "length").click();

  const toSeconds = (value) => {
    const [minutes, seconds] = value.split(":").map(Number);
    return minutes * 60 + seconds;
  };

  const seconds = (await page.locator(".caveos-echotrail-cell-length").evaluateAll(
    (cells) => cells.map((cell) => cell.textContent.trim())
  )).map(toSeconds);

  expect(seconds).toEqual([...seconds].sort((first, second) => first - second));

  // Descending has to be the exact reverse, which a string sort on "9:59" vs
  // "10:00" would get wrong.
  await columnButton(page, "length").click();
  const reversed = (await page.locator(".caveos-echotrail-cell-length").evaluateAll(
    (cells) => cells.map((cell) => cell.textContent.trim())
  )).map(toSeconds);
  expect(reversed).toEqual([...seconds].reverse());
});

test("a column full of equal values keeps a stable order rather than shuffling", async ({ page }) => {
  await startAndOpenEchotrail(page);

  // Author is one house artist across all six rows, so every comparison ties
  // and the tie-break decides the whole order.
  await columnButton(page, "author").click();
  const first = await readNames(page);

  await columnButton(page, "author").click();
  await columnButton(page, "author").click();
  expect(await readNames(page)).toEqual(first);
});

/* ---------------------------------------------------------------------------
   Selection and playback
   --------------------------------------------------------------------------- */

test("a single click selects a row without playing it", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const row = rows(page).nth(2);
  await row.click();

  await expect(row).toHaveClass(/is-selected/);
  await expect(row).toHaveAttribute("aria-selected", "true");
  // Selection is not playback: a click that started the music would make the
  // double click below meaningless.
  await expect(page.locator(".caveos-echotrail-row.is-playing")).toHaveCount(0);
  expect((await echotrailState(page)).isLoaded).toBe(false);
});

test("selecting another row releases the first", async ({ page }) => {
  await startAndOpenEchotrail(page);

  await rows(page).nth(1).click();
  await rows(page).nth(3).click();

  await expect(page.locator(".caveos-echotrail-row.is-selected")).toHaveCount(1);
  await expect(rows(page).nth(3)).toHaveClass(/is-selected/);
});

test("a double click plays that row", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const names = await readNames(page);
  await rows(page).nth(0).dblclick();

  await expect(rows(page).nth(0)).toHaveClass(/is-playing/);
  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(`${localization.en.echotrailNowPlayingLabel}: ${names[0]}`);

  const state = await echotrailState(page);
  expect(state.isPlaying).toBe(true);
  expect(state.source).toContain("audio/music/");
});

test("the play button pauses when already playing, and resumes when clicked again", async ({ page }) => {
  await startAndOpenEchotrail(page);

  await rows(page).nth(0).dblclick();
  await expect.poll(async () => (await echotrailState(page)).isPlaying).toBe(true);

  const playButton = page.locator(".caveos-echotrail-play");
  await playButton.click();
  await expect.poll(async () => (await echotrailState(page)).isPlaying).toBe(false);
  // Paused, not unloaded: the track is still the one in the slot.
  expect((await echotrailState(page)).isLoaded).toBe(true);
  await expect(playButton).not.toHaveClass(/is-playing/);

  await playButton.click();
  await expect.poll(async () => (await echotrailState(page)).isPlaying).toBe(true);
  await expect(playButton).toHaveClass(/is-playing/);
});

test("the play button starts the selected track when nothing is playing yet", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const names = await readNames(page);
  await rows(page).nth(4).click();
  await page.locator(".caveos-echotrail-play").click();

  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(`${localization.en.echotrailNowPlayingLabel}: ${names[4]}`);
  await expect(rows(page).nth(4)).toHaveClass(/is-playing/);
});

test("the play button's accessible name follows what it will do", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const playButton = page.locator(".caveos-echotrail-play");
  // One button doing two jobs has to say which job it is offering.
  await expect(playButton).toHaveAttribute("aria-label", localization.en.echotrailPlayAriaLabel);

  await rows(page).nth(0).dblclick();
  await expect(playButton).toHaveAttribute("aria-label", localization.en.echotrailPauseAriaLabel);

  await playButton.click();
  await expect(playButton).toHaveAttribute("aria-label", localization.en.echotrailPlayAriaLabel);
});

test("forward and back step through the list as it is currently sorted", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const names = await readNames(page);
  await rows(page).nth(0).dblclick();

  await page.locator(".caveos-echotrail-next").click();
  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(`${localization.en.echotrailNowPlayingLabel}: ${names[1]}`);

  await page.locator(".caveos-echotrail-next").click();
  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(`${localization.en.echotrailNowPlayingLabel}: ${names[2]}`);

  await page.locator(".caveos-echotrail-previous").click();
  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(`${localization.en.echotrailNowPlayingLabel}: ${names[1]}`);
});

test("stepping back from the first track wraps to the last", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const names = await readNames(page);
  await rows(page).nth(0).dblclick();

  await page.locator(".caveos-echotrail-previous").click();
  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(`${localization.en.echotrailNowPlayingLabel}: ${names[names.length - 1]}`);
});

test("re-sorting changes what forward means, because it follows what is on screen", async ({ page }) => {
  await startAndOpenEchotrail(page);

  await rows(page).nth(0).dblclick();

  // Reverse the list: the track that was second is now second-from-last, so
  // Next must land somewhere different from where it did before.
  await columnButton(page, "name").click();
  const reversedNames = await readNames(page);
  const playingIndex = await rows(page).evaluateAll(
    (rowElements) => rowElements.findIndex((row) => row.classList.contains("is-playing"))
  );

  // Reversing can leave the playing track at the bottom, where Next wraps to
  // the top — so the expected row is computed the same way the app must.
  const expectedName = reversedNames[(playingIndex + 1) % reversedNames.length];

  await page.locator(".caveos-echotrail-next").click();
  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(`${localization.en.echotrailNowPlayingLabel}: ${expectedName}`);
});

test("Enter plays the focused row, so the list is usable from the keyboard", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const names = await readNames(page);
  await rows(page).nth(2).focus();
  await page.keyboard.press("Enter");

  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(`${localization.en.echotrailNowPlayingLabel}: ${names[2]}`);
});

/* ---------------------------------------------------------------------------
   The music slot: ECHOTRAIL replaces the game's own background music
   --------------------------------------------------------------------------- */

test("a chosen track takes over the music slot from the game's background rotation", async ({ page }) => {
  await startAndOpenEchotrail(page);

  // The game's own rotation is running first — this is the state the chosen
  // track has to displace.
  await expect.poll(() => gameMusicRunning(page), { timeout: 8000 }).toBe(true);

  await rows(page).nth(0).dblclick();

  // The background track is stopped outright rather than left playing under the
  // chosen one, which is the bug this guards.
  await expect.poll(() => gameMusicRunning(page)).toBe(false);
  expect((await echotrailState(page)).isPlaying).toBe(true);
});

test("the game's music does not restart underneath a chosen track", async ({ page }) => {
  await startAndOpenEchotrail(page);
  await rows(page).nth(0).dblclick();
  await expect.poll(async () => (await echotrailState(page)).isPlaying).toBe(true);

  // Every one of these routes into ensureBackgroundMusic, including with
  // force: true. None of them may start the rotation while a track is running.
  await page.evaluate(async () => {
    const { audioManager } = await import("/audioManager.js");
    audioManager.onUserGesture();
    audioManager.ensureBackgroundMusic({ force: true });
    audioManager.applyMuteState();
  });

  expect(await gameMusicRunning(page)).toBe(false);
});

test("a track running to its end hands the music back to the game", async ({ page }) => {
  await startAndOpenEchotrail(page);
  await rows(page).nth(0).dblclick();
  await expect.poll(async () => (await echotrailState(page)).isPlaying).toBe(true);

  // The tracks are minutes long, so the end is reached by seeking rather than
  // by waiting it out. The `ended` event that fires is the real one the browser
  // raises at the end of a file — the same path a track finishing normally
  // takes.
  // The duration is only known once the playing element has its own metadata;
  // seeking before that throws on a non-finite value.
  await expect.poll(
    async () => page.evaluate(async () => {
      const { audioManager } = await import("/audioManager.js");
      return Number.isFinite(audioManager.echotrailAudio?.duration);
    }),
    { timeout: 15000 }
  ).toBe(true);

  await page.evaluate(async () => {
    const { audioManager } = await import("/audioManager.js");
    const audio = audioManager.echotrailAudio;
    audio.currentTime = Math.max(0, audio.duration - 0.15);
  });

  await expect.poll(
    async () => (await echotrailState(page)).isLoaded,
    { timeout: 15000 }
  ).toBe(false);

  // And the game's own rotation comes back, which is the whole point of the
  // hand-back.
  await expect.poll(() => gameMusicRunning(page), { timeout: 8000 }).toBe(true);

  // The transport follows playback it did not initiate.
  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(localization.en.echotrailNothingPlaying);
  await expect(page.locator(".caveos-echotrail-row.is-playing")).toHaveCount(0);
});

test("closing the library leaves the track playing, and reopening re-attaches to it", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const names = await readNames(page);
  await rows(page).nth(0).dblclick();
  await expect.poll(async () => (await echotrailState(page)).isPlaying).toBe(true);

  await closeCaveOsWindow(page, "caveos-echotrail-window");

  // Closing the library is not stopping the music: the player is expected to
  // put a track on and get on with the game.
  expect((await echotrailState(page)).isPlaying).toBe(true);

  await page.locator(".computer-icon-echotrail").click();
  await expect(page.locator(".caveos-echotrail-window")).toBeVisible();

  // The reopened window shows what is already playing rather than starting over.
  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(`${localization.en.echotrailNowPlayingLabel}: ${names[0]}`);
  await expect(page.locator(".caveos-echotrail-row.is-playing")).toHaveCount(1);
});

test("closing the library does not leave a listener throwing against a detached window", async ({ page }) => {
  await startAndOpenEchotrail(page);
  await rows(page).nth(0).dblclick();

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await closeCaveOsWindow(page, "caveos-echotrail-window");
  // Drives the notification path the closed window was subscribed to.
  await page.evaluate(async () => {
    const { audioManager } = await import("/audioManager.js");
    audioManager.toggleEchotrailPlayback();
  });
  await page.waitForTimeout(400);

  expect(pageErrors).toEqual([]);
});

/* ---------------------------------------------------------------------------
   The filename rule: what the in-game rotation may play
   --------------------------------------------------------------------------- */

test("only backgroundMusic_<n>.mp3 files are eligible for the in-game rotation", async ({ page }) => {
  await startNewGame(page);

  const tracks = await gameMusicTracks(page);
  expect(tracks).toHaveLength(6);
  tracks.forEach((path) => {
    expect(path).toMatch(/^audio\/music\/backgroundMusic_\d+\.mp3$/);
  });
});

test("a file added under another name is playable but never joins the rotation", async ({ page }) => {
  await startAndOpenEchotrail(page);

  expect(await page.evaluate(() => window.addAudioToEchotrail("nightMail.mp3"))).toBe(true);

  // Listed, under its own filename rather than an invented title.
  await expect(rows(page)).toHaveCount(7);
  expect(await readNames(page)).toContain("nightMail.mp3");

  // Credited to nobody, because the library genuinely does not know.
  const addedRow = page.locator('.caveos-echotrail-row[data-file-name="nightMail.mp3"]');
  await expect(addedRow.locator(".caveos-echotrail-cell-author"))
    .toHaveText(localization.en.echotrailUnknownAuthor);

  // And still out of the rotation, which is the half of the rule with teeth.
  const tracks = await gameMusicTracks(page);
  expect(tracks).toHaveLength(6);
  expect(tracks.join(" ")).not.toContain("nightMail");
});

test("a file added as backgroundMusic_<n>.mp3 joins the rotation and gets a title if one is authored", async ({ page }) => {
  await startAndOpenEchotrail(page);

  // A number with no authored title falls back to its filename, but is still
  // eligible for the rotation — the two halves of the rule are independent.
  expect(await page.evaluate(() => window.addAudioToEchotrail("backgroundMusic_7.mp3"))).toBe(true);

  await expect(rows(page)).toHaveCount(7);

  const tracks = await gameMusicTracks(page);
  expect(tracks).toHaveLength(7);
  expect(tracks).toContain("audio/music/backgroundMusic_7.mp3");
});

test("addAudioToEchotrail is idempotent and refuses files it cannot describe", async ({ page }) => {
  await startAndOpenEchotrail(page);

  // A trigger firing twice must not double the row.
  expect(await page.evaluate(() => window.addAudioToEchotrail("nightMail.mp3"))).toBe(true);
  expect(await page.evaluate(() => window.addAudioToEchotrail("nightMail.mp3"))).toBe(false);
  await expect(rows(page)).toHaveCount(7);

  // One of the six already on the machine is not "added" either.
  expect(await page.evaluate(() => window.addAudioToEchotrail("backgroundMusic_3.mp3"))).toBe(false);

  // Nor is something that is not media at all.
  expect(await page.evaluate(() => window.addAudioToEchotrail("caseNotes.txt"))).toBe(false);
  expect(await page.evaluate(() => window.addAudioToEchotrail(""))).toBe(false);
  await expect(rows(page)).toHaveCount(7);
});

test("an added mp4 is listed and typed as video", async ({ page }) => {
  await startAndOpenEchotrail(page);

  expect(await page.evaluate(() => window.addAudioToEchotrail("interview.mp4"))).toBe(true);

  const addedRow = page.locator('.caveos-echotrail-row[data-file-name="interview.mp4"]');
  await expect(addedRow.locator(".caveos-echotrail-cell-type"))
    .toHaveText(localization.en.echotrailFileTypeVideo);
  // A different icon from the audio rows, which is the only thing on the row
  // carrying the file's kind visually.
  await expect(addedRow.locator(".caveos-echotrail-row-icon.is-video")).toHaveCount(1);
});

/* ---------------------------------------------------------------------------
   The unlocked flag
   --------------------------------------------------------------------------- */

test("a declared but locked track is absent from the library entirely", async ({ page }) => {
  await startAndOpenEchotrail(page);

  // The track has to be *declared* for this to mean anything: with nothing in
  // ECHOTRAIL_UNLOCKABLE_FILE_NAMES the catalog and the library are the same
  // six rows either way, and a test written against that would still pass with
  // the locked filter deleted. Declaring one here is how the game itself
  // declares its unlockable tracks, and it is put back afterwards.
  const result = await page.evaluate(async () => {
    const module = await import("/echotrailManager.js");
    module.ECHOTRAIL_UNLOCKABLE_FILE_NAMES.push("lockedTake.mp3");
    try {
      return {
        catalog: module.buildEchotrailCatalog([]).map((entry) => [entry.fileName, entry.isUnlocked]),
        locked: module.getEchotrailLockedFileNames([]),
        visibleWhileLocked: module.buildEchotrailLibrary([]).map((entry) => entry.fileName),
        visibleOnceUnlocked: module.buildEchotrailLibrary(["lockedTake.mp3"])
          .map((entry) => entry.fileName),
      };
    } finally {
      module.ECHOTRAIL_UNLOCKABLE_FILE_NAMES.pop();
    }
  });

  // The game knows the file exists and knows its flag is false...
  expect(result.catalog).toHaveLength(7);
  expect(result.catalog).toContainEqual(["lockedTake.mp3", false]);
  expect(result.locked).toEqual(["lockedTake.mp3"]);

  // ...and shows the player nothing at all — no row, no locked placeholder.
  expect(result.visibleWhileLocked).toHaveLength(6);
  expect(result.visibleWhileLocked).not.toContain("lockedTake.mp3");

  // Flipping the flag is the only thing that changes, which is what makes the
  // assertion above about the filter rather than about an empty catalog.
  expect(result.visibleOnceUnlocked).toHaveLength(7);
  expect(result.visibleOnceUnlocked).toContain("lockedTake.mp3");

  expect(await readNames(page)).not.toContain("lockedTake.mp3");
  await expect(page.locator('.caveos-echotrail-row[data-file-name="lockedTake.mp3"]')).toHaveCount(0);
});

test("the authored six carry their flag permanently and cannot be locked", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const flags = await page.evaluate(async () => {
    const { buildEchotrailCatalog } = await import("/echotrailManager.js");
    // Deliberately passing an empty unlocked list: the six must not depend on it.
    return buildEchotrailCatalog([]).map((entry) => [entry.fileName, entry.isUnlocked]);
  });

  expect(flags).toHaveLength(6);
  flags.forEach(([, isUnlocked]) => expect(isUnlocked).toBe(true));
});

test("a locked track is inaudible in gameplay as well as invisible in the list", async ({ page }) => {
  await startNewGame(page);

  // A locked file must not reach the in-game rotation either, or the player
  // would hear a recording they have not found yet.
  const tracks = await page.evaluate(async () => {
    const { getGameSelectableMusicPaths } = await import("/echotrailManager.js");
    return {
      locked: getGameSelectableMusicPaths([]),
      unlocked: getGameSelectableMusicPaths(["backgroundMusic_9.mp3"]),
    };
  });

  expect(tracks.locked).toHaveLength(6);
  expect(tracks.locked.join(" ")).not.toContain("backgroundMusic_9");
  // And once unlocked it joins, which is what makes the first half meaningful.
  expect(tracks.unlocked).toHaveLength(7);
});

test("the trigger flips the flag, and the row appears without reopening the window", async ({ page }) => {
  await startAndOpenEchotrail(page);
  await expect(rows(page)).toHaveCount(6);

  expect(await page.evaluate(() => window.addAudioToEchotrail("lockedTake.mp3"))).toBe(true);

  // The open window rebuilds itself rather than waiting to be reopened.
  await expect(rows(page)).toHaveCount(7);
  expect(await readNames(page)).toContain("lockedTake.mp3");

  const flag = await page.evaluate(async () => {
    const { isEchotrailTrackUnlocked } = await import("/echotrailManager.js");
    const { getEchotrailUnlockedFileNames } = await import("/constantsAndGlobalVars.js");
    return isEchotrailTrackUnlocked("lockedTake.mp3", getEchotrailUnlockedFileNames());
  });
  expect(flag).toBe(true);
});

/* ---------------------------------------------------------------------------
   The clock and the volume control
   --------------------------------------------------------------------------- */

const clock = (page) => page.locator(".caveos-echotrail-clock");
const clockText = (page) => page.locator(".caveos-echotrail-clock-time");

test("the clock counts up while a track plays", async ({ page }) => {
  await startAndOpenEchotrail(page);

  // Nothing playing reads zero rather than the unknown-length placeholder: 0:00
  // is a true statement about a track that has not started.
  await expect(clockText(page)).toHaveText("0:00");

  await rows(page).nth(0).dblclick();

  // A real count, observed by watching it change rather than by trusting one
  // reading.
  await expect.poll(
    async () => clockText(page).textContent(),
    { timeout: 8000 }
  ).not.toBe("0:00");

  const toSeconds = (value) => {
    const [minutes, seconds] = value.replace("-", "").split(":").map(Number);
    return minutes * 60 + seconds;
  };

  const first = toSeconds(await clockText(page).textContent());
  await expect.poll(
    async () => toSeconds(await clockText(page).textContent()),
    { timeout: 8000 }
  ).toBeGreaterThan(first);
});

test("clicking the clock toggles to time remaining, and again back to elapsed", async ({ page }) => {
  await startAndOpenEchotrail(page);
  await rows(page).nth(0).dblclick();

  await expect.poll(async () => clockText(page).textContent(), { timeout: 8000 }).not.toBe("0:00");
  await expect(clock(page)).not.toHaveClass(/is-remaining/);
  const elapsed = await clockText(page).textContent();
  expect(elapsed).not.toMatch(/^-/);

  await clock(page).click();

  // Remaining is shown with a leading minus, the way a hi-fi counts down.
  await expect(clock(page)).toHaveClass(/is-remaining/);
  await expect(clockText(page)).toHaveText(/^-\d+:[0-5]\d$/);

  // And it must be counting *down*, not just wearing a minus sign.
  const toSeconds = (value) => {
    const [minutes, seconds] = value.replace("-", "").split(":").map(Number);
    return minutes * 60 + seconds;
  };
  const firstRemaining = toSeconds(await clockText(page).textContent());
  await expect.poll(
    async () => toSeconds(await clockText(page).textContent()),
    { timeout: 8000 }
  ).toBeLessThan(firstRemaining);

  await clock(page).click();
  await expect(clock(page)).not.toHaveClass(/is-remaining/);
  await expect(clockText(page)).toHaveText(/^\d+:[0-5]\d$/);
});

test("the clock's accessible name says what clicking it will do", async ({ page }) => {
  await startAndOpenEchotrail(page);

  await expect(clock(page))
    .toHaveAttribute("aria-label", localization.en.echotrailClockElapsedAriaLabel);

  await clock(page).click();
  await expect(clock(page))
    .toHaveAttribute("aria-label", localization.en.echotrailClockRemainingAriaLabel);
});

test("the clock stops ticking when the library is closed", async ({ page }) => {
  await startAndOpenEchotrail(page);
  await rows(page).nth(0).dblclick();

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await closeCaveOsWindow(page, "caveos-echotrail-window");
  // An interval outliving its window would redraw a detached element several
  // times a second; a quiet page across many tick periods is the evidence.
  await page.waitForTimeout(1200);

  expect(pageErrors).toEqual([]);
});

test("the volume slider drives the real music volume", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const slider = page.locator(".caveos-echotrail-volume-slider");
  await slider.fill("42");

  await expect(page.locator(".caveos-echotrail-volume-value")).toHaveText("42%");
  expect(await page.evaluate(async () => {
    const { audioManager } = await import("/audioManager.js");
    return Math.round(audioManager.musicVolume * 100);
  })).toBe(42);
});

// The two sliders drive one setting, so they have to agree. They are never on
// screen together — the computer window covers the floating settings panel at
// the top right of the desk, and it cannot be dragged clear of it — so each
// direction is tested through the journey a player can actually make.
test("moving ECHOTRAIL's volume moves the sound menu's slider with it", async ({ page }) => {
  await startAndOpenEchotrail(page);

  await page.locator(".caveos-echotrail-volume-slider").fill("30");

  // Closing the computer is what puts the settings panel back within reach.
  // Scoped to the computer's own header: app windows are nested inside it, so
  // a plain descendant selector would match their close buttons too.
  await page.locator(".computer-window > .desktop-window-header .story-window-close").click();
  await expect(page.locator(".computer-window")).toHaveCount(0);

  await page.locator("#settingsToggle").click();

  await expect(page.locator("#musicVolumeSlider")).toHaveValue("30");
  await expect(page.locator("#musicVolumeValue")).toHaveText("30%");
});

test("a volume set in the sound menu is the one ECHOTRAIL opens showing", async ({ page }) => {
  await startNewGame(page);

  await page.locator("#settingsToggle").click();
  await page.locator("#musicVolumeSlider").fill("70");

  await openEchotrail(page);

  await expect(page.locator(".caveos-echotrail-volume-slider")).toHaveValue("70");
  await expect(page.locator(".caveos-echotrail-volume-value")).toHaveText("70%");
});

test("the volume slider does not touch the SFX volume", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const before = await page.evaluate(async () => {
    const { audioManager } = await import("/audioManager.js");
    return audioManager.sfxVolume;
  });

  const slider = page.locator(".caveos-echotrail-volume-slider");
  await slider.fill("15");

  // This is a music player: the sound menu remains the only place SFX is set.
  expect(await page.evaluate(async () => {
    const { audioManager } = await import("/audioManager.js");
    return audioManager.sfxVolume;
  })).toBe(before);
});

/* ---------------------------------------------------------------------------
   Persistence
   --------------------------------------------------------------------------- */

test("added files survive a save/load round trip", async ({ page }) => {
  await startAndOpenEchotrail(page);
  await page.evaluate(() => window.addAudioToEchotrail("nightMail.mp3"));
  await expect(rows(page)).toHaveCount(7);

  const saveString = await page.evaluate(async () => {
    const { captureGameStatusForSaving } = await import("/constantsAndGlobalVars.js");
    return window.LZString.compressToEncodedURIComponent(
      JSON.stringify(captureGameStatusForSaving())
    );
  });

  // A fresh game first, so the restore below is genuinely putting the file back
  // rather than finding it already there.
  await startNewGame(page);
  await openEchotrail(page);
  await expect(rows(page)).toHaveCount(6);

  await page.evaluate(async (compressed) => {
    const module = await import("/constantsAndGlobalVars.js");
    await module.restoreGameStatus(
      JSON.parse(window.LZString.decompressFromEncodedURIComponent(compressed))
    );
  }, saveString);

  // Reopened so the list is rebuilt from the restored state.
  await closeCaveOsWindow(page, "caveos-echotrail-window");
  await page.locator(".computer-icon-echotrail").click();
  await expect(rows(page)).toHaveCount(7);
  expect(await readNames(page)).toContain("nightMail.mp3");
});

test("New Game clears added files back to the six on the machine", async ({ page }) => {
  await startAndOpenEchotrail(page);
  await page.evaluate(() => window.addAudioToEchotrail("nightMail.mp3"));
  await expect(rows(page)).toHaveCount(7);

  await startNewGame(page);
  await openEchotrail(page);

  await expect(rows(page)).toHaveCount(6);
  expect(await readNames(page)).not.toContain("nightMail.mp3");
});

/* ---------------------------------------------------------------------------
   Themes and localization
   --------------------------------------------------------------------------- */

test("the library follows the CaveOS theme", async ({ page }) => {
  await startAndOpenEchotrail(page);

  const readInk = () => page.locator(".caveos-echotrail-app").evaluate(
    (element) => getComputedStyle(element).color
  );

  // Terminal's ink is its phosphor green.
  const terminalInk = await readInk();
  expect(terminalInk).toBe("rgb(112, 255, 92)");

  await selectCaveOsTheme(page, "redmond");
  // A reskin has to reach inside the app window, not just the OS chrome.
  await expect.poll(readInk).not.toBe(terminalInk);
});

for (const language of CAVEOS_LANGUAGES) {
  test(`ECHOTRAIL is localized in ${language.code}`, async ({ page }) => {
    const strings = localization[language.code];
    await startNewGameInLanguage(page, language.buttonId);
    await openEchotrail(page);

    // The name is branding and stays English in every language, exactly as
    // CAVE OS and Netscape do.
    await expect(page.locator(".computer-icon-echotrail .computer-icon-label"))
      .toHaveText("ECHOTRAIL");
    await expect(page.locator(".caveos-echotrail-window .desktop-window-title"))
      .toHaveText("ECHOTRAIL");

    await expect(page.locator(".caveos-echotrail-window .story-window-close"))
      .toHaveAttribute("aria-label", strings.closeEchotrailWindowAriaLabel);
    await expect(page.locator(".caveos-echotrail-list"))
      .toHaveAttribute("aria-label", strings.echotrailLibraryAriaLabel);

    // Every column heading.
    await expect(columnLabel(page, "name")).toHaveText(strings.echotrailColumnName);
    await expect(columnLabel(page, "length")).toHaveText(strings.echotrailColumnLength);
    await expect(columnLabel(page, "author")).toHaveText(strings.echotrailColumnAuthor);
    await expect(columnLabel(page, "type")).toHaveText(strings.echotrailColumnFileType);

    // The transport.
    await expect(page.locator(".caveos-echotrail-previous"))
      .toHaveAttribute("aria-label", strings.echotrailPreviousAriaLabel);
    await expect(page.locator(".caveos-echotrail-play"))
      .toHaveAttribute("aria-label", strings.echotrailPlayAriaLabel);
    await expect(page.locator(".caveos-echotrail-next"))
      .toHaveAttribute("aria-label", strings.echotrailNextAriaLabel);
    await expect(page.locator(".caveos-echotrail-now-playing"))
      .toHaveText(strings.echotrailNothingPlaying);

    // File type is localized; the track titles deliberately are not.
    await expect(page.locator(".caveos-echotrail-cell-type").first())
      .toHaveText(strings.echotrailFileTypeAudio);
    expect(await readNames(page)).toContain("Nightwatch Blues");
  });
}

test("the track titles and the house artist stay in English on purpose", async ({ page }) => {
  await startNewGameInLanguage(page, "btnFrench");
  await openEchotrail(page);

  // A song is called what it is called in every language, so a well-meaning
  // translation of these would be a bug and this test is what says so.
  const names = await readNames(page);
  AUTHORED_TRACKS.forEach(({ displayName }) => {
    expect(names).toContain(displayName);
  });

  await expect(page.locator(".caveos-echotrail-cell-author").first()).toHaveText(HOUSE_ARTIST);
});

test("a mid-session language switch relabels the open library", async ({ page }) => {
  await startAndOpenEchotrail(page);

  await expect(columnLabel(page, "author")).toHaveText(localization.en.echotrailColumnAuthor);

  // The language buttons live on the pause menu, so the switch is made the way
  // a player makes it: Escape, pick a flag, resume.
  await switchLanguageMidGame(page, "btnFrench");

  await expect(columnLabel(page, "author")).toHaveText(localization.fr.echotrailColumnAuthor);
  await expect(page.locator(".caveos-echotrail-cell-type").first())
    .toHaveText(localization.fr.echotrailFileTypeAudio);
  await expect(page.locator(".caveos-echotrail-now-playing"))
    .toHaveText(localization.fr.echotrailNothingPlaying);
  await expect(page.locator(".caveos-echotrail-window .story-window-close"))
    .toHaveAttribute("aria-label", localization.fr.closeEchotrailWindowAriaLabel);
});
