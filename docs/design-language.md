# CR-CIPI design language: "El sello"

**Brand truth.** Costa Rica's private sector, vouching for its own, so
international investors can arrive with confidence.

**Metaphor.** The passport stamp. Paper, ink, an embossed seal that says
"verified", and one red mark for the action that matters.

## System (tokens in `styles/globals.scss`)

| Layer | Rule |
| --- | --- |
| Type | Instrument Serif for display at extreme scale (`--step-hero`, `--step-1`…), Geist for everything else. Two families, never three. Italic serif = the voice leaning in (current page, the thesis). |
| Colour | `--ink`, `--paper`, `--trust` (navy, "verified"), `--accent` (red). Accent is **only** for the primary action on a screen. Secondary text `--ink-2/3` all pass 4.5:1 on paper. |
| Grid | 12 columns desktop / 4 mobile, sometimes drawn faintly (home hero). Sections breathe at `--section-pad`. |
| Texture | One global paper grain (`body::after`, 4.5%). |
| Brand mark | `components/brand/Seal.tsx`: real text on a circular path; turns only with scroll. The flag stripes from the logo (navy · red · navy) are the only other ornament. |
| Motion | One curve (`--ease-out`), durations `--dur-xs…l`. Transform/opacity/clip-path only. Reveals use CSS scroll-driven animation (`.reveal`, `ScrollWords`) and render the final state where unsupported or under reduced motion. Nothing moves on its own for more than 5 s. |
| Buttons | `.btn` + `--primary` (red, sweeps to ink) or `--ghost`; one primary per view. Secondary actions are underlined text links. |
| Eyebrows | Short tracked markers with a chapter index ("03 — Why join"). Never sentences. |

## Per-page signature (one each, everything else quiet)

| Page | Signature |
| --- | --- |
| Home | Seal turning with scroll; manifesto that brightens line by line; initiatives as an opening index |
| About | Believe / Objective / Way cards that stack as you scroll |
| Join | Sticky split: the pitch holds while the form scrolls |
| Directory | A register: search-first index, verified members stamped |
| Jobs | Departures board |
| Insights | Editorial magazine index |
| Legal | Reading mode: table of contents + progress |
| 404 | Off the map: coordinates |
| Sign in | One-input code entry |
| Provider profile | Passport data page: labelled fields, stamp over the corner, machine-readable zone; letter-of-introduction contact form pinned beside it |
| Register | Registry dossier: three numbered tabs over one sheet, legal id set like a document number, "Registrada" stamp to finish |
| Consoles | Calm dashboards in the same tokens; ink side rail, numbered, six items max |
| Leads inbox | Reply-time clocks on top, list / letter split, overdue in red |
| Trust seal | Ink panel: score ring, five pillar bars, "raise your score" |
| How it works | Side sheet (native dialog) with self-ticking checklist |
| Reviews (admin) | Sorting-office lanes, oldest first |
| Members (admin) | Ledger rows with a five-bar score glyph |
| Monthly reports | Printed report: month in large serif, numbered chapters of figures, month-on-month change |

## Don'ts (what the old site did)

- All-caps display headlines; two equal-weight CTAs; red on links, labels and
  badges; light-grey body text; walls of text; motion without a reduced-motion
  path; new JS animation libraries where CSS suffices.
- CMS: every editable string stays wrapped in `EditableText`/`EditableList`
  with its original path. Visual splitting (e.g. word reveals) falls back to a
  plain editable element in edit mode.
