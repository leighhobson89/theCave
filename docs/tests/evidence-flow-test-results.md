# Evidence Flow Test Results

Run timestamp: 2026-08-07T13:20:34.539Z

## Creation Order
1. Photo evidence was created first through the Evidence JSON Builder tool.
2. Report evidence was created second through the Evidence JSON Builder tool.
3. Matching web-content records were created afterward through the Web Content Builder tool.
4. Localized support entries for the strict catalog pipeline were mirrored through the evidence inject API.

## Baseline Check
- Reports carousel title before unlocks: Missing Report
- Reports carousel counter before unlocks: 1/1
- Photos carousel title before unlocks: Cave Entrance
- Photos carousel counter before unlocks: 1/2

## Test Cases
### standalone photo award
- Evidence ID: proof-photo-award
- Web record ID: proof-standalone-photo-page
- URL: http://standalone.local/proof-photo-award
- Result: PASS
- Titles seen in photos carousel: Cave Entrance | Inside Cave Looking Back | Proof Photo Award
- Description preview: Proof photo evidence created through the Evidence JSON Builder tool.
- Image source: ./assets/photos/caveEntrance.png

### zoomsearch report award
- Evidence ID: proof-report-award
- Web record ID: proof-zoom-report-page
- Search query: proof report award query
- Result: PASS
- Titles seen in reports carousel: Missing Report | Proof Report Award
- Report preview: # Proof Report Award

This report proves the updated builder still awards report evidence correctly.

## Runtime Errors
- Console errors: 0
- Page errors: 0

## Artifacts
- Video: evidence-flow-test-video.webm

## Overall Result
- PASS
