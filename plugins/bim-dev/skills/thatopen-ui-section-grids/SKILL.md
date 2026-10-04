---
name: thatopen-ui-section-grids
description: Comprehensive workflow to create, customize, and integrate UI sections and dynamic layouts using the @thatopen/ui Grid and Panel system in PIAS.
---

# LearnThatOpen — UI Sections & Layout Grids Guide

## Invoke This Skill When
- Asked to "add a new panel", "create a UI section", "show BIM data in the sidebar", "build a new BIM panel", or "add [feature] to the BIM viewer UI".
- Modifying layout files under `src/ui-templates/grids/` or custom panels under `src/ui-templates/sections/`.
- Asked to build a new page grid or handle CSS Grid template areas inside the 3D viewer sidebar or top toolbar.
- Troubleshooting Reactivity (HMR) or styling boundaries inside Shadow DOM custom components.

---

## 1. Directory & File layout
Keep structural elements separate from data logic, and follow the **PascalCase** naming convention for supporting grid scripts.

```
src/ui-templates/
├── sections/               # Component panel sections
│   ├── [feature].ts        # Statefull template files (e.g. models.ts, properties.ts)
│   └── index.ts            # Public export index
└── grids/                  # CSS Layout Grids
    ├── [grid-name]/        # Dedicated layout grid folder
    │   ├── index.ts        # The main grid template factory (e.g. bimpage-grid-sidebar)
    │   └── src/
    │       ├── types.ts    # Parameterized TypeScript elements/layouts types
    │       └── index.ts    # Re-exports types to main grid index
    └── index.ts            # Public export index for all grids
```

---

## 2. Defining Grid Types (`src/ui-templates/grids/[grid-name]/src/types.ts`)
To ensure type safety for layouts and nested elements, define a parameterized `BUI.Grid` inside `types.ts`:

```typescript
import * as BUI from "@thatopen/ui";
import { MySectionState } from "../../../sections/my-section";

// 1. Define individual elements mapping names to their respective states
export type MySectionElement = {
  name: "mySection";
  state: MySectionState;
};

export type ViewportElement = {
  name: "viewport";
  state: {};
};

// 2. Combine elements into a tuple type
type MyGridElements = [
  ViewportElement,
  MySectionElement,
];

// 3. Define allowed layouts names
type MyGridLayouts = [
  "MainView",
  "SplitView",
];

// 4. Parameterize and export the BUI.Grid type
export type MyGrid = BUI.Grid<
  MyGridLayouts,
  MyGridElements
>;
```

---

## 3. Creating Grid Template (`src/ui-templates/grids/[grid-name]/index.ts`)
Define the grid component factory. Set up templates, layouts, and initial view states inside a `BUI.ref` callback.

```typescript
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { MyGrid } from "./src";
import { mySectionTemplate } from "../../sections/my-section";
import { viewportContainerTemplate } from "../../containers";

interface MyGridState {
  components: OBC.Components;
  viewport?: BUI.Viewport;
}

export const myGridTemplate: BUI.StatefullComponent<MyGridState> = (state) => {
  const { components, viewport } = state;

  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as MyGrid;

    // 1. Assign templates & initial states
    grid.elements = {
      viewport: {
        template: viewportContainerTemplate,
        initialState: { viewport },
      },
      mySection: {
        template: mySectionTemplate,
        initialState: { components },
      },
    };

    // 2. Define CSS Grid template areas
    grid.layouts = {
      MainView: {
        template: `
          "mySection" 1fr
        `,
      },
      SplitView: {
        template: `
          "viewport mySection" 1fr
          / 2fr 1fr
        `,
      },
    };

    // 3. Define default active layout
    grid.layout = "MainView";
  };

  return BUI.html`
    <bim-grid ${BUI.ref(onCreated)} class="components-grid"></bim-grid>
  `;
};
```

---

## 4. Creating Custom UI Sections (`src/ui-templates/sections/[feature].ts`)
Create stateful templates that fetch tools from the BIM registry and return `<bim-panel>` or `<bim-panel-section>` elements:

```typescript
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import { appIcons } from "../../globals";

export interface FeatureSectionState {
  components: OBC.Components;
}

export const featureSectionTemplate: BUI.StatefullComponent<FeatureSectionState> = (state) => {
  const { components } = state;
  const fragments = components.get(OBC.FragmentsManager);

  // Setup pre-built tables or components
  const [dataTable] = CUI.tables.modelsList({
    components,
    actions: { download: false },
  });

  const onSearch = (e: Event) => {
    const input = e.target as BUI.TextInput;
    dataTable.queryString = input.value;
  };

  return BUI.html`
    <bim-panel style="height: 100%;">
      <bim-panel-section fixed icon=${appIcons.INFO} label="Feature Manager">
        <div style="display: flex; gap: 0.5rem; flex-direction: column;">
          <bim-text-input @input=${onSearch} placeholder="Search..." debounce="100"></bim-text-input>
          ${dataTable}
        </div>
      </bim-panel-section>
    </bim-panel>
  `;
};
```

---

## 5. UI Reactivity, Events & Lifecycle Cleanups

### A. Reactive Updates (Re-rendering)
BUI elements use Lit under the hood. Mutating deep object properties (e.g. `table.dataTransform.ID = ...`) will **not** trigger re-renders because object reference remains unchanged. Always reassign properties as a **single, new object reference**:
```typescript
table.dataTransform = {
  ID: (value) => BUI.html`<span>${value}</span>`,
};
```

### B. Arrow Functions for DOM Callbacks
Always use arrow functions for DOM events to preserve `this` context cleanly and allow proper unbinding:
```typescript
private _onInput = (e: Event) => {
  const input = e.target as BUI.TextInput;
  console.log(input.value);
};
```

### C. Clean up Listeners on Disconnection
If your panel subscribes to global update arrays or listeners, intercept the returned element's `disconnectedCallback` to cleanly remove the listeners and prevent memory leaks:
```typescript
const panel = BUI.html`<bim-panel>...</bim-panel>`;

const originalDisconnect = (panel as any).disconnectedCallback;
(panel as any).disconnectedCallback = function (this: any) {
  activeUpdateFunctions.delete(myUpdateCallback); // Clear updates registration
  if (originalDisconnect) {
    originalDisconnect.call(this);
  }
};
```

---

## 6. Styling Boundaries & Shadow DOM Customizations

### A. Overriding Custom Properties
BUI custom elements render inside a Shadow DOM. Style rules inside global stylesheets cannot access internal shadow elements directly. Pierce shadow boundaries by defining custom CSS properties inside container elements:
```css
/* In global style.css */
.components-grid * {
  --bim-label--c: var(--fg) !important;
  --bim-icon--c: var(--fg) !important;
}
```

### B. Event Swallowing in Custom Elements
Some custom elements swallow native click/mouse events. To make click handlers 100% reliable, wrap cell templates in a standard native element (like `<span>` or `<div>`) and hook the event listener there:
```typescript
BUI.html`
  <div @click=${(e) => handleCellClick(e)} style="cursor: pointer;">
    ${value}
  </div>`
```

---

## 7. Registration & Verification

1. Export grids in `src/ui-templates/grids/index.ts`:
   ```typescript
   export * from "./my-grid";
   ```
2. Export sections in `src/ui-templates/sections/index.ts`:
   ```typescript
   export * from "./my-section";
   ```
3. Verify that the build succeeds by running:
   ```bash
   npm.cmd run build
   ```

---

## 8. Common Mistakes & Troubleshooting

- **Mismatched CSS Grid Area Names**: Spelling layout grid area names differently from the element key names (e.g. `"my-section"` inside template string vs `"mySection"` in elements config) will cause grid positioning to fail.
- **Calling `components.get` Early**: Running registry lookups before `await components.init()` finishes will trigger runtime errors.
- **Forgetting Layout Track Definitions**: Multi-column or multi-row layouts must declare tracks (e.g. `/ 2fr 1fr` or `1fr / 1fr 1fr 1fr`) to scale correctly.
- **Double Scrollbars**: Ensure nested components inside panels have `overflow: hidden;` or proper flex settings to avoid double scrollbars inside panels.
