---
name: thatopen-items-finder
description: Complete guide for using OBC.ItemsFinder from @thatopen/components. Use when asked to "query elements", "find walls/columns/doors", "filter IFC elements by category or attribute", "use ItemsFinder", "create a SmartView query", or "add a named query" in the PIAS BIM web app.
category: thatopen
---

# OBC.ItemsFinder — ThatOpen Query Engine

## Invoke This Skill When
- "find all walls in the model"
- "query elements by IFC category"
- "filter elements by name or attribute"
- "find columns on a specific floor level"
- "add a new named query to SmartViews"
- "how does ItemsFinder work"
- "what is finder.create / finder.list"

---

## What is OBC.ItemsFinder?

`OBC.ItemsFinder` is the **declarative query engine** built into `@thatopen/components`. It lets you define named, reusable queries that run across all loaded BIM models and return a `ModelIdMap` — the universal ID format used by every other component in the ThatOpen ecosystem.

**Package**: `@thatopen/components` (no separate install needed)
**Import**: `import * as OBC from "@thatopen/components"`
**Access**: `const finder = components.get(OBC.ItemsFinder)`

It is a **singleton** — calling `components.get(OBC.ItemsFinder)` always returns the same instance.

---

## Architecture Position

```
FragmentsManager (loads .ifc / .frag models)
         ↓
   OBC.ItemsFinder          ← define queries here
         ↓
    ModelIdMap               ← universal result format
    ↙    ↓    ↘    ↘
 Hider  Highlighter  Classifier  BoundingBoxer
```

`ItemsFinder` sits between data loading and any visual/data operation. Its output (`ModelIdMap`) is directly consumable by all action components.

---

## Phase 1: Get the Instance

```typescript
import * as OBC from "@thatopen/components";

const finder = components.get(OBC.ItemsFinder);
```

Always use `components.get()`. Never instantiate it directly.

---

## Phase 2: Create Named Queries

`finder.create(name, queryArray)` registers a named query in `finder.list`.

### Query Dimension 1 — Category (Most Common)

Match by IFC category using regex. The category string is the IFC type in **UPPERCASE** (e.g., `IFCWALL` → `WALL`).

```typescript
// Match any category containing "WALL" or "SLAB"
finder.create("Walls & Slabs", [
  { categories: [/WALL/, /SLAB/] }
]);

// Match doors
finder.create("Doors", [
  { categories: [/DOOR/] }
]);

// Match windows
finder.create("Windows", [
  { categories: [/WINDOW/] }
]);

// Match columns
finder.create("Columns", [
  { categories: [/COLUMN/] }
]);
```

> **Tip**: Use regex patterns like `/WALL/` (not `"IFCWALL"` strings) — this matches the fragment category name which is typically the IFC type stripped of the `IFC` prefix.

### Query Dimension 2 — Attributes

Filter by IFC property values. Combine with category filters for precision.

```typescript
// Find walls whose Name property matches "Masonry"
finder.create("Masonry Walls", [
  {
    categories: [/WALL/],
    attributes: {
      queries: [{ name: /Name/, value: /Masonry/ }]
    }
  }
]);

// Find elements by a specific tag value
finder.create("Tagged Elements", [
  {
    attributes: {
      queries: [{ name: /Tag/, value: /STRUCT-01/ }]
    }
  }
]);
```

`attributes.queries` is an array of `{ name: RegExp, value: RegExp | number | boolean }` pairs.

### Query Dimension 3 — Relations (Spatial Containment)

Filter by IFC relationships — most useful for finding elements on a specific **floor level** using `ContainedInStructure`.

```typescript
// Find columns on a specific floor level by storey name
finder.create("Column at level +0.20_FLOOR_LEVEL1", [
  {
    categories: [/COLUMN/],
    relation: {
      name: "ContainedInStructure",
      query: {
        attributes: {
          queries: [{ name: /Name/, value: /\+0\.20_FLOOR_LEVEL1/ }]
        }
      }
    }
  }
]);

// Another level
finder.create("Column at level +3.60_FLOOR_LEVEL2", [
  {
    categories: [/COLUMN/],
    relation: {
      name: "ContainedInStructure",
      query: {
        attributes: {
          queries: [{ name: /Name/, value: /\+3\.60_FLOOR_LEVEL2/ }]
        }
      }
    }
  }
]);
```

`relation.name` is the IFC relationship class name (e.g., `"ContainedInStructure"`, `"AggregatedBy"`).
`relation.query` is a nested query applied to the **related element** (the spatial structure element).

---

## Phase 3: Execute Queries

### Run a Named Query → ModelIdMap

```typescript
// Get a stored FinderQuery by name
const finderQuery = finder.list.get("Walls & Slabs");
if (!finderQuery) return;

// Execute it — returns Promise<ModelIdMap>
const result = await finderQuery.test();

// result is: { [modelUuid: string]: Set<number> }
```

> Use `finderQuery.test()` to execute a stored query.

### Inline Query (No Storage)

```typescript
// Run a query without storing it
const result = await finder.getItems([
  { categories: [/WALL/] }
]);
```

Use `finder.getItems(queryArray)` when you need a one-off result without registering a named query.

---

## Phase 4: Use the Results

`ModelIdMap` is directly accepted by all action components:

```typescript
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

const hider = components.get(OBC.Hider);
const highlighter = components.get(OBF.Highlighter);

// Hide everything, then show only the queried elements
await hider.set(false);
await hider.set(true, result);

// Highlight queried elements
await highlighter.highlightByID("select", result, true, true);
```

### ModelIdMap Utilities

```typescript
// Join multiple maps into one
const combined = OBC.ModelIdMapUtils.join([map1, map2]);

// Clone a map (deep copy)
const copy = OBC.ModelIdMapUtils.clone(map);

// Add map2 into map1 (mutates map1)
OBC.ModelIdMapUtils.add(map1, map2);
```

---

## Phase 5: Cache Invalidation

When a model is disposed/unloaded, clear the finder cache so the next `test()` re-evaluates against currently loaded models:

```typescript
fragments.onFragmentsDisposed.add(({ modelID }) => {
  // Clears the ItemsFinder cache so the next query
  // execution re-evaluates with current models
  finder.list.forEach((query) => query.dispose());
});
```

See the project's [fragments-manager.ts](../../../src/bim-components/setup/src/fragments-manager.ts) for the actual implementation.

---

## PIAS Project Patterns

### Where Queries Are Registered

All named queries are registered in:
`src/bim-components/setup/src/items-finder.ts`

Called once from:
`src/bim-components/setup/index.ts` → `setupItemsFinder(components)`

### Adding a New Query

Edit [items-finder.ts](../../../src/bim-components/setup/src/items-finder.ts):

```typescript
// Category only
finder.create("Stairs", [
  { categories: [/STAIR/] }
]);

// Category + attribute
finder.create("Structural Beams", [
  {
    categories: [/BEAM/],
    attributes: {
      queries: [{ name: /Name/, value: /Structural/ }]
    }
  }
]);

// Level-based
finder.create("Beam at level +3.60_FLOOR_LEVEL2", [
  {
    categories: [/BEAM/],
    relation: {
      name: "ContainedInStructure",
      query: {
        attributes: {
          queries: [{ name: /Name/, value: /\+3\.60_FLOOR_LEVEL2/ }]
        }
      }
    }
  }
]);
```

### How SmartViews Uses ItemsFinder

`SmartViews` stores **query names** (not raw IDs). On `apply()`, it resolves names → `ModelIdMap`:

```typescript
// From SmartViews/index.ts
const finder = this.components.get(OBC.ItemsFinder);

for (const name of visibilityExceptions.queries) {
  const finderQuery = finder.list.get(name);       // look up by name
  if (!finderQuery) continue;
  const map = await finderQuery.test();              // execute → ModelIdMap
  await hider.set(!defaultVisibility, map);
}
```

**Rule**: When adding a new query to `SmartViews`, always register the named query in `items-finder.ts` first.

### How queries-hider Uses ItemsFinder

`src/ui-templates/tables/queries-hider/` reads `finder.list` to build the UI table of available queries and runs `finderQuery.test()` when the user toggles visibility.

---

## API Reference

| Method / Property | Type | Description |
|---|---|---|
| `finder.create(name, queries)` | `FinderQuery` | Register a named query in `finder.list` |
| `finder.list` | `DataMap<string, FinderQuery>` | All stored named queries |
| `finder.getItems(queries)` | `Promise<ModelIdMap>` | Execute inline query without storing |
| `finder.export()` | `object` | Serialize all queries to plain object |
| `finder.import(data)` | `void` | Restore queries from serialized data |
| `finderQuery.test()` | `Promise<ModelIdMap>` | Execute a stored query |
| `finderQuery.dispose()` | `void` | Clear the query's cached results |

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Using `"IfcWall"` as category string | Use `/WALL/` regex — categories are uppercase without the `IFC` prefix |
| Calling `finder.create()` before fragments are loaded | It's OK — queries are lazy. They only query loaded models when `.test()` is called |
| Expecting results immediately after `create()` | Must call `await finderQuery.test()` to get results |
| Using `finder.list.get(name)` with wrong case | Query names are case-sensitive strings — must match exactly |
| Not handling cache after model dispose | Call `query.dispose()` on fragment disposal events to clear stale caches |
| Referencing a SmartView query name that doesn't exist in finder.list | Always add to `items-finder.ts` before referencing in SmartViews |

---

## References

- `references/query-schema.md` — Deep dive on query object structure, all fields, types, and nested relation queries
- `references/modelidmap.md` — How ModelIdMap works, utilities, and how to feed results to Hider/Highlighter/Classifier
- Official Tutorial: https://docs.thatopen.com/Tutorials/Components/Core/ItemsFinder
- Official Source: https://github.com/ThatOpen/engine_components/blob/main/packages/core/src/fragments/ItemsFinder/
