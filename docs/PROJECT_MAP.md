# Project Map

Source of truth for audience/runtime scope: `project-profile.json`

## Scope

- Project id: `prototype-class-setting`
- Audience pairs: Web business and App business
- Desktop/Web mode: `width > 430px`
- Mobile/App mode: `width <= 430px`
- Prototype stack: static HTML, CSS, JavaScript ES modules, local/session storage

## Entrypoints

### Web and Responsive Pages

- `index.html`: school home calendar and capacity screen; boots `src/main.js`.
- `member-home.html`: member list/search screen; boots `src/platforms/member-home.js`.
- `member-registration.html`: member registration screen; boots `src/platforms/member-registration.js`.
- `member-detail.html`: member detail screen; boots `src/platforms/member-detail.js`.
- `member-edit.html`: member edit screen; boots `src/platforms/member-edit.js`.
- `member-tag-management.html`: member tag management screen; boots `src/platforms/member-tag-management.js`.
- `school-reservation-create.html`: school reservation create flow; boots `src/platforms/school-reservation-create.js`.
- `school-reservation-detail.html`: school reservation detail flow; boots `src/platforms/school-reservation-detail.js`.
- `school-reservation-member-search.html`: school reservation member search flow; boots `src/platforms/school-reservation-member-search.js`.

### Center Settings Pages

- `center-settings.html`: redirect shell to `center-settings/business-schedule.html`.
- `center-settings/business-schedule.html`: school business/day-off settings shell; boots `src/platforms/business-schedule-settings.js`.
- `center-settings/class.html`: Web class settings list and modal management; boots `src/platforms/class-settings.js`.
- `center-settings/class-create.html`: Web class creation form; boots `src/platforms/class-create.js`.
- `center-settings/class-edit.html`: Web class edit form; boots `src/platforms/class-edit.js`.

### App Pages

- `app-more.html`: static App more/settings menu markup styled by `styles/pages/app-more.css`.
- `app-class-settings.html`: App class settings list; boots `src/platforms/app-class-settings.js`.
- `app-class-registration.html`: App class registration flow; boots `src/platforms/app-class-registration.js`.
- `app-class-detail.html`: App class detail flow; boots `src/platforms/app-class-detail.js`.
- `report.html`: App/Web report list screen; boots `src/platforms/report.js`.
- `report-create.html`: App/Web report compose shell; boots `src/platforms/report-create.js`.
- `report-pet-select.html`: App report pet selection flow; boots `src/platforms/report-pet-select.js`.

## Runtime

- `src/main.js`: default bootstrap for `index.html`; creates school home state and renders the school home screen.
- `src/platforms/`: one file per HTML entrypoint when the page is module-driven.
- Platform files should stay thin: load state, call feature renderers, or attach page-specific behavior.
- Feature modules own screen behavior and rendering; storage/services own persistence and business rules.

## Feature Modules

### School Home and Reservations

- `src/features/school-home/school-home-state.js`: school calendar, reservation, filtering, and class capacity state rules.
- `src/features/school-home/school-home-renderer.js`: semantic school home renderer for Web and App responsive layouts.
- `src/features/school-reservation/school-reservation-create-renderer.js`: reservation creation UI and save flow.
- `src/features/school-reservation/school-reservation-detail-renderer.js`: reservation detail UI.
- `src/features/school-reservation/school-reservation-member-search-renderer.js`: member/pet search UI for reservation creation.
- `src/features/school-reservation/school-reservation-draft.js`: session draft helpers for reservation creation.
- `styles/pages/school-home.css`: school home page layout.
- `styles/pages/school-reservation.css`: reservation flow layout.

### Class Settings

- `src/features/class-settings/class-settings-renderer.js`: Web class list, settings navigation, modal create/edit/delete behavior.
- `src/features/class-settings/class-form-renderer.js`: Web class create/edit form renderer for dedicated pages.
- `src/features/app-class-settings/app-class-settings-renderer.js`: App class list and entry flow.
- `src/features/app-class-registration/app-class-registration-renderer.js`: App class creation/editing form flow.
- `src/features/app-class-detail/app-class-detail-renderer.js`: App class detail screen.
- `styles/pages/class-settings.css`: Web class settings and class form styles.
- `styles/pages/app-class-settings.css`: App class settings list styles.
- `styles/pages/app-class-registration.css`: App class registration form styles.
- `styles/pages/app-class-detail.css`: App class detail styles.

### Center Settings

- `src/features/center-settings/center-settings-renderer.js`: shared center settings shell and navigation.
- `src/features/business-schedule-settings/business-schedule-settings-renderer.js`: business/day-off settings placeholder content.
- `styles/pages/center-settings.css`: center settings shell and sidebar styles.
- `styles/pages/business-schedule.css`: business/day-off settings content styles.

### Member Management

- `src/features/member-home/member-home-state.js`: member list, filtering, and list-state rules.
- `src/features/member-home/member-home-renderer.js`: member home renderer.
- `src/features/member-registration/member-registration-state.js`: registration context from URL and storage.
- `src/features/member-registration/member-registration-renderer.js`: member registration renderer.
- `src/features/member-detail/member-detail-state.js`: member detail state loading.
- `src/features/member-detail/member-detail-renderer.js`: member detail renderer.
- `src/features/member-detail/member-detail-draft.js`: member detail draft helpers.
- `src/features/member-edit/member-edit-state.js`: member edit state loading.
- `src/features/member-edit/member-edit-renderer.js`: member edit renderer.
- `src/features/member-edit/member-edit-draft.js`: member edit draft helpers.
- `src/features/member-tag-management/member-tag-management-state.js`: member tag catalog and assignment state.
- `src/features/member-tag-management/member-tag-management-renderer.js`: member tag management renderer.
- `styles/pages/member-home.css`: member home, detail, edit, and tag management styles.
- `styles/pages/member-registration.css`: member registration/edit form styles.

### App More and Report

- `src/features/report/report-renderer.js`: App/Web report list renderer and report entry storage access.
- `src/platforms/report-create.js`: report compose page behavior for selected pet summary, Web pet selection modal, Web selected-pet preview rendering, and reset handling.
- `src/platforms/report-pet-select.js`: report pet selection, reservation/class filtering, and selection persistence.
- `styles/pages/app-more.css`: static App more/settings menu styles.
- `styles/pages/report.css`: App/Web report list, compose, and pet selection styles.

## Shared JavaScript

- `src/components/empty-state.js`: reusable empty state component.
- `src/components/header-icon-button.js`: shared icon button helper.
- `src/components/member-tag-chips.js`: reusable member tag chip renderer.
- `src/components/member-tag-input.js`: reusable member tag input behavior.
- `src/components/navigation.js`: Web sidebar and App bottom navigation helpers.
- `src/components/reservation-search-filter.js`: shared reservation search/filter UI helper.
- `src/components/toast.js`: toast UI helper.
- `src/constants/ui-state.js`: shared UI state constants.
- `src/services/member-tag-service.js`: member tag normalization and business rules.
- `src/utils/dom.js`: DOM creation helper.
- `src/utils/format.js`: display formatting helper.
- `src/utils/ime-input.js`: IME input helper.
- `src/utils/member-date.js`: member date formatting/parsing helper.
- `src/utils/phone.js`: phone normalization helper.

## Storage

- `src/storage/storage-utils.js`: generic JSON localStorage helpers.
- `src/storage/school-home-storage.js`: school reservation localStorage access and fixture fallback.
- `src/storage/member-storage.js`: member list, member tag catalog, legacy migration, and deletion persistence.
- `src/storage/class-storage.js`: school class list localStorage access and fixture fallback.
- `src/features/school-reservation/school-reservation-draft.js`: reservation draft sessionStorage.
- `src/platforms/report-create.js` and `src/platforms/report-pet-select.js`: App/Web report selected pet sessionStorage.
- `src/features/report/report-renderer.js`: App report entry localStorage.

## Styles

- `styles/main.css`: common stylesheet entrypoint imported by HTML pages.
- `styles/base/tokens.css`: shared color, spacing, and radius tokens.
- `styles/base/reset.css`: reset rules.
- `styles/base/base.css`: typography and global element defaults.
- `styles/components/button.css`: shared button patterns.
- `styles/components/calendar.css`: shared calendar patterns.
- `styles/components/empty-state.css`: shared empty-state patterns.
- `styles/components/filter.css`: shared Web filter panel and filter toggle patterns.
- `styles/components/form.css`: shared form patterns.
- `styles/components/member-tag.css`: shared member tag patterns.
- `styles/components/modal.css`: shared modal patterns.
- `styles/components/navigation.css`: shared navigation patterns.
- `styles/components/surface.css`: shared framed surface/panel patterns.
- `styles/layout/shell.css`: shared shells, headers, side navigation, and common screen layout.
- `styles/layout/responsive.css`: shared Web/App visibility switching rules.
- `styles/pages/`: page-specific styles listed with their feature modules above.

## Assets and Docs

- `assets/icons/`: SVG icons and logo assets.
- `assets/images/`: default profile and bitmap-style image assets.
- `docs/PROJECT_MAP.md`: this architecture map.
- `README.md`: short project overview.
- `outputs/`: generated product/spec outputs when present; not part of runtime.
