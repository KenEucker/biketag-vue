# BikeTag Community Design Initiative: Architecture Assessment

**Assessed:** November 12, 2026  
**Branch examined:** `production`  
**Assessment purpose:** Prepare the existing application for community-contributed visual designs and eventual per-game themes. This document records the current architecture and recommends incremental improvements. It does not authorize a wholesale refactor.

## Executive summary

The existing `biketag-vue` repository is the right home for the initiative. It contains the BikeTag Vue application and a separate Vite library build whose entry point is `src/index.ts`. Retain this repository and evolve its existing components.

The application already has useful foundations: Vue 3, TypeScript, Vue Router, Pinia, SCSS design variables, reusable Vue components, game-aware configuration, and a publishable component package. However, the existing theme system is primarily compile-time SCSS, global styles include hardcoded values, and the published library exports only a small subset of the application components.

The recommended sequence is to document and test the present component boundaries, introduce runtime CSS custom properties for a limited set of visual tokens, then allow safe game-level theme configuration. Keep behavior and domain logic separate from presentation wherever practical. Mobile-first behavior should be the acceptance baseline for new or revised visual components.

## 1. Scope and evidence

This assessment examined the repository's `production` branch, including:

- `src/router/index.ts`, `src/App.vue`, and route-level view files.
- `src/components/` and the library entry point `src/index.ts`.
- `package.json`, `vite.config.mts`, `publish.config.ts`, and the release workflow.
- Shared SCSS files, representative view/component styles, game configuration, and store getters.
- Existing README and contribution guidance.

This was a source and configuration review, not a browser-based accessibility audit or full device test. Component responsibilities below are inferred from component names, templates, imports, and representative implementations; they should be validated with maintainers before any component is moved or redesigned.

## 2. Current application structure

The frontend is organized around:

```text
src/
├── App.vue
├── app.ts
├── index.ts                 # publishable library entry point
├── assets/
│   ├── fonts/
│   ├── images/
│   └── styles/
├── common/                  # shared app/domain helpers
├── components/              # Vue components
├── directives/
├── i18n/
├── router/
├── store/                   # Pinia store
└── views/                   # route-level screens
```

The repository also contains Netlify functions, edge functions, configuration, tests, and deployment/release tooling outside `src`. Preserve these existing boundaries initially; there is no evidence that a new component architecture or parallel design-system repository is necessary.

### Technology

| Area | Current implementation |
|---|---|
| UI framework | Vue 3 |
| Language | TypeScript |
| Build | Vite |
| Routing | Vue Router 4 |
| State | Pinia |
| Styling | SCSS / Sass |
| CSS framework | Bootstrap 5 |
| Vue component framework | BootstrapVueNext |
| Internationalization | Vue I18n |
| Hosting/functions | Netlify |
| PWA | Vite PWA / Workbox |
| Library build | Vite library mode |
| Type declarations | vue-tsc and vite-plugin-dts |

## 3. Route inventory

Routes are declared in `src/router/index.ts`. Protected administrative routes are registered only when authentication is enabled.

### Public routes

| URL | Route name | View |
|---|---|---|
| `/` | Landing | `Landing.vue` |
| `/:tagnumber?` | Home | `Home.vue` |
| `/play` | Play | `Play.vue` |
| `/round` | Round | `Round.vue` |
| `/biketags` | BikeTags | `BikeTags.vue` |
| `/biketags/search` | BikeTag Search | `BikeTags.vue` |
| `/players` | Players | `Players.vue` |
| `/players/search` | Player Search | `Players.vue` |
| `/player/:name` | Player | `Player.vue` |
| `/player/:name/search` | Player Tag Search | `Player.vue` |
| `/leaderboard` | Leaderboard | `Leaderboard.vue` |
| `/howtoplay` | How | `HowToPlay.vue` |
| `/about` | About | `About.vue` |
| `/worldwide` | Worldwide | `Worldwide.vue` |
| `/map` | Map | `Map.vue` |
| `/api/:endpoint(.*)*` | API | `ApiExplorer.vue` |
| `/login` | Login | `Login.vue` |
| `/logout` | Logout | `Logout.vue` |

### Informational/document routes

| URL | View | Notes |
|---|---|---|
| `/privacy` | `ProjectDocument.vue` | Alias: `/privacy-policy` |
| `/terms` | `ProjectDocument.vue` | Alias: `/terms-of-service` |
| `/code-of-conduct` | `ProjectDocument.vue` | Shared document renderer |

### Protected administrative routes

| URL | Route name | View |
|---|---|---|
| `/profile` | Profile | `Profile.vue` |
| `/approve` | Approve | `Approve.vue` |
| `/rejections` | Rejections | `Rejections.vue` |
| `/dashboard` | Dashboard | `Dashboard.vue` |
| `/settings` | GameSettings | `GameSettings.vue` |
| `/email-test` | EmailTest | `EmailTest.vue` |
| `/tag-metadata` | TagMetadata | `TagMetadata.vue` |
| `/queue-fix` | Queue Fix | `QueueFix.vue` |
| `/delete` | Delete | `Delete.vue` |
| `/edit` | Edit | `Edit.vue` |
| `/new` | New | `New.vue` |
| `/launch` | Launch | `Launch.vue` |

The protected route count is conditional. Route aliases are documented above rather than counted as independent route records.

## 4. Vue component inventory

The current `src/components/` directory contains 35 Vue files. The groups below describe apparent responsibility; classification is preliminary and not a recommendation to move files.

### Core visual and interface components

| Component | Apparent responsibility | Initial reuse potential |
|---|---|---|
| `BikeTagButton.vue` | Button with artwork and variants | High |
| `BikeTagLabel.vue` | Label/visual label with slot | High |
| `BikeTagInput.vue` | Input presentation | High |
| `BikeTagIcon.vue` | Icon presentation | High |
| `BikeTagBlurb.vue` | Informational content section | High |
| `BikeTagHeader.vue` | Game screen action/header group | Medium |
| `BikeTagFooter.vue` | Game screen controls/footer group | Medium |
| `BikeTagMenu.vue` | Main navigation and game identity | Application-specific |
| `BikeTagLoader.vue` | Loading indicator | High |
| `ExpandableImage.vue` | Image display/expansion | High |
| `SectionContent.vue` | Content section/document helper | Medium |
| `Searchable.vue` | Searchable collection wrapper | Medium |

### Game and player components

| Component | Apparent responsibility | Initial reuse potential |
|---|---|---|
| `BikeTag.vue` | Found/mystery tag card display | Medium; domain-aware |
| `BikeDex.vue` | Player/tag collection | Medium; domain-aware |
| `BikeTagAchievement.vue` | Achievement display | Medium; domain-aware |
| `BikeTagGames.vue` | Game directory/list | Medium; domain-aware |
| `BikeTagPlayer.vue` | Player card/profile icon | Medium; domain-aware |
| `BikeTagMap.vue` | Map presentation | Medium; map/data coupled |

### Participation and submission workflow components

| Component | Apparent responsibility |
|---|---|
| `BikeTagCamera.vue` | Camera/image capture |
| `BikeTagQueue.vue` | Submission queue |
| `QueueApprove.vue` | Approval workflow |
| `QueueFound.vue` | Found-tag workflow |
| `QueueJoined.vue` | Join/player workflow |
| `QueueMystery.vue` | Mystery-tag workflow |
| `QueuePosted.vue` | Posted-tag workflow |
| `QueuePostedShare.vue` | Post-sharing workflow |
| `QueueRejectionAlert.vue` | Rejection alert |
| `QueueRejections.vue` | Rejection management |
| `QueueSubmit.vue` | Submission workflow |
| `QueueView.vue` | Queue view composition |

### Administrative and infrastructure components

| Component | Apparent responsibility |
|---|---|
| `DeleteBikeTag.vue` | Tag deletion workflow |
| `EditBikeTag.vue` | Tag editing workflow |
| `JsonTree.vue` | JSON display |
| `NetlifyIdentityWidget.vue` | Netlify identity integration |
| `ServiceWorker.vue` | PWA/service-worker integration |

A component should not be moved to the package solely because its name sounds reusable. First determine whether it depends on the BikeTag store, router, authentication, API client, or other app-wide services.

## 5. Component library

The library and application have distinct Vite configurations:

- Application: `vite.config.mts`
- Library: `publish.config.ts`
- Library entry: `src/index.ts`

The library build uses Vite library mode and `vite-plugin-dts`. It emits ES and UMD builds and a CSS asset. Vue, Vue Router, Pinia, and `biketag` are marked external. Package exports in `package.json` point to the generated JavaScript and CSS.

There is an apparent documentation mismatch: the README example imports `{ BikeTag }` and `biketag-vue/dist/style.css`, but `src/index.ts` currently comments out the `BikeTag` export, while `package.json` exports the stylesheet as `biketag-vue.css`. The example should be reconciled with the actual supported API before being used as contributor guidance.

The current entry point actively exports:

- `BikeTagBlurb`
- `BikeTagButton`
- `BikeTagHeader`
- `BikeTagLabel`
- `BikeTagDefaults` and `BikeTagEnv`
- `createBikeTag`, `useBikeTagStore`, `initBikeTagStore`
- `getBikeTagClientOpts` and `Types`

Several components in the app directory are commented out in the library entry, including `BikeTag`, `BikeDex`, `BikeTagAchievement`, `BikeTagFooter`, `BikeTagGames`, `BikeTagInput`, `BikeTagMap`, `BikeTagMenu`, `BikeTagPlayer`, and `BikeTagQueue`.

The plugin's `createBikeTag()` installs selected components/directives and initializes the BikeTag store. The library therefore combines visual exports with BikeTag application infrastructure; it is not currently a fully standalone collection of presentation-only components.

### Release flow

The GitHub Actions release workflow runs on pushes to `production`: install dependencies, lint, run `pub:build`, expose generated artifacts, and run semantic-release. `pub:expose` moves generated outputs into the repository root.

**Recommendation:** Preserve this package and its current entry point. Document component dependencies and establish a deliberate export review before publishing additional components. Do not promote workflow components into the public API without evaluating their store/router/API dependencies.

## 6. Styling and theme capabilities

The shared stylesheet structure is:

```text
src/assets/styles/
├── _colors.scss
├── _fonts.scss
├── _settings.scss
├── _theme.scss
├── mixins.scss
├── style.scss
└── flashy.scss
```

The project already has centralized SCSS color, typography, sizing, and breakpoint variables. Examples include primary/secondary colors, card colors, button variants, tag typography, player typography, and breakpoints from 320px through 1200px.

The global stylesheet contains substantial application-wide rules, including styles for cards, buttons, tags, navigation, forms, pagination, maps, and queue presentation. Vue components also contain scoped and unscoped SCSS, inline styles, hardcoded values, image-based backgrounds, and embedded base64 SVG artwork.

### Theme limitation

SCSS variables are compiled into static CSS. They are not a runtime theme mechanism. No CSS custom-property theme-token declarations were found in the examined theme and core component files.

For per-game customization, introduce CSS custom properties gradually while retaining SCSS for build-time structure. Candidate runtime tokens include:

- Primary, secondary, background, surface, text, and accent colors.
- Body and heading font families.
- Button colors, borders, and shapes.
- Card surfaces, borders, and shadows.
- Navigation surface and active state.
- Selected decorative backgrounds and assets.

Avoid making every CSS declaration configurable. Start with visual decisions that should reasonably vary between games. Keep breakpoints and structural implementation variables in SCSS unless there is a demonstrated need for runtime control.

### Decorative assets

The current UI depends on image-based button backgrounds, SVG artwork, custom fonts, and some base64-embedded graphics. Color tokens alone will not fully theme the interface. The eventual theme model should provide a controlled way to override selected artwork and branding assets. Replacing embedded art with configurable assets should be considered only when touching the affected component, not as a broad first-phase cleanup.

## 7. Responsive behavior

The code has responsive behavior, but no single mobile-first contract is documented.

Evidence includes:

- Shared SCSS breakpoints at 320, 420, 480, 768, 1024, and 1200 pixels.
- Additional literal breakpoints such as 479, 500, 600, 620, 767, 780, 990, and 992 pixels.
- Bootstrap responsive grid/classes in views and components.
- Viewport-based dimensions such as `80vw`, `70vh`, and `50vh`.
- Mobile navigation with a collapsed menu and full-height navigation list.
- Desktop layout changes for game listings, landing content, maps, and player views.

The Home view is an example of deliberate small-screen adaptations, including image height changes at 767px and 479px. However, the mix of breakpoints and fixed viewport dimensions means responsiveness should be verified with actual devices and representative content.

### Recommended responsive principle

Treat small screens as the baseline for all new or revised visual work. Add larger-screen enhancements progressively. Do not redesign current layouts wholesale. Document a small set of agreed breakpoints and use them for newly touched code; reconcile older values opportunistically.

Minimum validation widths should include approximately 320px, 375px, 768px, 1024px, and 1440px. Test real content, long player names, large tag photos, menus, forms, and keyboard/focus states—not only empty component placeholders.

## 8. Game-specific branding

The Pinia store derives a game name from the hostname subdomain, with `GAME_NAME` and `BikeTagDefaults.gameName` as fallbacks. It retrieves a game object and exposes game-aware information such as the game name/title and logo URL. The menu displays the current game logo and title; the game directory displays each supported game's logo.

This is a meaningful foundation for individual game identities. However, the examined code does not define a complete runtime theme object associated with a game. Existing brand configuration is chiefly identity/logo/domain information, not a fully specified set of visual tokens.

### Proposed future boundary

Keep the default BikeTag experience as the fallback. A game's optional presentation configuration should affect visual output only; game rules, state transitions, submission validation, permissions, and API behavior should remain controlled by the existing application.

An eventual theme configuration could describe a constrained set of colors, font choices, and approved assets. This is a direction for future design, not an existing type or implementation. Theme input must be validated and must not permit arbitrary script execution or unrestricted external CSS.

## 9. Playground and documentation

The README links to `https://biketag.net/component-playground` and documents installation and a basic component usage example.

No Storybook or Histoire configuration was found in the repository tree or targeted source search. The component playground is therefore not currently documented as a buildable, repository-local development tool. Its current hosting/source relationship should be confirmed.

The existing `contributing.md` focuses primarily on conventional commits and code conventions. The README identifies the package and source setup, but does not provide a systematic component catalog, usage examples for all public exports, responsive guidance, or theme authoring instructions.

### Recommended documentation additions

1. Component inventory and public-library export list.
2. Local setup and component playground workflow (once its source/location is confirmed).
3. A simple visual contribution path that accepts screenshots, sketches, or mockups as well as code.
4. Mobile-first review expectations.
5. Theme-token and per-game branding guidance after token names and supported customization are agreed.

Do not require non-developers to install the application just to contribute visual ideas.

## 10. Prioritized architectural recommendations

### Essential — prepare before broad community design work

1. **Record the existing component boundaries.** Use this inventory as a starting point and add a concise dependency note for core components: store, router, API, auth, global CSS, and external UI libraries.
2. **Identify a small visual token set.** Agree on semantic tokens for color, typography, surfaces, buttons, and selected artwork before converting styles.
3. **Add runtime CSS custom properties incrementally.** Preserve SCSS and migrate only the highest-value shared styles first.
4. **Set a mobile-first acceptance baseline.** Document viewport sizes and common interaction/content cases.
5. **Clarify the library's public API.** Distinguish app-only components, domain components, and presentation components. Publish only components with intentional and understood dependencies.
6. **Protect functionality.** Theme customization must not change the behavior of gameplay, routing, submissions, identity, or permissions.

### Valuable — improve contributor experience

1. Establish or document a repository-local component playground so contributors can view components in isolation with representative mobile and desktop states.
2. Provide screenshots and examples for the components most relevant to visual contributions.
3. Document how game name/logo identity is currently resolved and where theme configuration could eventually attach.
4. Introduce visual regression checks for a small set of key screens once stable screenshots and environments are available.
5. Normalize breakpoints and remove hardcoded theme values only as components are touched.
6. Document approved asset formats, font licensing expectations, and image dimensions.

### Future — after the basic theme mechanism proves useful

1. Add optional per-game theme configuration with validation and safe defaults.
2. Support approved game-specific logos, artwork, and decorative assets.
3. Expand the library only when a component has clear reuse value and manageable dependencies.
4. Consider a curated theme preview/selection workflow for maintainers and game ambassadors.
5. Consider a formal design-token compatibility/versioning policy once multiple themes are active.

## 11. Implementation roadmap

| Phase | Priority | Work | Completion evidence |
|---|---|---|---|
| 1. Architectural baseline | Essential | Validate component inventory and dependencies; record app/library boundaries | Maintainer-reviewed component map |
| 2. Visual foundations | Essential | Agree semantic tokens, mobile-first rules, and theme scope | Token reference and responsive checklist |
| 3. CSS theme bridge | Essential | Introduce CSS custom properties for a small set of global visual values | Existing UI renders identically with default tokens |
| 4. Core component adaptation | Essential | Adapt existing button, label, header, blurb, and tag presentation as appropriate | Existing behavior retained; visual variants can be overridden |
| 5. Contributor preview | Valuable | Confirm or create repository-local component playground | Contributors can view components and responsive states |
| 6. Community design intake | Valuable | Document visual-only contributions and examples | Designers can submit images/mockups without code |
| 7. Game theme configuration | Future | Connect validated theme configuration to the resolved game identity | At least two games can use different presentation without duplicated app logic |
| 8. Library growth and governance | Future | Add components intentionally and version public exports | Package consumers have stable documented APIs |

## 12. Non-goals for this phase

- No wholesale component rewrite.
- No replacement of Vue, Pinia, Bootstrap, or the existing build system.
- No new parallel component library or design-system repository.
- No immediate conversion of every SCSS variable or hardcoded style.
- No new visual design imposed on the current BikeTag experience.
- No changes to game rules, API behavior, authentication, or submissions.

## 13. Maintainer verification items

Before implementation, confirm:

- Whether the hosted component playground is generated from this repository or maintained elsewhere.
- Which of the 34 components are actively used in production and which are legacy or experimental.
- Which library exports are consumed by external projects and what compatibility guarantees are expected.
- Whether game settings can safely store presentation configuration or whether a distinct configuration source is preferable.
- Which game-level visual elements should be customizable and which should remain consistent across all BikeTag games.

## Conclusion

BikeTag already has the important building blocks: an established Vue application, a component directory, a publishable library, centralized SCSS variables, and game-aware identity. The missing pieces are a documented component reuse boundary, a runtime theming layer, a consistent mobile-first review standard, and a convenient way for contributors to preview components.

The safest path is to build on the existing code, starting with documentation and a small CSS custom-property layer. This gives designers, illustrators, and developers a shared foundation while keeping the current application and its functionality intact.
