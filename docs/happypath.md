# Happy Path — a full playthrough, start to current end-of-content

A step-by-step walkthrough of everything a player can currently do, in an
order that reaches 100% of the shipped evidence and story content. Written
as of **11 August 2026**, revised after discovering that two of the three
login credentials are hidden in the evidence photo art itself. Like
`story-timeline.md`, this is a developer reference — a QA/dev script for
exercising every fax, record and evidence pickup in the game as it exists
today — not something shown to the player. Re-derive it after any new
content lands; it will drift the moment a new fax trigger, record or
evidence item is added.

**Ordering matters here in a way it might not look like at first glance.**
Both Police Records Level 1 and the Archives Subscriber login are gated
behind credentials that are handwritten directly onto two Library evidence
photos (not present in any JSON text) — so both Library pickups need to
happen, and the resulting photos need to be examined closely, *before*
those logins are attempted. Sections below are ordered to reflect that.

---

## 0. Starting state

New Game seeds:
- **Story folder**: the background story (`story_en.md`).
- **Photos folder**: `askewAndrew` (the only photo of the boys together) and `caveEntrance`.
- **Reports folder**: empty.
- **Facsimile**: empty queue, two timers armed (see step 2).

---

## 1. Read the desk

1. Open the **Story** stack and read the background story — the 1901
   tragedy in full, as Andrew told it before he died.
2. Open the **Photos** folder and look at the two starting photos.
3. Optionally explore **Notes** and **Paint** (ten free-form pages each,
   no story content) and the desk **ashtray** (cosmetic). None of these
   gate anything.

---

## 2. Let the intro faxes arrive

The facsimile machine is timer-driven from the moment New Game is clicked
(`scheduleNewGameIntroFacsimiles()` in `ui.js`):

| When | Fax | Result |
| --- | --- | --- |
| ~10s after New Game | **"Welcome to the Investigation"** | Orients the player: read the story, explore the desk. Purely informational — `awardsEvidence: false`, never becomes a report. |
| ~40s after New Game | **The missing person report** | Becomes the **missingReport** evidence in the Reports folder — the actual 1901 NWMP case file. |

Open the **Facsimile** machine after each arrives (flashing light) and
close the window to commit it. Nothing else in the game is blocked while
waiting for these — the computer is usable immediately.

---

## 3. The computer — CaveOS → Netscape

Click the desk computer, open **Netscape**. Do ZoomSearch and Library
first — neither needs a login, and Library is where the other two sites'
credentials come from.

### 3a. ZoomSearch (no login)

| Search | Result |
| --- | --- |
| `john baxley` | Awards **"Search Party outside Black Pine Silver Mine Shaft B"** photo. |
| `black pine mine` (or `silver mine` / `mine`) | Awards **"No More!"** photo (the 1851 mine-closure poster). |
| `mine cart` (or `minecart` / `truck` / `mine truck`) | No evidence — but the "Wacky Miners" result contains a clickable link to `whitmore-sons-iron-machinery-co.com/mining` (see step 3f). |
| `margaret mcleod` / `apples` / `maple grove` | Flavour only — Margaret's later life. |
| `harry whitmore` / `henry whitmore` | Flavour only — Harry's biography and Niagara Falls photo. |
| `jerome whitmore` | Flavour only — how Jerome ended up running the family firm. |
| `brian whitmore` | Flavour only — Brian's succession and the "today" framing. |

### 3b. Library (no login)

Author + title must both match exactly.

| Author | Title | Result |
| --- | --- | --- |
| `Hannah Fletcher` | `Mysteries of the Old North West` | Awards the **mysteriesOfTheOldNorthWest** photo. **Examine it closely (magnifier) — "j.fletcher / oscar123" is handwritten in the top-right corner.** This is the Police Records Level 1 login (see step 3c) and matches the live account exactly. |
| `Cat J Roman` | `Guardians Of The North` | Awards the **library-guardiansofthenorth** photo. **Examine it closely — "Ontario apples (t.mcleod / apple1)" is handwritten beside it.** This is the Archives Subscriber login (see step 3d), and matches the live account exactly. |
| `Henry Whitmore` | `Strange Things Found In Even Stranger Places` | Awards the **"Strange Things Found In Even Stranger Places"** photo — the vandalised page, see `story-timeline.md` §4 for the pendant connection it hints at. |

### 3c. Police Records

Login is exact-match, case-sensitive. Levels stack — each new login
replaces the session at a higher level.

| Login as | Password | Unlocks |
| --- | --- | --- |
| *(default)* Public | — | Level 0: `james fletcher`, `emile` / `emile beaulieu`, `william` / `william mcleod`, `george` / `george mackenzie` — all flavour, no evidence. |
| `j.fletcher` | `oscar123` | Level 1 — from the handwriting on `mysteriesOldNW.png` (step 3b). Unlocks `thomas o'rourke` / `thomas orourke` / `thomas` — **not evidence itself**, but its report body contains a clickable link to `honeydewcavingclub.com`. Click it now (see step 3f). |
| `b.whitmore` | `ironVeins15` | Level 2: `whitmore` / `arthur` / `arthur whitmore` — **opening this record (not just finding it) triggers a second fax**, see step 4. |
| `t.fairchild` | `mapleLaw91` | Level 3 — nothing currently requires this level. Dead end for now (see "Current content boundary" below). |
| `administrator` | `atlas` | Level 5 — same; nothing currently requires it either. |

`b.whitmore` / `ironVeins15` only exists after reading the fax in step 4a
below, so this is the one place order genuinely matters beyond the
Library-first rule: you must do 3f (get to the map) → 4a (read the Level 2
fax) before you can reach the `arthurwhitmore` record here.

### 3d. Canada Newspaper Archive

Province + keyword must both match exactly, and login gates by level.

| Login as | Password | Then search (province + keyword) | Result |
| --- | --- | --- | --- |
| *(default)* Free | — | Alberta + `hannah fletcher` (or `hannah` / `mysteries of the old north west`) | Flavour only — no evidence. |
| `t.mcleod` | `apple1` | Saskatchewan + `harry` / `henry` / `strange things` / `strange` | Flavour only — coverage of Harry's book launch. |
| `t.mcleod` | `apple1` | Ontario + `william` / `margaret` / `mcleod` / `lieutenant` / `apples` | Flavour only, but displays `williamAndMargaretMcLeodApples.png` — a family polaroid whose handwritten caption identifies `t.mcleod` as **Teresa McLeod**, William and Margaret's daughter. Also the source of the gold-pendant mystery thread. |

`t.mcleod` / `apple1` comes from the handwriting on `library-guardiansofthenorth`
(step 3b) — this login can't happen before that pickup. The archive
currently awards **no evidence at all** — every record here has
`awardsEvidence: false`. It's pure lore/mystery-thread material.

### 3f. Standalone pages

Reached either by typing the URL directly into the browser address bar, or
by clicking through from wherever they're linked:

| URL | How it's normally found | Result |
| --- | --- | --- |
| `http://www.whitmore-sons-iron-machinery-co.com/mining` | Linked from ZoomSearch's `minecart` result (step 3a); also spelled out as plain text in the Level 2 Whitmore fax (step 4a). | No evidence — company flavour page, name-drops "Grandpa Arthur" and "Uncle Harry." |
| `http://honeydewcavingclub.com` | Linked from the Police `thomasorourke` record (step 3c, Level 1) — **the only place this URL appears**. | Awards **two** photos in one visit: **standalone-honeydewcavingclub-team** (the 1904 club photo) and **standalone-honeydewcavingclub** (the 1912 cave map). Picking up the map photo specifically is what fires the Level 2 Whitmore fax — see step 4a. |

---

## 4. The Whitmore credentials chain

Two more facsimiles, both triggered by player actions rather than timers.

### 4a. Level 2 — triggered by evidence

Acquiring the **standalone-honeydewcavingclub** photo (the cave map, from
step 3f) fires `WHITMORE_MINEMAP_MILESTONE_FAX_CONFIG` automatically.
Open the Facsimile machine: **"Message from Brian Whitmore"** gives
`b.whitmore` / `ironVeins15`, and closing the window commits it as a
Reports-folder evidence item. This is what unlocks Level 2 in step 3c.

### 4b. Level 3 — triggered by opening a record, not just finding it

With `b.whitmore` logged in, search Police Records for `arthur whitmore`
and **click into the record** (search alone isn't enough — see
`facsimile-event-trigger-guide.md` §"Web record-open triggers"). This
fires a second fax: **"Message from Brian Whitmore"** again, this time with
`t.fairchild` / `mapleLaw91` (Level 3). Read and close it to commit it as a
third Reports-folder evidence item.

---

## 5. Current content boundary

At this point every fax trigger and evidence-award path that exists in the
shipped assets has fired. There is nothing further to do:

- **Level 3 and Level 5 police access** (`t.fairchild`, `administrator`)
  don't currently gate anything — no record requires above Level 2.
- **`insideCaveLookingBack`** has a full photo catalog entry but no unlock
  path anywhere (no blueprint, no web record, no fax) — it can never
  actually be collected right now.
- **The gold pendant and the vandalised book page** (see
  `story-timeline.md` §4, "Current mystery threads") are left dangling —
  nothing in the shipped content resolves either, even after identifying
  Teresa McLeod.

### Full evidence inventory at this point

**Photos folder (9):** askewAndrew, caveEntrance, "No More!", "Search Party
outside Black Pine Silver Mine Shaft B", standalone-honeydewcavingclub-team,
standalone-honeydewcavingclub, mysteriesOfTheOldNorthWest,
library-guardiansofthenorth, "Strange Things Found In Even Stranger Places."

**Reports folder (3):** missingReport, facsimile-whitmore-police-credentials,
facsimile-whitmore-level3-credentials.

**Story folder (1):** the background story (default, never grows).

---

## 6. Quick reference — the shortest input sequence

For re-testing the whole game end to end without re-reading the narration
above:

1. New Game.
2. Wait ~10s, open Facsimile, close it (welcome fax).
3. Wait ~30s more, open Facsimile, close it (missingReport fax → evidence).
4. Computer → Netscape → ZoomSearch → `john baxley` → open result.
5. ZoomSearch → `black pine mine` → open result.
6. Library → `Hannah Fletcher` / `Mysteries of the Old North West` → open result → examine closely for the `j.fletcher` / `oscar123` note.
7. Library → `Cat J Roman` / `Guardians Of The North` → open result → examine closely for the `t.mcleod` / `apple1` note.
8. Library → `Henry Whitmore` / `Strange Things Found In Even Stranger Places` → open result.
9. Police Records → login `j.fletcher` / `oscar123` → search `thomas orourke` → open result → click the `honeydewcavingclub.com` link.
10. On the Honey Dew Caving Club page: evidence awards automatically (2 photos).
11. Open Facsimile, close it (Level 2 Whitmore fax → evidence).
12. Police Records → login `b.whitmore` / `ironVeins15` → search `arthur whitmore` → open result.
13. Open Facsimile, close it (Level 3 Whitmore fax → evidence).
14. (Optional, no evidence) Archives → login `t.mcleod` / `apple1` → search Saskatchewan + `strange` and Ontario + `mcleod` for the remaining lore, including the Teresa McLeod reveal.

18 evidence-relevant actions, plus the ~40s of real time for the intro
faxes. That's the entire game as of this pass.
