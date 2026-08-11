# Story Timeline & Character Audit

A snapshot of every character, date and connection findable in the shipped
assets as of **11 August 2026** (third pass). This is a developer reference,
not player-facing content — it exists to keep new faxes, records and photos
consistent with what's already been written, and it will go stale as soon as
new content lands. Re-derive it (or at least re-check the "Known gaps and
inconsistencies" section) after any story-content pass, rather than trusting
it blindly.

Since the previous pass: Harry Whitmore's 1907 book is now fully coded (it
was a planned-but-missing item before), a new McLeod-pendant mystery thread
was added, and several previously-flagged issues are now resolved —
`arthurWhitmore.png`'s path case now matches the file on disk, the McLeod
apple-orchard photo path now correctly points under `assets/photos/` and the
file exists, William McLeod's death year is consistent (1957) everywhere,
and the "Guardians of the North" evidence is awarded from the library record
itself rather than the unrelated newspaper article that briefly held it.

Sources audited: `assets/story_en.md`, `assets/reportsEvidences_en.json`,
`assets/photos_evidences_en.json`, `assets/web-content/{zoomsearch,library,
police,archives,standalone-pages}.json`, and the photo files under
`assets/photos/` / `rawResources/` including the ones not yet wired into any
catalog.

---

## 1. Timeline

Dates are in-fiction. Where a source only implies a date (e.g. "during his
career"), that's noted rather than invented.

| Date | Event | Source |
| --- | --- | --- |
| 1798 | Whitmore & Sons Iron & Machinery Co. founded. | `standalone-pages.json` (whitmoresonsironmachineryco) |
| c. 1840 onward | Whitmore machinery supplies the Black Pine Silver Mine. | same |
| c. 1877 | Photo of the Whitmore & Sons Foundry. | `photoPath: whitmoreSonsIronCo.png` |
| 1 Jul 1851 | Black Pine Silver Mine officially declared "Exhausted" after two months with no new seams; extraction machinery scheduled for dismantling. | `zoomsearch.json` (silvermineentrance), photo `caveEntrance1851.png` ("No More!") |
| 12 Aug 1888 | Andrew John Spencer born. | `reportsEvidences_en.json` (missingReport) |
| 6 Nov 1891 | Askew Arnold "Arnie" Spencer born. | same |
| pre-1901 | John & Diane Spencer leave banking/Toronto for a farm near Black Pine, Saskatchewan; raise Andrew and Arnie there. Employ two farmhands, Simon and Tony, in their early thirties. | `story_en.md` |
| Jul 1901 (day 1) | The boys, exploring the forest, are chased off the known path by a large animal and stumble on a hidden, overgrown cave entrance. They agree to keep it secret and return the next day. On the way home they describe the cave and the "bottomless" hole at its back to a stranger on the path, who warns them to be careful and says he hasn't heard the old mine mentioned "in years." | `story_en.md` |
| 27 Jul 1901 (afternoon) | Both boys enter the abandoned B Shaft. Andrew returns to Spencer Farm alone, severely injured (deep scratches, a long leg cut, left hand nearly severed), and collapses recounting the story before losing consciousness partway through. Arnie is never found. | `story_en.md`; `reportsEvidences_{en,de,es,fr,it}.json` (missingReport) |
| 28 Jul 1901 | Andrew dies of his injuries at the farm; cause (blood loss/shock) confirmed by the local Coroner. No explanation is ever established for the exact circumstances of his injuries. | same |
| Aug 1901 | NWMP search party works the cave and the old mine. Sgt. Arthur Whitmore leads part of the search into the forest and is among the first to examine the cave; known for meticulous notes and local mining history knowledge. He is believed to have personally taken the search-party photo, which is why he isn't in it — letting police photographer John Baxley (normally behind the camera) appear instead. Cpl. Thomas O'Rourke, an avid caver/cave diver, and Lt. William McLeod are also part of the search. **McLeod recovers a gold pendant from the search area** — a detail that never made it into the official case file (see "Current mystery threads" below). | `police.json` (arthurwhitmore, thomasorourke, williammcleod); `zoomsearch.json` (johnbaxley); `archives.json` (williammcleodfindpendant) |
| Aug 1901 | "Cave Entrance" photographed by police photographer John Baxley. | `photos_evidences_en.json` (caveEntrance) |
| Summer 1901 | The only known photo of Andrew and Arnie Spencer together, taken at the Spencer family farm. | `photos_evidences_en.json` (askewAndrew) |
| 27 Oct 1901 | NWMP "three months" progress report filed on the missing-person case (case no. 01-2710-00): still open, Arnie presumed dead. Evidence recovered: a white cotton handkerchief, a wooden varnished lunchbox, 40 ft of hemp rope, an unlit straw torch soaked in fuel oil. **No mention of McLeod's pendant.** | `reportsEvidences_{en,de,es,fr,it}.json` (missingReport) |
| 1901 onward | The search for Arnie continues for years in a steadily more informal, "casual weekend divers" fashion, with no leads found in the mine; the case eventually goes cold. | `police.json` (thomasorourke) |
| 1902 | Thomas O'Rourke founds the Honey Dew Caving Club in Saskatchewan. Not normally permitted into the high-profile, still-active Black Pine system, the club sneaks in occasionally over the following decade. | `standalone-pages.json` (honeydewcavingclub); `police.json` (thomasorourke) |
| 1903 | Henry "Harry" Whitmore, Arthur's eldest son, photographed on vacation at Niagara Falls. | `zoomsearch.json` (henrywhitmore), photo `harryWhitmore.png` |
| 1904 | Honey Dew Caving Club team photo. Top row: Thomas O'Rourke, Simon Cresswell, Henry Whitmore, Robert Johnstone. Bottom row: Unknown, Anthony Worthing, Sam Henderson, Paul Greenwood. | photo `honeydewcavingclub.png` |
| by 1905 | Arthur Whitmore is a respected Sergeant, valued for his knowledge of the surrounding country. | `police.json` (arthurwhitmore) |
| 1906 | Hannah Fletcher — wife of NWMP search-party member and eventual retiree James Fletcher — publishes *Mysteries of the Old North West*, interviewing search-party witnesses about cold cases. Her husband's interview reveals a detail that contradicts the official account: **four sets of footprints, two of them adult**, found at the cave — versus witness accounts insisting only the two boys went in alone. | `library.json` (mysteryoldnw, `publicationYear`); `archives.json` (hannahfletcher, `date`) |
| **1907** | Henry "Harry" Whitmore — having already forgone his inheritance in favour of writing — publishes ***Strange Things Found In Even Stranger Places***, a "wacky compendium" of fifty stories about objects and fossils turning up where they have no business being. The library's own copy has since had a page **torn out and vandalised**; a librarian's note asks anyone who knows who damaged it to come forward. The catalog description of that vandalised page directly names it as relating to **McLeod's 1901 gold pendant** — the book may be the missing link between the pendant and the case file that never recorded it. | `library.json` (strangethingsfoundinevenstrangerplaces); `archives.json` (henrywhitmore); photos `henryStrangeThings.png`, `strangethingsinevenstrangerplaces.png` |
| 1911 | Cpl. Thomas O'Rourke dies in an abseiling accident in France while on vacation with his wife (photographed boarding the RMS *Tunisian* at Québec City Harbor beforehand). Posthumously awarded a Medal of Honor for contributions to policing. | `police.json` (thomasorourke), photo `thomasorourke.png` |
| 1912 | Henry Whitmore formally passes control of Whitmore & Sons to his younger brother Jerome, stepping aside from the family business to remain an author/naturalist. | `zoomsearch.json` (henrywhitmore, jeromewhitmore) |
| 1912 | Honey Dew Caving Club, without its founder, is formally defunct. Its defining achievement — the hand-drawn Black Pine Cave System Collective Map, painstakingly assembled 1902–1911 — is released and handed to police in hopes of reviving the cold case. | `standalone-pages.json` (honeydewcavingclub); `photos_evidences_en.json` (standalone-honeydewcavingclub) |
| 1915 | Cpl. Emile Beaulieu retires from the NWMP and becomes a professional climber. | `police.json` (emilebeaulieu) |
| Jun 1920 | Lt. William McLeod receives his Certificate of Honour at his NWMP retirement presentation (later reproduced in the 1988 book *Guardians of the North* by Cat J Roman). He and wife Margaret settle near Maple Grove, rural Ontario. | `police.json` (williammcleod), photo `williamMcLeod.png`; `zoomsearch.json` (margaretmcleod) |
| 1928 | John Baxley retires from the NWMP and joins the "Forestry Imaging Enthusiasts" photography club. | `zoomsearch.json` (johnbaxley) |
| 1931 | Cpl. George Mackenzie retires from the NWMP. | `police.json` (georgemackenzie) |
| 1934 | Constable James Fletcher retires from the NWMP, having been awarded the King's Police Medal for his role in the 1901 search effort. Settles in Gray Stacks, Alberta with wife Hannah (Fletcher, the author — see above) and pet Labrador Oscar. | `police.json` (jamesfletcher) |
| 1951 | James Fletcher dies. | `police.json` (jamesfletcher) |
| 1952 | George Mackenzie, aged 80, has his celebrated moustache measured before a crowd at a local sports hall. | photo `georgemackenzie.png` |
| 1954 | George Mackenzie dies. | `police.json` (georgemackenzie) |
| 1955 | Emile Beaulieu dies, aged 84. | `police.json` (emilebeaulieu) |
| 1957 | William McLeod dies peacefully, aged 87. Remembered in an obituary in the *Maple Grove Times* ("Remembering a great Guardian") for his steady leadership and for recovering the gold pendant during the 1901 search. Margaret continues the orchard/property alone. | `police.json` (williammcleod); `zoomsearch.json` (margaretmcleod); `archives.json` (williammcleodfindpendant) |
| 1963 | Jerome Whitmore dies; his son Brian succeeds him as president of Whitmore & Sons, keeping the company line in Jerome's branch rather than reverting to Henry's. | `zoomsearch.json` (brianwhitmore) |
| c. 1965 | Henry "Harry" Whitmore dies, having spent his life as an author/naturalist and Honey Dew Caving Club associate. | `zoomsearch.json` (henrywhitmore) |
| 1972 | *Rockface Monthly* posthumously features the late Emile Beaulieu on its cover, after interviewing her daughter — the only known photograph of her. | `police.json` (emilebeaulieu) |
| 1982 | Brian Whitmore photographed signing a contract at the Whitmore Refinery. | photo `brianWhitmore.png` |
| 1988 | *Guardians of the North*, by Cat J Roman, published — a retrospective collection of NWMP personal accounts and photographs, including McLeod's retirement photo. | `library.json` (guardiansofthenorth, `publicationYear`); `police.json` (williammcleod) |
| present day (game's "now") | Brian Whitmore "continues to lead the family business today." The player — an unnamed investigator who comes across a copy of the 1901 missing-person report — begins looking into the Arnie Spencer case, contacted twice by fax from Brian Whitmore offering escalating police-database access. | `zoomsearch.json` (brianwhitmore); `reportsEvidences_en.json` (fax-welcome-arnie-tragedy, fax-whitmore-police-credentials, fax-whitmore-level3-credentials) |

---

## 2. Character index

### The Spencer family (the case)
- **Andrew John Spencer** (b. 12 Aug 1888 – d. 28 Jul 1901) — elder brother. Returns from the cave fatally injured; his account of the second visit, cut short when he loses consciousness, is the only first-hand record of what happened.
- **Askew Arnold "Arnie" Spencer** (b. 6 Nov 1891 – missing 27 Jul 1901, presumed dead) — the missing boy the entire case centers on.
- **John & Diane Spencer** — the boys' parents; ex-banker turned farmer and his wife. Diane's reaction ("You'll never set foot in that forest again!") is the story's most direct emotional beat.
- **Simon** and **Tony** — the Spencers' two farmhands, early thirties, present the morning the boys leave for the cave the second time. *Possible unconfirmed link:* a "Simon Cresswell" appears in the 1904 Honey Dew Caving Club photo — same first name, same district, plausible timeframe — but nothing in the assets confirms they're the same person. Worth deciding deliberately rather than by coincidence if this thread gets developed.
- **The stranger on the path** — unnamed man who tells the boys about the "bottomless" hole and the old mine, then vanishes into the trees. Never identified or revisited by any other asset. A loose thread by construction.

### North-West Mounted Police (the searchers)
- **Sgt. Arthur Whitmore** — led part of the 1901 search, examined the cave, presumed photographer of the search-party photo. Arthur's grandson Brian later faxes the player for "information about our grandpa." Father of Henry and Jerome Whitmore (see family tree below).
- **John Baxley** — police diver/photographer, worked the scene; later a founding-era member of "Forestry Imaging Enthusiasts," retiring from the NWMP in 1928.
- **Cpl. Thomas O'Rourke** — search-party diver, founder of the Honey Dew Caving Club, dies in France in 1911; posthumous Medal of Honor.
- **Constable James Fletcher** — search participant, later awarded the King's Police Medal, retires 1934, dies 1951. Husband of author Hannah Fletcher.
- **Cpl. Emile Beaulieu** — later a celebrated professional climber; retires 1915, dies 1955.
- **Lt. William McLeod** — frontier officer, recovered a gold pendant during the 1901 search that never made it into the case file, retires with honour in 1920, settles in Ontario with wife Margaret, dies 1957 aged 87 (obituary: "Remembering a great Guardian," *Maple Grove Times*).
- **Cpl. George Mackenzie** — quietly dependable service, retires 1931, dies 1954; locally famous for the longest moustache in Canada.
- **Administrator / t.fairchild / t.mcleod** — police- and archive-database accounts with no attached character yet. `t.fairchild` (police, Level 3, `mapleLaw91`) is credentials Brian Whitmore passes along, sourced from an unnamed contact. `t.mcleod` (archives Subscriber account, `apple1`) shares William McLeod's surname closely enough to suggest a descendant, but nothing confirms it. Both are loose threads ready to be given a face later.

### The Whitmore family (the benefactors)
```
Sgt. Arthur Whitmore (NWMP; searched for Arnie, 1901)
 ├─ Henry "Harry" Whitmore (b. ?, d. c.1965) — eldest son, author/naturalist,
 │   Honey Dew Caving Club associate. Published "Strange Things Found In Even
 │   Stranger Places" (1907), a fifty-story compendium of things found where
 │   they shouldn't be. Passed the family business to Jerome in 1912.
 └─ Jerome Whitmore (d. 1963) — younger son, took over Whitmore & Sons in 1912
     └─ Brian Whitmore — Jerome's son, president "today." Sends the player two
        faxes with escalating police-database credentials (b.whitmore /
        ironVeins15, Level 2; then t.fairchild / mapleLaw91, Level 3).
```
The Whitmore & Sons standalone page calls Arthur "Grandpa" and Harry "Uncle"
from Brian's voice, which is consistent with this tree (Harry is technically
Brian's great-uncle, but "Uncle" reads as the informal family term).

### Authors, family, and everyone else
- **Hannah Fletcher** — author of *Mysteries of the Old North West* (1906); James Fletcher's wife, living with him in Gray Stacks, Alberta.
- **Margaret McLeod** — William's wife, ran an apple orchard near Maple Grove, Ontario.
- **Honey Dew Caving Club, 1904 roster** — Thomas O'Rourke, Simon Cresswell, Henry Whitmore, Robert Johnstone, Anthony Worthing, Sam Henderson, Paul Greenwood, plus one still-unidentified member. Only O'Rourke and Henry Whitmore have any further biography elsewhere.
- **Cat J Roman** — author of *Guardians of the North* (1988), the source of McLeod's retirement photo. No other appearances.

---

## 3. Current mystery threads

Things that read as deliberate, unresolved hooks rather than mistakes —
worth knowing about so future content doesn't accidentally "solve" or
contradict them before they're meant to be addressed.

- **The gold pendant.** William McLeod recovered a gold pendant during the August 1901 search (per his 1957 obituary), but the official three-month case report filed that October lists only a handkerchief, a lunchbox, rope and a torch — no pendant. Its ownership is described as "classified... due to the investigation officially still remaining open."
- **The vandalised page.** The library's copy of Harry Whitmore's 1907 book has had a page torn out. The catalog description of that missing page explicitly ties it to McLeod's pendant, making the book a plausible link between the pendant and the case that never recorded it. Nobody in the shipped content is on record as knowing who vandalised it.
- **Simon the farmhand vs. Simon Cresswell.** Possibly the same person, possibly not — see the character index above.
- **The stranger on the path.** Warns the boys about the hole, admits he hasn't heard the mine mentioned "in years," and is never seen again.
- **t.fairchild and t.mcleod.** Two named-but-faceless database accounts, introduced purely as credentials rather than characters.

---

## 4. Known gaps and inconsistencies still open

These are observations, not fixes — flagging them here rather than silently
editing content that may be intentional or already slated for a rewrite.

None outstanding as of this pass. The two previously listed here —

---

## 5. Source map

| File | What it covers |
| --- | --- |
| `assets/story_en.md` | The 1901 tragedy, told in-scene (background story evidence). |
| `assets/reportsEvidences_{en,de,es,fr,it}.json` | The NWMP missing-person report; the three scripted faxes (welcome, Level 2 credentials, Level 3 credentials). |
| `assets/photos_evidences_en.json` | Catalog metadata (captions/descriptions) for every photo evidence item. |
| `assets/web-content/police.json` | NWMP personnel records, gated by login privilege level (0–5). |
| `assets/web-content/zoomsearch.json` | General-web search results — mostly the extended Whitmore family and search-party members' later lives. |
| `assets/web-content/library.json` | Hannah Fletcher's, Cat J. Roman's and Harry Whitmore's books. |
| `assets/web-content/archives.json` | Newspaper coverage of the above, plus the McLeod pendant obituary — gated by subscriber access level. |
| `assets/web-content/standalone-pages.json` | Whitmore & Sons' own site; the Honey Dew Caving Club's own site. |
