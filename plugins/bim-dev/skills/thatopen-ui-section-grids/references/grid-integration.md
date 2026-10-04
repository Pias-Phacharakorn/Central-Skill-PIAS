# Grid Integration — @thatopen/ui Grid System

This guide explains how to define, configure, and register UI sections into a `@thatopen/ui` (`BUI`) layout grid.

---

## Architecture Overview

In `@thatopen/ui`, layouts are managed dynamically using the `<bim-grid>` component (`BUI.Grid`). A grid is composed of:
1. **Elements**: A key-value map defining the template and initial state of each sub-component (like toolbars, panels, tables, or viewports).
2. **Layouts**: A configuration of CSS Grid Template Areas representing different view arrangements (e.g., a "Dashboard" view vs. a "3D Model" view).
3. **Active Layout**: The selected layout key currently rendered on screen.

All custom grids in this project are located under `src/ui-templates/grids/`.

---

## Step-by-Step Integration Workflow

### Step 1 — Define Grid Types
In the grid's `src/types.ts` file, define the structure of your elements and layouts. This provides full TypeScript safety for your grids.

```typescript
// src/ui-templates/grids/my-grid/src/types.ts
import * as BUI from "@thatopen/ui";
import { MySectionState } from "../../../sections/my-section";

// Define individual elements
export type MySectionElement = {
  name: "mySection";
  state: MySectionState;
};

export type ViewportElement = {
  name: "viewport";
  state: {};
};

// Combine elements into a tuple
type MyGridElements = [
  ViewportElement,
  MySectionElement,
];

// Define available layouts
type MyGridLayouts = [
  "MainView",
  "SplitView",
];

// Export the parameterized grid type
export type MyGrid = BUI.Grid<
  MyGridLayouts,
  MyGridElements
>;
```

### Step 2 — Create the Grid Template
In the grid's index file (e.g., `src/ui-templates/grids/my-grid/index.ts`), define the grid component factory. Retrieve the grid instance in a `BUI.ref` callback, populate its elements/layouts, and return `<bim-grid>`.

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

    // 1. Assign sections/templates to grid.elements
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

    // 2. Configure layouts using CSS Grid Template Areas
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

    // 3. Set the initial active layout
    grid.layout = "MainView";
  };

  return BUI.html`
    <bim-grid ${BUI.ref(onCreated)} class="components-grid"></bim-grid>
  `;
};
```

---

## Dynamic Layout Switching

To switch layouts programmatically at runtime, retrieve the grid element and set the `layout` property to one of the keys defined in your `layouts` object:

```typescript
const toggleLayout = (grid: MyGrid) => {
  grid.layout = grid.layout === "MainView" ? "SplitView" : "MainView";
};
```

---

## Common Mistakes

* **Mismatched CSS Grid Area Names**: The string names used in `grid.layouts.template` must exactly match the element keys defined in `grid.elements` (e.g., using `my-section` instead of `mySection`).
* **Missing Column/Row Definitions**: When doing multi-column or multi-row layouts, ensure you provide tracks (e.g., `/ 2fr 1fr` or `auto 1fr`) matching the dimensions of the layout template string.
* **Mutating Elements Directly**: Always define the whole `grid.elements` and `grid.layouts` structure in the `onCreated` ref callback rather than modifying individual element properties dynamically.
