# ClassActions.com.au Newswire Source and Lifecycle Signal Detection

This document describes two related pieces of work on this branch:

1. A new discovery source that finds AI-related Australian class actions from ClassActions.com.au's newswire page.
2. A detector that checks newswire coverage against cases already being tracked, and proposes lifecycle status updates (for example, when a case is reported settled) for a human to confirm.

Both pieces share the same page-parsing code but serve different purposes: one finds new cases, the other updates existing ones.

## Background

The existing ingestion pipeline (`backend/src/case-ingestor.ts`, run via `npm run ingest`) pulls from official sources: Federal Court RSS, Queensland CaseLaw, the High Court, and media releases from ASIC, ACCC, OAIC, and eSafety. These are all filing- or announcement-stage sources.

Class actions are the dominant form AI-related Australian litigation has taken so far (for example, Clearview, Bunnings facial recognition, Metigy), so a class-action-specific source was worth adding. Two candidates were evaluated:

- `fedcourt.gov.au`'s own class actions list: an official, government-maintained list, but it sits behind a Cloudflare bot challenge on this subdomain (returns HTTP 403 with `cf-mitigated: challenge`). The Federal Court's judgments RSS feed, on a different subdomain, is unaffected and continues to work. Getting past the challenge would require a headless browser, which was judged disproportionate to how rare these cases are. This source was skipped.
- ClassActions.com.au's newswire page: a plain server-rendered page with no bot protection, listing press coverage of Australian class actions grouped by matter. This was adopted.

## Part 1: Newswire discovery source

### What it does

`ClassActionsNewswireIngestor` (in `backend/src/case-ingestor.ts`) fetches `https://classactions.com.au/newswire` and extracts every news item, both the featured "hero" item and each `article.nw-card` in the feed. A single matter (for example, "Coles 'Down Down' Promotion Class Action") is often covered by dozens of separate press articles. To avoid flooding the triage queue with near-duplicate candidates, items are grouped by their matter link, and only the newest mention of each matter is kept.

The newest mention of each matter is then checked against the same `AI_SIGNAL_PATTERNS` keyword list already used for ASIC, ACCC, OAIC, and eSafety. Matters that don't mention AI, automated decision-making, facial recognition, or similar terms are discarded. Matters that do match become a `CaseData` object with:

- `caseName`: the matter's official name (not the headline of whichever article happened to be newest)
- `url`: the ClassActions.com.au matter page, used later for deduplication and for matching lifecycle signals (see Part 2)
- `court`: read from the coverage text where a specific court is named (Federal Court, a state Supreme Court, and so on), with a generic fallback when none is mentioned
- `sourceType`: `"Media coverage"`, `sourceCategory`: `"Media"`, `courtLevel`: `"Media"` — new labels distinguishing this from court records and regulator releases

This source is registered in `CaseIngestor`'s default source list alongside the existing ones, so it runs automatically with `npm run ingest`.

### Key files

- `backend/src/case-ingestor.ts`: `extractNewswireItems`, `latestNewswireItemsByMatter`, `extractClassActionsNewswireCases`, `ClassActionsNewswireIngestor`
- `backend/src/case-ingestor.test.ts`: unit tests using a fixture page

## Part 2: Lifecycle signal detection

### The problem

Once a class action from ClassActions.com.au becomes a tracked `Case`, its `caseLifecycleStatus` field (one of `Active`, `Pending`, `Settled`, `Dismissed`, `Closed` — the values the case list and filters already use) never updates automatically. If a matter is later reported settled or dismissed, nothing in the pipeline notices.

### Design: propose, don't auto-publish

An earlier design considered writing straight to `caseLifecycleStatus`, or logging the change as a normal `Event` (the model already used for the public case timeline). Both were rejected for the same reason: nothing in this pipeline should change what's shown as fact on the public site based on an automated keyword match against press paraphrasing, without a person confirming it first. This mirrors how the rest of the app already works — a scraped item never becomes a published `Case` directly, it becomes a `CaseCandidate` that a person accepts or rejects.

The `Event` model gained two fields to support this:

- `verificationStatus` (default `"Unverified"`), the same pattern `Source.verificationStatus` already used
- `suggestedLifecycleStatus`, the status the detector believes the coverage reports

The public case page (`GET /api/cases/:slug`) now only returns events where `verificationStatus` is `"Verified"`. An automatically-logged event is invisible on the public site until a person confirms it through the review page. This holds even though, today, the person triaging and the person viewing the site are the same user — the point of the gate is the deliberate confirmation step, which is what will matter once those become different people.

### How detection works

`backend/src/detect-lifecycle-signals.ts` (run via `npm run detect-lifecycle-signals`):

1. Fetches the newswire page and extracts the newest item per matter, exactly as Part 1 does.
2. Looks up which of those matter URLs already appear as a `Source.url` on some `Case` — this is how a newswire matter is matched back to a case you track, using the link that was already stored when the candidate was accepted. No new field was needed for this.
3. For each matched matter, checks the coverage text for settlement, dismissal, or closure language (`detectLifecycleStage` in `case-ingestor.ts`).
4. If the coverage reports a different status than the case currently has, and no event has already been logged for that case on that date, logs a new `Event` with `verificationStatus: "Unverified"` and `suggestedLifecycleStatus` set to the detected status.

The planning step (deciding which updates to propose) is a pure function, `planLifecycleSignalUpdates` in `backend/src/lifecycle-signals.ts`, kept separate from the database reads and writes so it can be unit tested directly (`backend/src/lifecycle-signals.test.ts`).

### Key files

- `backend/src/lifecycle-signals.ts` / `.test.ts`: pure planning logic
- `backend/src/detect-lifecycle-signals.ts`: CLI that fetches the page, queries the database, and writes events
- `backend/src/index.ts`: `GET /api/events`, `POST /api/events/:id/verify`, `POST /api/events/:id/dismiss`; the events filter on `GET /api/cases/:slug`

## Part 3: The lifecycle stage tree

Confirming a detected event needs somewhere to put the result. Rather than overwriting a single flat status field, a case's procedural history is kept as a dated, branching tree: `Filed → Certified → Trial → Judgment/Settled/Dismissed/Closed`, where a stage can have more than one child - for example a trial branching into a judgment on one path and parallel settlement talks on another, or a judgment branching into an appeal.

### Why not just widen `caseLifecycleStatus`

`Case.caseLifecycleStatus` already has five values (`Active`, `Pending`, `Settled`, `Dismissed`, `Closed`) baked into the filter sidebar, the dashboard's "active cases" count, and the case list badge. Rather than widen that vocabulary everywhere it's read, the new `LifecycleStage` model uses its own fuller vocabulary (`Filed`, `Certified`, `Trial`, `Judgment`, `Settled`, `Dismissed`, `Closed`), and `coarseStatusForStage` (in `backend/src/lifecycle-stages.ts`) maps each fine-grained stage onto the existing five-value field whenever a stage is added. Nothing that already reads `caseLifecycleStatus` needed to change.

### Data model

`LifecycleStage` (one row per stage): `caseId`, an optional `parentId` pointing at another stage on the same case, `status`, `stageDate`, `notes`, and `source` (`"Manual"` or `"Newswire detector"`). `buildLifecycleStageTree` (pure, unit tested in `backend/src/lifecycle-stages.test.ts`) assembles a case's flat rows into the branching structure, newest-created first at every level.

### Two ways a stage gets added

- **Manually**: `POST /api/cases/:id/lifecycle-stages` with `{ parentId, status, stageDate, notes }`. `parentId` can be any existing stage on that case, not just the latest one, which is what makes branches possible.
- **From a confirmed newswire signal**: `POST /api/events/:id/verify` (see Part 2) now adds a stage instead of writing `caseLifecycleStatus` directly - attached as a child of whichever stage was most recently added, dated to the article's publish date, tagged `source: "Newswire detector"`, with the article excerpt carried over as the stage's notes.

Both paths go through the same table and the same coarse-status mirroring, so the tree doesn't end up with two different notions of "what happened."

### The `/admin/lifecycle` page

Search for a case by name (reuses the existing `GET /api/cases?query=` search). Selecting one shows:

- Any newswire-detected changes for that case still awaiting confirmation, inline, with a status dropdown (pre-filled with the detected guess but editable) and a confirm/dismiss action.
- The procedural history tree, newest stage first, each node dated, branches shown by indentation.
- A form to add a stage directly, attached to any existing node via an "Attach after" dropdown (defaults to the latest one).

Below the search box, a global list still shows every unresolved newswire signal across all cases, for working through them without knowing in advance which case they belong to.

### Key files

- `backend/src/lifecycle-stages.ts` / `.test.ts`: `LifecycleStageType` vocabulary, `coarseStatusForStage`, `buildLifecycleStageTree`, `latestLifecycleStage`
- `backend/src/index.ts`: `GET`/`POST /api/cases/:id/lifecycle-stages`
- `frontend/src/app/admin/lifecycle/page.tsx`: search, tree rendering, add-stage form, inline confirmation
- `frontend/src/actions/admin.ts`: `getLifecycleStages`, `addLifecycleStage`

## Running it

```
cd backend
npm run ingest                      # discover new AI-related class actions (Part 1, among other sources)
npm run detect-lifecycle-signals    # check tracked matters for reported status changes (Part 2)
```

Then visit `/admin/lifecycle`, search for a case, and either confirm what the detector found or add a stage by hand (Part 3).

## Known limitations

- Stage detection is a keyword match ("settlement", "dismissed", "concluded", and close variants) against the article headline and excerpt. It handles the common reversal case explicitly (a settlement reported as rejected, thrown out, or fallen through reads as "Dismissed", not "Settled"), but it can still miss phrasing it has no pattern for. This is exactly why confirmation is required rather than automatic.
- At most one unverified lifecycle event is kept per case at a time. If a case already has a pending event and a later run detects a further change, that event is updated in place with the newest coverage rather than left alongside a second, possibly contradictory one — so the review queue never shows two stale, conflicting suggestions for the same case.
- A matter is only matched to a tracked case if that case has a `Source` row whose URL is the same ClassActions.com.au matter page. A case that predates this feature, or was accepted from a different source, will not be matched even if it covers the same matter, unless a `Source` pointing at that matter page is added to it separately.
- The fedcourt.gov.au class actions list remains unfetched due to its bot challenge; it was evaluated and explicitly skipped rather than overlooked.
