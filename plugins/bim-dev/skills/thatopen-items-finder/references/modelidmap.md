# ModelIdMap Reference — OBC.ItemsFinder

> Package: `@thatopen/components` v3.x+

`ModelIdMap` is the core data type that `ItemsFinder` returns. It is the **universal currency** of the ThatOpen ecosystem — every action component accepts it.

---

## What is ModelIdMap?

```typescript
// Type definition
type ModelIdMap = {
  [modelUuid: string]: Set<number>; // modelUuid → set of local element IDs
}
```

- **Key**: the UUID of the loaded model (`model.uuid` from `FragmentsManager`)
- **Value**: a `Set<number>` of local element IDs within that model

### Example

```typescript
const result: OBC.ModelIdMap = {
  "abc-123-def": new Set([101, 205, 308]),
  "xyz-456-ghi": new Set([12, 45])
};
// Means: elements 101, 205, 308 from model "abc-123-def"
//         elements 12, 45 from model "xyz-456-ghi"
```

---

## Getting a ModelIdMap

### From a Stored FinderQuery

```typescript
const finder = components.get(OBC.ItemsFinder);
const query = finder.list.get("Walls");
if (!query) return;

const result = await query.test(); // Promise<ModelIdMap>
```

### From an Inline Query

```typescript
const result = await finder.getItems([
  { categories: [/WALL/] }
]); // Promise<ModelIdMap>
```

---

## Using ModelIdMap with Other Components

### OBC.Hider — Visibility Control

```typescript
const hider = components.get(OBC.Hider);

// Hide everything in the scene
await hider.set(false);

// Show only the queried elements
await hider.set(true, result);

// Or: Show everything EXCEPT the queried elements
await hider.set(true);
await hider.set(false, result);
```

### OBF.Highlighter — Color Highlighting

```typescript
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";

const highlighter = components.get(OBF.Highlighter);

// Highlight with a built-in style ("select", "hover")
await highlighter.highlightByID("select", result, true, true);

// Highlight with a custom color style
highlighter.styles.set("myStyle", {
  color: new THREE.Color("#ff6600"),
  renderedFaces: 1,
  opacity: 1,
  transparent: false,
});
await highlighter.highlightByID("myStyle", result);

// Clear a highlight style
await highlighter.clear("myStyle");
```

### OBC.Classifier — Grouping

```typescript
const classifier = components.get(OBC.Classifier);
// Classifier typically works with the loaded models directly,
// but ModelIdMap results can be cross-referenced with classifier groups.
```

### OBC.BoundingBoxer — Camera Fit

```typescript
const boundingBoxer = components.get(OBC.BoundingBoxer);
boundingBoxer.addIdMap(result);
boundingBoxer.fit(); // zoom camera to queried elements
boundingBoxer.reset();
```

---

## ModelIdMapUtils — Utility Functions

`OBC.ModelIdMapUtils` provides functional utilities for combining, comparing, and transforming maps.

### Join (Union)

Merge multiple maps into one — elements from ALL maps are included:

```typescript
const map1 = await query1.test();
const map2 = await query2.test();

const combined = OBC.ModelIdMapUtils.join([map1, map2]);
```

### Add (Mutate In-Place)

Add entries from `source` into `target` (modifies `target`):

```typescript
const target: OBC.ModelIdMap = {};
OBC.ModelIdMapUtils.add(target, map1);
OBC.ModelIdMapUtils.add(target, map2);
// target now contains everything from map1 + map2
```

### Clone (Deep Copy)

Create an independent copy of a map:

```typescript
const copy = OBC.ModelIdMapUtils.clone(originalMap);
```

### isEqual

Check if two maps contain the same elements:

```typescript
const same = OBC.ModelIdMapUtils.isEqual(map1, map2); // boolean
```

---

## Multiple Queries → Single Map (SmartViews Pattern)

The PIAS SmartViews component demonstrates how to resolve multiple named queries into one combined map:

```typescript
// From SmartViews/index.ts
const finder = this.components.get(OBC.ItemsFinder);
const queryPromises = [];

for (const name of visibilityExceptions.queries) {
  const finderQuery = finder.list.get(name);
  if (!finderQuery) continue;
  queryPromises.push(finderQuery.test());
}

// Run all queries in parallel
const maps = await Promise.all(queryPromises);

// Merge into one ModelIdMap
const combined = OBC.ModelIdMapUtils.join(maps);

// Apply to Hider
await hider.set(!defaultVisibility, combined);
```

---

## Type-Safe Lookup from Table Rows

When using `ModelIdMap` results in a BUI Table, IDs may come through as strings. Always cast both sides:

```typescript
// DataTransform callback — safe ID comparison
const item = queryResultList.find((x) => String(x.id) === String(rowId));
```

---

## Empty Map Handling

A query on models that have no matching elements returns an empty map `{}` — not `null` or `undefined`. Always check before using:

```typescript
const result = await query.test();

const hasResults = Object.keys(result).length > 0;
if (!hasResults) {
  console.warn("No elements matched the query.");
  return;
}
```

---

## Serialization

`ModelIdMap` can be converted to/from a plain JSON-compatible object using the built-in utilities:

```typescript
// Convert Set values to arrays for JSON serialization
const serializable = Object.fromEntries(
  Object.entries(result).map(([uuid, ids]) => [uuid, [...ids]])
);

// Restore from serialized form
const restored: OBC.ModelIdMap = Object.fromEntries(
  Object.entries(serializable).map(([uuid, ids]) => [uuid, new Set(ids as number[])])
);
```
