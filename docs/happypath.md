# Happy Path — the order a player would actually discover things

As of **12 August 2026**. This traces the order a player would realistically
proceed through the game **using only in-game flavour text as clues** — no
out-of-game knowledge of exact search keywords, no JSON-reading. It turns
out the content is almost entirely clue-chained once you follow it
properly: nearly every gated login and every exact Library title is spelled
out somewhere the player would plausibly have already read. The one weak
link is noted where it happens (§2).

A companion "Developer Quick Reference" at the end of this document keeps
the old mechanical shortest-path script for QA/testing purposes, since
that's still useful on its own terms — this document exists alongside it,
not instead of it.

**Two access tiers matter to how a player finds things:**
- **Open browsing** — ZoomSearch has no login at all; three Police records
  and one Archives record sit at privilege/access level 0, reachable by the
  default guest session with no credentials. A curious player exploring
  these needs only a plausible name to try, not a specific unlock.
- **Clue-gated** — Library requires an *exact* author + title match with no
  partial search, so it's only reachable once the player has read that
  exact pair somewhere else. Two of the three login credentials are
  handwritten on Library evidence photos, discoverable only by examining
  the photo closely (magnifier) once collected.

---

## 1. Setup

1. New Game.
2. ~10s: the "Welcome to the Investigation" fax arrives — read it. It just
   says: read the desk story, then explore what's on the desk.
3. Read the background story — the 1901 tragedy, Andrew and Arnie, told in
   full. No NWMP names in it at all; it's pure family narrative.
4. Look at the two starting photos in the **Photos** folder:
   - **askewAndrew** — the boys together. No further leads.
   - **caveEntrance** — its own caption credits "Police photographer
     **John Baxley**." First named lead in the game.
5. ~40s: the missing person report fax arrives — open it, read it, close
   it. The case file itself names only the Spencer family, but its
   **Location** field reads "Black Pine Former Silver Mine (B Shaft)," and
   its own flavour text ("You manage to find a photo online of the cave...")
   is a direct nudge to go search the web next.

---

## 2. First moves online

Open the desk computer → Netscape. Two leads are already in hand — the
mine, and John Baxley — and neither needs a login.

1. **ZoomSearch → `mine`** (or `silver mine` / `black pine mine`, per the
   report's own wording). Finds the 1851 "Black Pine Mine Exhausted"
   poster — awards the **"No More!"** photo. Its text talks about
   dismantled "extraction machinery and rails" — mining-equipment language
   that makes a next guess like `mine cart` a reasonable follow-up for a
   player now in a "try mining words" mindset.
2. **ZoomSearch → `mine cart`** (or `minecart` / `truck` / `mine truck`).
   This is the one genuinely under-clued hop in the whole chain — nothing
   directly tells the player to search this, it's an extrapolation from
   step 1's mining language. Lands on "Wacky Miners," a joke page that
   nonetheless hands over a real, clickable link to
   `whitmore-sons-iron-machinery-co.com/mining`.
3. **ZoomSearch → `john baxley`** (from the caveEntrance photo credit).
   Awards the **"Search Party outside Black Pine Silver Mine Shaft B"**
   photo. Confirms the investigation was NWMP business (which the report's
   own letterhead already told the player) — no new names.

---

## 3. The Whitmore & Sons page — the real hub

Click the link found in §2 step 2 (or type
`http://www.whitmore-sons-iron-machinery-co.com/mining` directly). This
page is where the Whitmore thread actually begins:

> "The only family members who can not claim this accolade are **Grandpa
> Arthur** and **Uncle Harry**! ...one did do some work in a mine... as a
> **Police Sergeant, leading a search party investigation**, and the other
> wrote **a book about wacky things found in dark unexpected places like
> abandoned mines**!"

Two leads, by nickname only:
- **"Arthur"** — a Police Sergeant who led a search party.
- **"Harry"** — wrote a book about strange finds.

Follow up immediately:

4. **ZoomSearch → `harry`** (or `henry`). Finds the "heir to the Whitmore
   Empire" page, which gives Harry's real name — **Henry Whitmore** — and
   confirms he's an author and naturalist. Still no exact book title.

---

## 4. Police Records — open browsing

Since the missing-person report's own letterhead is "NORTH-WEST MOUNTED
POLICE," checking their public records site needs no clue at all — it's
the obvious next stop, and three records + two search attempts are
reachable with zero login (default Public/Level 0 session):

| Search | Result |
| --- | --- |
| `arthur` (or `arthur whitmore`, `whitmore`) | **"One or more matching records were hidden by privilege restrictions."** The record exists — this confirms Arthur is a real lead worth coming back for once better access is found. |
| `william` (or `william mcleod`) | **"One or more matching records were hidden by privilege restrictions."** Same as Arthur — a real record, worth returning to once better access is found. |
| `james fletcher` (or `james`) | Constable James Fletcher's bio: retired 1934, lived in Gray Stacks, **Alberta**, with wife **Hannah** and pet Labrador **Oscar**. Two leads for later: a province, and a first name to pair with the surname he shares with his wife. |
| `emile` / `george mackenzie` | Flavour only — no further leads. |

---

## 5. Canada Newspaper Archive — open browsing

Also no login needed for its default Free account. Using the province and
first name learned from James Fletcher's bio:

5. **Archives → Alberta + `hannah`** (or `hannah fletcher`). Finds "Local
   Author Hannah Fletcher publishes Husband's Career Mysteries" — and its
   text spells out the exact title: **"Mysteries of the Old North West."**
   Now the player has both exact author + title pairs needed for Library.

---

## 6. Library — first pickup

Library never needs a login, but its search is exact author + exact title,
with no partial matching — this is why nothing here was reachable until
now. The second Library pickup, "Guardians of the North," needs a title the
player doesn't have yet — William McLeod's bio names it, and that record now
requires Level 2, so it waits until §8.

6. **Library → `Hannah Fletcher` / `Mysteries of the Old North West`**
   (from §5). Awards the **mysteriesOfTheOldNorthWest** photo. **Examine it
   closely** — "j.fletcher / oscar123" is handwritten in the corner. The
   password directly echoes the dog's name from James Fletcher's own
   bio (§4) — a nice confirming payoff, not just an arbitrary string.

---

## 7. Cashing in the Police Level 1 credentials

7. **Police Records → login `j.fletcher` / `oscar123`.** Now Level 1.
   Search `thomas orourke` (a name not yet introduced by any clue — this
   is the second place a player has to just try the case's obvious
   subject matter, i.e. searching for whoever ran the search party, rather
   than following an explicit lead). His record's body ends with a live
   link: `http://honeydewcavingclub.com`.
8. **Click the link.** The Honey Dew Caving Club page awards two photos
   automatically (the 1904 team photo and the 1912 cave map). Picking up
   the map specifically fires a fax automatically.
9. **Open Facsimile, close it.** "Message from Brian Whitmore" gives
   `b.whitmore` / `ironVeins15` — commits as Reports evidence.

---

## 8. Closing the Whitmore loop, then the Fairchild and Archive threads

10. **Police Records → login `b.whitmore` / `ironVeins15`.** Now Level 2 —
    return to both the `arthur` and `william` searches from §4, gated
    before. Search `arthur whitmore`, then **open the record** (not just
    find it — opening it is what matters); this fires a second fax. Also
    open the now-reachable `william` (or `william mcleod`) record:
    Lieutenant William McLeod's bio, whose photo caption names the exact
    book it's excerpted from — **"Guardians of the North," published in
    1988, by Cat J Roman.**
11. **Library → `Cat J Roman` / `Guardians Of The North`** (from step 10).
    Awards the **library-guardiansofthenorth** photo. **Examine it
    closely** — "Ontario apples (t.mcleod / apple1)" is handwritten beside
    it. This is the Canada Newspaper Archive Subscriber login.
12. **Open Facsimile, close it.** A second "Message from Brian Whitmore"
    gives `t.fairchild` / `mapleLaw91` (Level 3) — commits as Reports
    evidence. This used to be a dead end; it isn't any more (see below).
13. **ZoomSearch → `fairchild`** (curiosity about the surname behind the
    new login, same inference pattern as `j.fletcher` → James Fletcher and
    `t.mcleod` → McLeod). Finds **"J & T Fairchild Valuation Experts &
    Insurance Brokers."** Opening the record itself immediately awards the
    **Insurance Record Template** report — its own flavour text prints a
    demo code, `05-33-22-02-03`, and its last line links to their online
    decode book. Its final line is also a standing hint for the Route
    segment of *any* Fairchild insurance code: "we're the lucky 07 when it
    comes to Insurance" — Route `07` plus Document `02` (Insurance Policy,
    the only sensible reading given the context; the hint line itself
    writes the bare number "7," but the decode book and the record codes
    both use the padded two-digit form, `07`), remembered for step 18.
14. **Click that link.** Awards the **Insurance Decode Book** report — a
    full key explaining Fairchild's five-number codes (Colour, Object,
    Name, Document, Route, always in that order).
15. *(Optional, no new evidence.)* **Police Records → search
    `05-33-22-02-03`.** This particular demo record only requires Level 0,
    so no login is even needed — it's just a working demonstration that
    the code system in the decode book matches something real.
16. **Archives → login `t.mcleod` / `apple1`** (from step 11). Two searches
    now open up:
    - **Saskatchewan + `harry`** (or `henry` / `strange things` / `strange`,
      all established by now). Finds "Local Author publishes book with
      interesting topic!" — gives the exact title **"Strange Things Found
      In Even Stranger Places"** and confirms the author's full name,
      **Henry Whitmore**.
    - **Ontario + `mcleod`** (or `william` / `margaret` / `lieutenant` /
      `apples`). Finds "Remembering a great Guardian" — William McLeod's
      1957 obituary, the source of the gold-pendant thread ("he recovered
      a gold pendant from the search area" — a new search term), and
      displays a family polaroid whose handwritten caption identifies
      `t.mcleod` as **Teresa McLeod**, William and Margaret's daughter.
17. **Police Records → search `pendant`** (or `gold pendant`, from the
    obituary above; already logged in as `t.fairchild`, Level 3, from step
    12). Awards the **GOLD PENDANT** photo evidence: a gold pendant
    engraved **"P. A. WORTHING,"** recovered by Lt. William McLeod from the
    flooded lower section of Shaft 'B'. A new surname to chase — and, with
    the decode book in hand, three of five code segments: Gold (`09`),
    Pendant (`24`), Worthing (`49`).
18. **Police Records → search `09-24-49-02-07`** — composed from the three
    segments above plus Document/Route from step 13's hint (`02`
    Insurance Policy, `07` Fairchilds). Opens Fairchild's own insurance
    valuation for the pendant: names the original policyholder as
    **Percival Anthony Worthing** (d. 1897) and, via a later endorsement,
    his son **Anthony Worthing** — the same name already sitting
    unremarked in the 1904 club photo. Informational only, no further
    evidence.

---

## 9. Last Library pickup

19. **Library → `Henry Whitmore` / `Strange Things Found In Even Stranger
    Places`** (from §8). Awards the vandalised-page photo — see
    `story-timeline.md` §4 for the pendant connection it hints at.

At this point every fax trigger and evidence-award path that exists in the
shipped assets *and* is legitimately reachable via in-game clues has
fired. See below for what's left dangling.

---

## Current content boundary

- **Level 5 police access** (`administrator`) doesn't currently gate
  anything.
- **`insideCaveLookingBack`** has a full photo catalog entry but no unlock
  path anywhere — it can never actually be collected right now.
- **The vandalised book page** (see `story-timeline.md` §4, "Current
  mystery threads") is left dangling — nothing in the shipped content
  resolves who tore it out, even after identifying Teresa McLeod and the
  pendant's Worthing connection.

**Full evidence inventory:** 10 photos (askewAndrew, caveEntrance, "No
More!", "Search Party outside Black Pine Silver Mine Shaft B",
standalone-honeydewcavingclub-team, standalone-honeydewcavingclub,
mysteriesOfTheOldNorthWest, library-guardiansofthenorth, "Strange Things
Found In Even Stranger Places", GOLD PENDANT); 5 reports (missingReport,
fax-whitmore-police-credentials, fax-whitmore-level3-credentials,
Insurance Record Template, Insurance Decode Book); 1 story (background
story, default, never grows).

---

## Developer quick reference — shortest mechanical input sequence

For re-testing the whole game end to end without re-deriving the clue
chain above — this is the old script, kept because it's still the fastest
way to exercise every trigger during QA:

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
14. ZoomSearch → `fairchild` → open result (→ evidence: Insurance Record Template) → click the decode-book link (→ evidence: Insurance Decode Book).
15. (Optional, no evidence) Police Records → search `05-33-22-02-03` → open result (Level 0, no login needed).
16. Archives → login `t.mcleod` / `apple1` → search Saskatchewan + `strange` and Ontario + `mcleod` for the remaining lore, including the Teresa McLeod reveal.
17. Police Records → login `t.fairchild` / `mapleLaw91` → search `pendant` → open result (→ evidence: GOLD PENDANT).
18. (No new evidence) Police Records → search `09-24-49-02-07` → open result — the Worthing insurance/endorsement record.

21 evidence-relevant actions, plus the ~40s of real time for the intro
faxes. That's the entire game as of this pass, in whichever of the two
orders above suits the purpose at hand.
