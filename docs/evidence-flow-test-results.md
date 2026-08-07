# Evidence Flow Test Results

Run timestamp: 2026-08-07T13:05:13.577Z

## Creation Order
1. Evidence entries were created first through the Evidence JSON Builder tool.
2. Matching web-content records were created second through the Web Content Builder tool.
3. English tool-created evidence was mirrored to the other language report catalogs through the same evidence inject API so the strict catalog pipeline stays complete.

## Baseline Check
- Reports carousel title before web unlocks: Missing Report
- Reports carousel counter before web unlocks: 1/1

## Test Cases
### standalone
- Evidence ID: flow-standalone-award
- Web record ID: flow-standalone-page
- URL: http://standalone.local/flow-award
- Expected report title: Standalone Flow Award
- Result: PASS
- Titles seen in carousel: Missing Report | Standalone Flow Award
- Report preview: # Standalone Flow Award

This report proves standalone page visits can unlock evidence.

### zoomsearch
- Evidence ID: flow-zoom-award
- Web record ID: flow-zoom-page
- URL: http://www.zoomsearch.net/manual/flow-zoom-page
- Search query: flow zoom verification
- Expected report title: Zoom Flow Award
- Result: PASS
- Titles seen in carousel: Standalone Flow Award | Zoom Flow Award
- Report preview: # Zoom Flow Award

This report proves ZoomSearch keyword matches unlock evidence.

### library
- Evidence ID: flow-library-award
- Web record ID: flow-library-page
- Search author: Flow Archivist
- Search title: Flow Library Dossier
- Expected report title: Flow Library Dossier
- Result: PASS
- Titles seen in carousel: Zoom Flow Award | Flow Library Dossier
- Report preview: # Flow Library Dossier

This report proves Library author and title search unlocks evidence.

### police
- Evidence ID: flow-police-award
- Web record ID: flow-police-page
- Search query: flow police verification
- Expected report title: Flow Police File
- Result: PASS
- Titles seen in carousel: Flow Library Dossier | Flow Police File
- Report preview: # Flow Police File

This report proves Police keyword search unlocks evidence.

### archives
- Evidence ID: flow-archives-award
- Web record ID: flow-archives-page
- Search query: flow archives verification
- Province: Saskatchewan
- Expected report title: Flow Archives Bulletin
- Result: PASS
- Titles seen in carousel: Flow Police File | Flow Archives Bulletin
- Report preview: # Flow Archives Bulletin

This report proves Newspaper province and keyword search unlocks evidence.

## Runtime Errors
- Console errors: 0
- Page errors: 0

## Overall Result
- PASS
