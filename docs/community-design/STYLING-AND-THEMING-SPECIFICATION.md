# BikeTag Application Styling and Theming Specification

**Status:** Draft for maintainer review  
**Repository:** `KenEucker/biketag-vue`  
**Target branch for implementation PRs:** `develop`  
**Scope:** Frontend styling, component conventions, and theme architecture

## 1. Purpose

This specification establishes the frontend styling and theming direction for the existing BikeTag Vue application.

The objective is to make the application easier to maintain and prepare it to support multiple approved visual themes without changing gameplay, permissions, routing, or other application behavior.

This is an incremental evolution of the existing application. It is not a proposal to replace Vue, Bootstrap, the existing component library, or the current application structure wholesale.

## 2. Architectural principles

1. **Preserve the application.** Keep the existing Vue application, routes, stores, API integration, and component library as the foundation.
2. **Separate presentation from behavior.** Themes may change visual presentation, but must not change game rules, workflows, data, permissions, or feature availability.
3. **Use one shared component system.** Themes should style the same reusable components rather than introduce theme-specific copies of common components.
4. **Use BEM consistently.** New and migrated component styles use Block, Element, Modifier naming.
5. **Use runtime design tokens.** Components consume CSS custom properties; theme stylesheets provide approved values.
6. **Keep theme authoring controlled.** BikeTag ships and maintains themes. BikeTag Ambassadors may select from themes made available to their game, but do not edit arbitrary colors, fonts, CSS, or design tokens.
7. **Preserve BikeTag 2.0.** The current website appearance becomes the default supported theme in the new system.
8. **Migrate incrementally.** Changes are made in small, testable groups with a working default appearance at every stage.
9. **Mobile-first.** New and revised components must work on small screens before larger-screen enhancements are added.
10. **Prefer accessible, resilient design.** Theme palettes and component states must preserve readable contrast, focus visibility, and usable controls.

## 3. Terminology and responsibility boundaries

- **BikeTag Administrator:** The sole administrator of the overall BikeTag platform. This role is distinct from game-level Ambassador responsibilities.
- **BikeTag Ambassador:** A person associated with an individual city/game who may have game-level permissions and features.
- **Component system:** Shared Vue components, their structure, behavior, props, slots, and presentation contracts.
- **Design token:** A named semantic value consumed by styles, such as a surface color, text color, spacing value, or font family.
- **Theme:** A BikeTag-maintained set of values and approved visual assets that gives the shared components a particular appearance.
- **BikeTag 2.0 theme:** The current website appearance, migrated into the new theme architecture and used as the default.
- **Alternative theme:** Another approved theme implemented using the shared component system.

Theme selection and Ambassador permissions are separate concerns. The application must continue to enforce existing authorization rules; theme selection must not grant or imply administrative permissions.

## 4. Component system and theme separation

The component system owns reusable interface structure and behavior. A theme supplies the visual values used by that structure.

For example, a button component owns its semantic HTML, keyboard behavior, disabled state, supported variants, and event behavior. A theme may change its colors, typography, border, shape, and approved decorative treatment.

A theme must not:
- Change whether an action is available.
- Change routing, API calls, validation, or submission behavior.
- Change the meaning of a component state.
- Hide required information or controls.
- introduce arbitrary JavaScript, executable markup, or unrestricted external CSS.

Avoid creating separate copies such as `BikeTagButtonDark.vue` and `BikeTagButtonRetro.vue`. Prefer one component with semantic variants and theme-driven presentation.

Not every component needs to become a generic public library component. App-specific and domain-aware components may remain application components while still following the same styling conventions.

## 5. BEM naming convention

Use BEM for component-owned CSS classes:

- **Block:** The standalone component or interface unit.
- **Element:** A child part that has no useful independent meaning outside its block.
- **Modifier:** A variation of a block or element.

Recommended format:

```scss
.bike-tag-button { /* block */ }
.bike-tag-button__label { /* element */ }
.bike-tag-button__icon { /* element */ }
.bike-tag-button--primary { /* modifier */ }
.bike-tag-button--large { /* modifier */ }
```

### Naming rules

1. Use lowercase kebab-case for block and element names.
2. Use double underscores for elements and double hyphens for modifiers.
3. A modifier supplements a block or element; it does not replace the base class.
4. Prefer semantic modifiers such as `--primary`, `--secondary`, `--compact`, and `--disabled` over appearance-specific names such as `--pink` or `--dark`.
5. Use state classes consistently. Where a state is represented in the DOM, prefer an explicit state convention such as `is-active`, `is-loading`, or `is-disabled`; do not mix state classes and BEM modifiers arbitrarily.
6. Avoid styling through element names, deeply nested descendant selectors, or broad global selectors when a component class can express the relationship.
7. Avoid using a component's internal elements as public styling hooks unless they are intentionally part of its styling contract.

The existing application already contains classes such as `.biketag__button` and `.button-group__left`. These are existing conventions, not a reason to preserve inconsistent naming indefinitely. Migrate them gradually. Do not rename every class in one change.

### Component root

A Vue component should generally expose one clear root block class. If the component has multiple meaningful visual parts, use elements under that block. A parent may add a class to a child component for layout, but should not need to reach into the child's internal DOM to restyle it.

## 6. SCSS organization

Retain SCSS as the authoring language, but give files clear responsibilities. The following is a target organization, not a requirement to move every existing file immediately.

```text
src/assets/styles/
├── abstracts/
│   ├── _functions.scss
│   ├── _mixins.scss
│   ├── _breakpoints.scss
│   └── _legacy-variables.scss
├── base/
│   ├── _reset.scss
│   ├── _document.scss
│   └── _typography.scss
├── tokens/
│   ├── _token-contract.scss
│   └── _themes.scss
├── themes/
│   ├── _biketag-2.scss
│   └── _theme-index.scss
├── components/
│   └── (optional shared component styles)
├── utilities/
│   └── _utilities.scss
├── _fonts.scss
├── _vendor.scss
├── style.scss
└── flashy.scss
```

### Responsibilities

- **abstracts:** Sass-only helpers, mixins, functions, and build-time breakpoints. These files should not emit component or page CSS.
- **base:** Document defaults, reset/normalization, and global typography.
- **tokens:** The semantic token contract and the mapping of themes to token values.
- **themes:** Theme-specific CSS custom-property assignments and approved theme-level assets.
- **components:** Only styles intentionally shared across components. Component-specific styles may remain colocated in Vue single-file components.
- **utilities:** Small, deliberately global utility classes. Utilities should not become a substitute for component styles.
- **vendor:** Explicit integration styles for Bootstrap, BootstrapVueNext, Leaflet, and other third-party UI dependencies.
- **style.scss:** The application stylesheet entry point that imports the layers in a documented order.
- **flashy.scss:** Existing animation/effect styles; keep separate unless a later review finds a reason to reorganize it.

The current files `_colors.scss`, `_fonts.scss`, `_settings.scss`, `_theme.scss`, and `mixins.scss` should be treated as migration inputs. Their contents should be inventoried and moved only when the destination and compatibility are understood.

Avoid introducing a new Sass module system migration (`@import` to `@use`) as an unrelated prerequisite. It can be evaluated separately or handled incrementally when files are touched.

## 7. Design token contract

Components should consume semantic CSS custom properties rather than hardcoding theme colors or referring directly to a particular theme's palette.

Use a consistent `--bt-` prefix for BikeTag-owned custom properties.

Initial token categories:

| Category | Example token names | Notes |
|---|---|---|
| Brand | `--bt-color-primary`, `--bt-color-secondary`, `--bt-color-accent` | Brand identity and emphasis |
| Surfaces | `--bt-color-background`, `--bt-color-surface`, `--bt-color-surface-raised` | Page, card, and elevated surfaces |
| Text | `--bt-color-text`, `--bt-color-text-muted`, `--bt-color-text-inverse` | Readable text roles |
| Borders | `--bt-color-border`, `--bt-color-border-strong` | Component boundaries |
| Links | `--bt-color-link`, `--bt-color-link-hover` | Link states |
| Focus | `--bt-color-focus` | Visible keyboard focus |
| Feedback | `--bt-color-success`, `--bt-color-warning`, `--bt-color-danger`, `--bt-color-info` | Meaningful status colors, not decorative palette choices |
| Typography | `--bt-font-body`, `--bt-font-heading`, `--bt-font-display` | Approved font families |
| Shape | `--bt-radius-control`, `--bt-radius-card`, `--bt-border-width` | Shared shape language |
| Elevation | `--bt-shadow-card`, `--bt-shadow-navigation` | Shared shadow treatments |
| Controls | `--bt-button-primary-background`, `--bt-button-primary-text`, etc. | Add only where semantic roles require them |

This is an initial vocabulary, not a mandate to create every variable immediately. Add tokens when there is a real shared use case. Prefer semantic tokens over raw palette names such as `--bt-pink-500`.

### Token rules

- Components consume semantic tokens.
- Theme files assign token values.
- Components should not know which theme is active.
- Sass variables may remain for compile-time concerns, but must not be mistaken for runtime theme values.
- Structural values such as breakpoints, layout calculations, and build-time asset paths generally remain Sass variables unless a real runtime use case emerges.
- Avoid making every CSS property configurable. The token contract should stay intentionally small.

## 8. Runtime theme mechanism

Use a theme class on the document body as the initial runtime mechanism. CSS custom properties inherit from the body to the application.

Illustrative structure:

```scss
/* Default/fallback values: BikeTag 2.0 */
:root {
  --bt-color-primary: /* BikeTag 2.0 value */;
  --bt-color-background: /* BikeTag 2.0 value */;
  --bt-color-surface: /* BikeTag 2.0 value */;
  --bt-color-text: /* BikeTag 2.0 value */;
  --bt-font-body: /* BikeTag 2.0 font */;
}

/* Explicit class makes the active theme inspectable and switchable. */
body.theme-biketag-2 {
  /* BikeTag 2.0 token assignments */
}

body.theme-example {
  /* Values for a future approved theme */
}
```

The placeholders above are intentional: actual BikeTag 2.0 values must be derived from the current application and verified against rendered screens, not guessed in this specification.

### Runtime rules

1. The application always has a valid fallback theme: BikeTag 2.0.
2. Theme identifiers are selected from a known set of themes supported by the frontend.
3. Unknown, missing, or unavailable theme identifiers fall back to BikeTag 2.0.
4. The active class is applied to `body`; avoid scattering theme checks through Vue components.
5. Theme changes should update presentation without reloading or reinitializing application state, unless a specific asset-loading constraint requires otherwise.
6. The body class is an implementation detail. Components must not branch on the class or inspect the active theme to decide their behavior.
7. Theme CSS is shipped with the application. Do not load arbitrary CSS supplied by a game configuration or datastore.

A small theme registry should map approved theme identifiers to the CSS class and any approved asset bundle/metadata. The exact TypeScript shape and lifecycle belong to the implementation design step.

## 9. Theme selection and API/Sanity boundary

The frontend and backend responsibilities should remain distinct.

### Frontend responsibilities

- Define the available theme identifiers and their corresponding shipped styles.
- Provide the BikeTag 2.0 fallback.
- Apply the selected theme class.
- Ensure an invalid or unsupported identifier cannot break rendering.
- Keep theme selection separate from component behavior and authorization.

### API and Sanity responsibilities

The future `biketag-api` and Sanity work may store a theme reference on a game/theme document and provide the selected theme identifier to the frontend.

The frontend should consume a stable identifier, not arbitrary token values, raw CSS, JavaScript, or unvalidated style objects.

The precise Sanity document schema, references, and API contract are intentionally outside this frontend specification. They should be coordinated when the first alternative theme is developed.

### BikeTag Ambassador experience

BikeTag Ambassadors may select among the themes made available to their game, subject to the application's existing permissions and workflow. They do not get arbitrary palette editors, token controls, CSS entry, or theme-authoring capabilities.

The BikeTag Administrator controls which themes are created, approved, shipped, and made available.

## 10. BikeTag 2.0 preservation and migration

BikeTag 2.0 is the default theme and the baseline for migration. The migration must preserve the current look and feel, including typography, colors, component artwork, spacing, and responsive behavior to the extent practical.

Do not assume that copying the existing Sass variables into CSS custom properties will reproduce the current site. The current styling also includes hardcoded declarations, Bootstrap defaults/overrides, component-scoped styles, inline styles, image-based backgrounds, SVG artwork, and embedded assets.

### Migration sequence

1. **Capture the baseline.** Record representative screenshots and responsive states of the current production appearance. Include public, gameplay, player, map, and administrative surfaces where relevant.
2. **Inventory visual dependencies.** Identify hardcoded colors, fonts, decorative assets, Bootstrap overrides, and global selectors that affect the baseline.
3. **Define the token contract.** Agree on a deliberately small set of semantic tokens and map existing values to them.
4. **Add the CSS-variable bridge.** Introduce BikeTag 2.0 custom properties while retaining existing Sass variables and styles where needed.
5. **Convert shared global styles.** Replace high-value hardcoded visual values with tokens in small, reviewable groups.
6. **Convert component styles.** Migrate component classes to BEM and tokens as each component is touched. Preserve existing props, slots, emitted events, and behavior.
7. **Apply the explicit BikeTag 2.0 theme class.** Keep the default token declarations as a safety net.
8. **Verify visual parity.** Compare screenshots at agreed viewport sizes and test interactions before merging each migration group.
9. **Develop the first alternative theme.** Only after the shared component and token foundation is usable.

### Compatibility and rollback

- Keep each PR focused on one layer or component group.
- Avoid combining broad markup changes, visual redesign, and behavior changes in a single PR.
- Preserve old class hooks temporarily when a migration would otherwise break other views or consumers; remove them only after usage is checked.
- Do not remove or rename public component exports as part of styling normalization without a separately reviewed compatibility plan.
- Keep BikeTag 2.0 as the fallback throughout the migration.
- If a migration causes regressions, reverting its isolated PR should restore the previous behavior and appearance.

## 11. Responsive and accessibility requirements

### Responsive design

- Start with the smallest supported layout and progressively enhance for larger viewports.
- Do not use a desktop layout as the base and then attempt to squeeze it into mobile.
- Use the existing shared Sass breakpoints as an initial reference, but recognize that the current application also contains many one-off media queries.
- Normalize breakpoints for newly touched components; do not undertake a risky one-shot rewrite of all existing media queries.
- Validate at minimum: 320px, 375px, 768px, 1024px, and 1440px.
- Test realistic content: long names, large images, empty/loading/error states, forms, menus, maps, and translated text.

### Accessibility

- Maintain WCAG 2.2 AA contrast targets for normal text and meaningful UI controls where applicable.
- Never rely on color alone to communicate status or an action.
- Preserve visible keyboard focus and keyboard operation.
- Ensure disabled, hover, active, loading, error, and success states remain distinguishable.
- Respect reduced-motion preferences for nonessential animation.
- Theme review must include contrast and focus-state checks, not only aesthetic review.

## 12. Bootstrap and existing dependencies

Bootstrap 5 and BootstrapVueNext are already part of the application. This specification does not propose removing them.

During migration:
- Treat Bootstrap as a structural and utility dependency where it is already used.
- Use BikeTag semantic tokens to override visual defaults where appropriate.
- Avoid broad selectors that unintentionally restyle every Bootstrap component.
- Keep third-party component overrides in a clearly identified vendor/integration layer.
- Do not create a second parallel set of buttons, forms, grids, or controls without a demonstrated need.

## 13. Public component library considerations

The repository currently has a separate library build and a small public export set. Styling normalization does not automatically mean every component becomes a public library export.

Before exporting a component, confirm:
- Its dependencies on Pinia, router, API clients, authentication, i18n, and application configuration.
- Whether its behavior is reusable outside the main BikeTag app.
- Whether its theme tokens and BEM classes are part of a stable styling contract.
- Whether its CSS and any required assets are included in the library build.

Preserve the existing library API unless a separately reviewed change intentionally expands or changes it.

## 14. Suggested implementation sequence

This is the recommended sequence after the specification is approved. Each item may be split into multiple PRs.

| Order | Work | Expected evidence |
|---|---|---|
| 1 | Capture BikeTag 2.0 visual baseline | Screenshots and representative interaction checklist |
| 2 | Establish token names and initial values | Reviewed token reference and BikeTag 2.0 mapping |
| 3 | Introduce theme stylesheet and body-class mechanism | App still renders with BikeTag 2.0 by default |
| 4 | Convert a small representative component group | BEM classes and token usage without behavior changes |
| 5 | Expand migration by component/surface groups | Small PRs with visual and functional checks |
| 6 | Validate library build and public exports | Package build remains compatible |
| 7 | Build the first alternative theme | Shared components render coherently under a second theme |

## 15. Out of scope

The following are intentionally deferred:
- Building a contributor playground or Storybook/Histoire environment.
- Letting BikeTag Ambassadors customize arbitrary colors or design tokens.
- Arbitrary CSS, JavaScript, or HTML in theme documents.
- Replacing Vue, Bootstrap, Pinia, the router, or the existing application architecture.
- A wholesale rewrite or rename of all components and classes.
- A full design refresh as part of the BikeTag 2.0 migration.
- Defining the complete API/Sanity theme document schema.
- Automatically publishing every app component as part of the public component library.

## 16. Decisions requiring maintainer confirmation

The following are recommendations for review, not implementation decisions silently assumed to be final:

1. **BEM state convention:** Use BEM modifiers for component variants and `is-*` classes for transient states.
2. **Theme class naming:** Use `theme-biketag-2` for the default class and `theme-{slug}` for other approved themes.
3. **Token prefix:** Use `--bt-` for BikeTag-owned CSS custom properties.
4. **Token scope:** Start with semantic color, typography, shape, elevation, and control tokens; add more only as needed.
5. **SCSS layout:** Adopt the proposed layered directory structure incrementally, not through a one-time file shuffle.
6. **Default fallback:** Keep BikeTag 2.0 values available at `:root` and explicitly apply `body.theme-biketag-2`.
7. **Theme data boundary:** Store a theme identifier/reference in API/Sanity; keep actual token values and styles in the shipped frontend.

No application code changes are authorized by this specification. Implementation should begin only after review and agreement on the open decisions.
