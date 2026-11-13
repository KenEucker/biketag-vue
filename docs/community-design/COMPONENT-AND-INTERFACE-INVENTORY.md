# BikeTag Component and Interface Inventory

**Reviewed:** November 12, 2026  
**Source branch:** `production`  
**Purpose:** Give community designers and maintainers a practical map of the existing BikeTag screens and Vue components. This is an inventory of the current application, not a proposed replacement architecture.

## How to use this inventory

- Start with the interface map to understand where a design contribution would appear.
- Use the component inventory to identify the existing Vue component closest to the element you want to change.
- Treat component reuse classifications as guidance, not permission to move components into the published package.
- For visual-only contributions, a sketch, screenshot, annotated image, or mockup is a valid starting point. Code is not required.
- Preserve current application behavior. A visual proposal should not silently change navigation, game rules, submission steps, permissions, or data.

## 1. Interface map

The application uses route-level Vue views in `src/views/`. The table below groups the routes by the experience they represent. Routes and view mappings come from `src/router/index.ts`.

### Game discovery and public information

| Screen | Route | View | Existing components directly imported by view |
|---|---|---|---|
| Game landing / game selection | `/` | `Landing.vue` | `BikeTagButton`, `BikeTagBlurb`, `BikeTagGames`, `BikeTagMap` |
| About BikeTag | `/about` | `About.vue` | `BikeTagButton`, `BikeTagGames`, `BikeTagMap`, `SectionContent` |
| How to play | `/howtoplay` | `HowToPlay.vue` | `BikeTagIcon`, `BikeTagMap` |
| Worldwide | `/worldwide` | `Worldwide.vue` | No local component imports identified |
| Map | `/map` | `Map.vue` | `SectionContent`, `BikeTagButton`, `BikeTagMap` |
| Privacy / terms / conduct | `/privacy`, `/terms`, `/code-of-conduct` | `ProjectDocument.vue` | Shared document renderer; aliases exist for privacy and terms |

### Playing and viewing the current game

| Screen | Route | View | Existing components directly imported by view |
|---|---|---|---|
| Current tag / game home | `/:tagnumber?` | `Home.vue` | `BikeTag`, `BikeTagButton`, `BikeTagFooter`, `BikeTagHeader`, `BikeTagLabel`, `ExpandableImage` |
| Play / join / submit | `/play` | `Play.vue` | `BikeTagButton`, `BikeTagIcon`, `BikeTagQueue`, `QueueFound`, `QueueJoined`, `QueueMystery`, `QueueRejectionAlert`, `QueuePosted`, `QueuePostedShare`, `QueueSubmit` |
| Round / queue status | `/round` | `Round.vue` | `QueueView`, `BikeTagIcon` |
| Browse tags | `/biketags`, `/biketags/search` | `BikeTags.vue` | `BikeTag`, `Searchable` |
| Browse players | `/players`, `/players/search` | `Players.vue` | `Searchable`, `BikeTagPlayer` |
| Player profile | `/player/:name`, `/player/:name/search` | `Player.vue` | `BikeDex`, `BikeTag`, `BikeTagAchievement`, `BikeTagPlayer`, `Searchable` |
| Leaderboard | `/leaderboard` | `Leaderboard.vue` | `BikeTagPlayer` |

### Account and administration

These routes are conditionally registered when authentication is enabled. They are useful for a complete design review, but should not be the first focus of a public community redesign.

| Screen | Route | View | Existing components directly imported by view |
|---|---|---|---|
| Login / logout | `/login`, `/logout` | `Login.vue`, `Logout.vue` | No local component imports identified |
| Profile | `/profile` | `Profile.vue` | No local component imports identified |
| Ambassador dashboard | `/dashboard` | `Dashboard.vue` | No local component imports identified |
| Game settings | `/settings` | `GameSettings.vue` | `BikeTagButton` |
| Approve queue | `/approve` | `Approve.vue` | `BikeTagButton`, `QueueApprove` |
| Rejections | `/rejections` | `Rejections.vue` | Confirm direct imports before design work |
| Edit tag | `/edit` | `Edit.vue` | `BikeTag`, `BikeTagButton`, `EditBikeTag` |
| New tag | `/new` | `New.vue` | `BikeTagButton`, `EditBikeTag` |
| Delete tag | `/delete` | `Delete.vue` | Confirm direct imports before design work |
| Launch game | `/launch` | `Launch.vue` | Confirm direct imports before design work |
| Queue repair | `/queue-fix` | `QueueFix.vue` | Confirm direct imports before design work |
| Email test | `/email-test` | `EmailTest.vue` | No local component imports identified |
| Tag metadata | `/tag-metadata` | `TagMetadata.vue` | No local component imports identified |
| API explorer | `/api/:endpoint(.*)*` | `ApiExplorer.vue` | No local component imports identified |

**Note:** The component column lists local components directly imported by each view, not every nested descendant. A view can render a component that itself imports other components. Some administrative imports should be rechecked before the inventory is treated as a dependency graph.

## 2. Existing component inventory

There are 35 Vue files in `src/components/`. The classifications below are intended to help contributors find the right starting point.

### A. Visual building blocks

These are the most promising starting points for visual design contributions. Their styling can often be explored without changing game workflows, though their actual dependencies still need review.

| Component | Current role | Initial design priority | Notes |
|---|---|---:|---|
| `BikeTagButton.vue` | Branded action button with variants and artwork | 1 — First | Already has a variant API; ideal early theme test |
| `BikeTagLabel.vue` | Label / badge-like presentation | 1 — First | Existing styles and decorative treatment |
| `BikeTagInput.vue` | Input control | 2 — Next | Review accessibility, states, and form integration |
| `BikeTagIcon.vue` | BikeTag icon presentation | 2 — Next | Clarify icon source and supported sizes |
| `BikeTagLoader.vue` | Loading indicator | 3 — Later | Small, self-contained visual element |
| `BikeTagBlurb.vue` | Informational/intro content block | 2 — Next | Already part of the published library |
| `ExpandableImage.vue` | Image display with expanded view | 2 — Next | Useful across tag and content experiences |
| `SectionContent.vue` | Content section/layout helper | 3 — Later | Review actual reuse before promoting to library |

### B. Game identity and navigation

| Component | Current role | Initial design priority | Notes |
|---|---|---:|---|
| `BikeTagHeader.vue` | Header controls for the current game experience | 1 — First | Already exported by the library |
| `BikeTagFooter.vue` | Footer/action controls for game experience | 2 — Next | Not currently exported by library |
| `BikeTagMenu.vue` | Main menu, game logo/name, and navigation | 1 — First | Important to per-game identity; application-coupled |
| `BikeTagGames.vue` | Browse/select BikeTag games | 2 — Next | Appears on landing/about experiences |

### C. Core BikeTag domain presentation

These components represent BikeTag-specific objects. They are strong candidates for visual adaptation, but should remain domain-aware rather than being treated as generic UI primitives.

| Component | Current role | Initial design priority | Notes |
|---|---|---:|---|
| `BikeTag.vue` | Tag card / found and mystery tag presentation | 1 — First | Central visual object of the game; currently not exported |
| `BikeTagPlayer.vue` | Player identity/card presentation | 2 — Next | Used by player lists and leaderboard |
| `BikeDex.vue` | Player tag collection | 3 — Later | Composite/domain-heavy |
| `BikeTagAchievement.vue` | Achievement presentation | 3 — Later | Player profile-specific |
| `BikeTagMap.vue` | Map and tag/game geographic presentation | 3 — Later | Map provider/data coupling should be considered |

### D. Participation and queue workflow

These components implement steps or states in the play/submission process. Visual contributions are welcome, but interaction and state transitions must be preserved.

| Component | Current role | Design priority |
|---|---|---:|
| `BikeTagCamera.vue` | Camera and image capture | 3 — Later |
| `BikeTagQueue.vue` | Queue summary/status controls | 2 — Next |
| `QueueFound.vue` | Found-tag step | 2 — Next |
| `QueueJoined.vue` | Join-player step | 2 — Next |
| `QueueMystery.vue` | Mystery-tag step | 2 — Next |
| `QueuePosted.vue` | Posted-tag result step | 2 — Next |
| `QueuePostedShare.vue` | Sharing step | 3 — Later |
| `QueueRejectionAlert.vue` | Rejection feedback | 3 — Later |
| `QueueRejections.vue` | Rejection review/management | 3 — Later |
| `QueueSubmit.vue` | Final submission and social posting | 3 — Later |
| `QueueView.vue` | Queue carousel / review composition | 3 — Later |
| `QueueApprove.vue` | Approval workflow | 3 — Later |

### E. Administrative and technical helpers

These are not initial targets for the public visual design initiative.

| Component | Current role | Guidance |
|---|---|---|
| `EditBikeTag.vue` | Tag editing form/workflow | Keep behavior stable; revisit admin visual system later |
| `DeleteBikeTag.vue` | Tag deletion workflow | Application-specific |
| `JsonTree.vue` | JSON data inspection | Developer/admin utility |
| `NetlifyIdentityWidget.vue` | Netlify identity integration | Infrastructure-specific |
| `ServiceWorker.vue` | PWA/service worker behavior | Infrastructure-specific |
| `Searchable.vue` | Search/filter behavior wrapper | Review before styling; may be a reusable interaction pattern |

## 3. What should designers work on first?

The recommended first design exercise should cover a small set of high-visibility screens and their existing components. This gives contributors a coherent target without requiring them to redesign the entire application.

### First contribution set

| Design target | Existing screen/component | Why start here? |
|---|---|---|
| Game header and navigation | `App.vue`, `BikeTagMenu.vue`, `BikeTagHeader.vue` | Establishes game identity and overall visual language |
| Current tag card | `Home.vue`, `BikeTag.vue` | The tag is the central object of the game |
| Primary action buttons | `BikeTagButton.vue` | Existing variants make this a contained theme experiment |
| Game landing and game selection | `Landing.vue`, `BikeTagGames.vue`, `BikeTagBlurb.vue` | A visible, low-risk place to explore broader visual direction |
| Play/submission flow | `Play.vue`, `BikeTagQueue.vue`, queue step components | Tests whether the design remains usable for actual gameplay |

The first round does not need to cover every state or administrative screen. It should produce a consistent visual concept across these key touchpoints.

## 4. Suggested contributor tasks by experience level

### Anyone — no design software or coding required

- Take a screenshot of a page and draw or write notes over it.
- Sketch a new tag card, button, game header, or landing page.
- Submit a color palette, illustration, logo treatment, or background pattern.
- Show a mobile layout idea, even if it is drawn on paper.
- Explain what feels confusing, crowded, or difficult to use.

### Visual designers and illustrators

- Create alternative treatments for existing components.
- Show how the same component could look in two different game identities.
- Supply mobile and desktop versions of the same idea.
- Provide reusable artwork and assets with source files and licensing details.
- Identify the existing screen/component the proposal is intended to improve.

### Developers

- Adapt existing components rather than duplicating them.
- Replace hardcoded visual values with agreed theme tokens when appropriate.
- Preserve component props, emitted events, slots, and game behavior.
- Add responsive examples and tests for modified components.
- Update the published library only when an export is intentionally part of its public API.

## 5. Review checklist for visual contributions

A design proposal should be reviewed against the following:

- [ ] It identifies the screen or existing component it relates to.
- [ ] It has a usable narrow/mobile layout before desktop enhancements.
- [ ] It preserves the purpose and information hierarchy of the existing screen.
- [ ] Primary actions are visually clear and have usable touch targets.
- [ ] Text remains readable and content can grow without breaking the layout.
- [ ] Important states are considered: loading, empty, error, selected, disabled, and success where relevant.
- [ ] It does not rely on color alone to communicate status.
- [ ] It considers keyboard focus and accessible labels when interactive.
- [ ] It can be adapted to a different game identity without duplicating application logic.
- [ ] Any supplied fonts, images, and illustrations have clear usage/licensing information.

## 6. Relationship to the published library

The app's `src/components/` directory is not the same thing as the public package API.

At the time of this review, the active component exports in `src/index.ts` include `BikeTagBlurb`, `BikeTagButton`, `BikeTagHeader`, and `BikeTagLabel`. Other components in the app are not automatically package exports.

A useful sequence is:

1. Explore and refine a component inside the existing application.
2. Identify and document any store/router/API dependencies.
3. Decide whether it is useful to external Vue consumers.
4. Add it to the package exports only after its public API and dependencies are understood.
5. Verify the library build, CSS output, types, and package usage example.

Do not turn every application component into a library component. The published package should have a deliberate, supportable API.

## 7. Next architecture work after this inventory

1. Confirm the exact component dependency tree and production usage with maintainers.
2. Create a small component preview workflow using the existing app/build setup or confirm the source of the already-linked hosted playground.
3. Define the initial semantic CSS custom properties for the first contribution set.
4. Record baseline screenshots at narrow and wide viewports.
5. Invite image/mockup contributions against the first contribution set.
6. Only then implement the first themeable component changes.

## 8. Important limitations

This inventory records route mappings and direct imports from source. It is not a runtime dependency graph, visual audit, accessibility audit, or proof that every listed component is actively used in production. Some view-to-component relationships are indirect. Before changing exports or deleting/replacing components, inspect the full import graph and verify usage.

The purpose is to make community design work more concrete while keeping the existing BikeTag application as the source of truth.
