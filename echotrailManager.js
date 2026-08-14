// ECHOTRAIL — the media library reached from Netscape's favorites bar.
//
// This file owns the *rules*, not the UI: what a media file is called when the
// player looks at it, who it is credited to, and — the one rule with teeth —
// whether the game's own background music is allowed to choose it.
//
// The rule that matters:
//
//   audio/music/backgroundMusic_<number>.mp3   authored game music.
//       Selectable by the in-game audio rotation, and shown under an invented
//       display name rather than its filename.
//
//   anything else                              a file that arrived some other
//       way — dropped into the project, or added by a story trigger through
//       addAudioToEchotrail(). Playable in the ECHOTRAIL player like any other
//       row, but NEVER selected by the in-game audio, and always shown under
//       its own filename.
//
// Keeping both halves of that rule in one place is the point. The filename
// pattern decides two separate things — audibility in-game and how the row
// reads — and if those two decisions lived apart they could disagree, leaving a
// track the rotation plays but the library labels as a stranger's file.
//
// Display names are deliberately NOT localized. They are titles of works, in
// the same category as `Netscape` and `Sudoku` elsewhere in the app: a song is
// called what it is called in every language. The column headings, the file
// type descriptions and every control around them are localized as usual.

// Where the authored music lives. A bare filename is resolved against this.
export const ECHOTRAIL_MUSIC_DIRECTORY = "audio/music/";

// Only files matching this are game music. The number is not otherwise
// meaningful — it does not index anything — it just has to be there.
const GAME_MUSIC_FILE_PATTERN = /^backgroundMusic_\d+\.mp3$/i;

// One house artist across the authored library, the way a 1996 machine's music
// folder tends to hold one production library's worth of the same session band.
export const ECHOTRAIL_HOUSE_ARTIST = "The Askew Quartet";

// The six authored tracks. The filenames say nothing about the music, so each
// gets a title here; this map is the only place those titles exist.
const BACKGROUND_MUSIC_DISPLAY_NAMES = {
  "backgroundMusic_1.mp3": "Smoke Under the Door",
  "backgroundMusic_2.mp3": "Nightwatch Blues",
  "backgroundMusic_3.mp3": "Rain on Ninth Street",
  "backgroundMusic_4.mp3": "Last Call at the Cellar",
  "backgroundMusic_5.mp3": "A Slow Trail of Ash",
  "backgroundMusic_6.mp3": "Echoes in the Hollow",
};

// The library the player finds already on the machine. Ordered as the files are
// numbered; the list view sorts itself from here.
export const ECHOTRAIL_BASE_FILE_NAMES = Object.keys(BACKGROUND_MUSIC_DISPLAY_NAMES);

// Extensions the library knows how to describe. Video is described and sorted
// correctly but is not yet given a playback surface — see the app's README note.
const FILE_KIND_BY_EXTENSION = {
  mp3: "audio",
  mp4: "video",
};

// Accepts a bare filename or any path ending in one, so a trigger can pass
// either "song.mp3" or "audio/music/song.mp3" and mean the same file.
export function normalizeEchotrailFileName(value) {
  const raw = String(value ?? "").trim().replace(/\\/g, "/");
  if (!raw) {
    return "";
  }

  const fileName = raw.slice(raw.lastIndexOf("/") + 1);
  // A path that ends in a slash names a directory, not a file.
  return fileName.trim();
}

export function getEchotrailFileExtension(fileName) {
  const normalized = normalizeEchotrailFileName(fileName);
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex <= 0) {
    return "";
  }

  return normalized.slice(dotIndex + 1).toLowerCase();
}

// "audio" | "video" | "" — the last meaning a file the library cannot describe
// and therefore will not list.
export function getEchotrailFileKind(fileName) {
  return FILE_KIND_BY_EXTENSION[getEchotrailFileExtension(fileName)] || "";
}

export function isEchotrailPlayableFile(fileName) {
  return getEchotrailFileKind(fileName) !== "";
}

// The in-game rotation's gate. Deliberately strict: a file has to be an mp3
// named exactly backgroundMusic_<number> to be eligible, so dropping any other
// audio into the music folder can never put it behind the gameplay.
export function isGameSelectableMusicFile(fileName) {
  return GAME_MUSIC_FILE_PATTERN.test(normalizeEchotrailFileName(fileName));
}

// An authored track is shown under its invented title; anything else is shown
// under its own filename, which is all the library honestly knows about it.
export function resolveEchotrailDisplayName(fileName) {
  const normalized = normalizeEchotrailFileName(fileName);
  return BACKGROUND_MUSIC_DISPLAY_NAMES[normalized] || normalized;
}

// Only the authored library is credited. Everything else returns null, which
// the list view renders as its localized "unknown" — the manager does not
// localize, so the caller decides how absence reads.
export function resolveEchotrailAuthor(fileName) {
  return isGameSelectableMusicFile(fileName) ? ECHOTRAIL_HOUSE_ARTIST : null;
}

// Where the player's double-click actually points. Files are resolved against
// the music directory unless the caller supplied a path of its own.
export function resolveEchotrailSourcePath(value) {
  const raw = String(value ?? "").trim().replace(/\\/g, "/");
  if (!raw) {
    return "";
  }

  return raw.includes("/") ? raw : `${ECHOTRAIL_MUSIC_DIRECTORY}${raw}`;
}

// One row's worth of everything the list view needs, derived rather than
// stored, so the rules above are applied identically to an authored track and
// to a file a story trigger added ten hours into a playthrough.
export function buildEchotrailEntry(value) {
  const fileName = normalizeEchotrailFileName(value);
  if (!fileName || !isEchotrailPlayableFile(fileName)) {
    return null;
  }

  return {
    fileName,
    sourcePath: resolveEchotrailSourcePath(value),
    displayName: resolveEchotrailDisplayName(fileName),
    author: resolveEchotrailAuthor(fileName),
    kind: getEchotrailFileKind(fileName),
    extension: getEchotrailFileExtension(fileName),
    isGameMusic: isGameSelectableMusicFile(fileName),
  };
}

// The full library: the authored six plus whatever the player's game has added,
// de-duplicated by filename so a trigger firing twice cannot double a row.
export function buildEchotrailLibrary(addedFileNames = []) {
  const seen = new Set();
  const entries = [];

  [...ECHOTRAIL_BASE_FILE_NAMES, ...(Array.isArray(addedFileNames) ? addedFileNames : [])]
    .forEach((value) => {
      const entry = buildEchotrailEntry(value);
      if (!entry || seen.has(entry.fileName)) {
        return;
      }

      seen.add(entry.fileName);
      entries.push(entry);
    });

  return entries;
}

// The paths the in-game background rotation is allowed to draw from. Derived
// from the same library the player sees, so the two can never disagree about
// which files are game music.
export function getGameSelectableMusicPaths(addedFileNames = []) {
  return buildEchotrailLibrary(addedFileNames)
    .filter((entry) => entry.isGameMusic)
    .map((entry) => entry.sourcePath);
}
