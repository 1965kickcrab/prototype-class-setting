# AGENTS.md

## 1. Project

### Purpose

Build a prototype for Class Segmentation.

Validate:
* Class creation
* Class capacity management
* Reservation within class capacity
* Multi-class support
* Class-based filtering

This prototype focuses on validating product behavior and user experience.


## 2. Technology

* HTML
* CSS
* JavaScript (ES Modules)
* No framework unless explicitly requested
* Local storage allowed
* Mock data allowed when required


## 3. Architecture

Use a conventional web project structure.

```text

/project
├─ index.html
├─ assets/
│  ├─ images/
│  └─ icons/
├─ src/
│  ├─ features/
│  ├─ services/
│  ├─ storage/
│  ├─ components/
│  ├─ styles/
│  └─ main.js
└─ README.md

```

### Responsibilities

* HTML defines structure.
* CSS defines presentation.
* JavaScript defines behavior.
* services contain business logic.
* storage contains persistence logic.
* components contain reusable UI.
* features contain feature-specific functionality.

Do not generate entire screens from JavaScript when the structure can be defined in HTML.

Keep business logic separate from DOM manipulation whenever practical.

Avoid placing unrelated functionality into a single file.

Avoid unnecessarily complex folder hierarchies.


## 4. DOM Rules

Use semantic hooks.

Prefer:
* data-action
* data-field
* data-state
* data-entity-id

CSS classes are primarily for styling.

Do not rely on visual class names as application logic selectors.


## 5. CSS Rules

Prefer reusable styles before creating page-specific styles.

When creating new screens, maintain the existing UI style, scale, spacing, typography, and component dimensions.

Promote duplicated UI into shared components when appropriate.

Keep styling concerns separate from business logic.


## 6. Reference Implementation Rules

Reference implementations are for understanding behavior only.

Do not:
* Copy files directly
* Replicate legacy architecture blindly
* Mirror old folder structures without reason

Instead:
* Analyze the behavior
* Rebuild using the current project structure
* Follow current naming and architecture rules

This rule takes priority over implementation convenience.


## 7. Change Workflow

Before making changes:
    1. Identify affected features.
    2. Reuse existing components where possible.
    3. Minimize the scope of changes.

Avoid unrelated refactoring.

Prefer incremental updates.


## 8. Naming

Use consistent domain terminology.

Do not introduce alternative terminology without approval.


## 9. Output Rules

When implementing changes:
* List created files
* List modified files
* Summarize the implementation

Keep changes focused on the requested scope.


## 10. Never Do

* Do not rewrite unrelated code.
* Do not merge unrelated features.
* Do not change terminology.
* Do not remove existing functionality unless requested.
* Do not copy reference implementations verbatim.
* Do not perform large-scale refactoring without approval.
