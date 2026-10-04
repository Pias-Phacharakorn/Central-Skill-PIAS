# Query Schema Reference — OBC.ItemsFinder

> Package: `@thatopen/components` v3.x+

This document covers the full structure of a query object passed to `finder.create()` or `finder.getItems()`.

---

## Top-Level Query Object

Each element in the `queries` array passed to `finder.create(name, queries)` is a `FinderQueryData` object:

```typescript
interface FinderQueryData {
  categories?: RegExp[];       // IFC category patterns
  attributes?: {
    queries: AttributeQuery[];  // property filters
  };
  relation?: {
    name: string;              // IFC relationship class name
    query: FinderQueryData;    // nested query on the related element
  };
}

interface AttributeQuery {
  name: RegExp;                        // property name pattern
  value: RegExp | number | boolean;    // expected property value
}
```

---

## `categories` Field

Filters elements by IFC **category** (entity type). Uses an array of `RegExp` patterns matched against the fragment category string.

### Category String Format

The category string is derived from the IFC entity type, typically **uppercase without the `IFC` prefix**:

| IFC Entity | Category Pattern |
|---|---|
| `IfcWall` / `IfcWallStandardCase` | `/WALL/` |
| `IfcSlab` | `/SLAB/` |
| `IfcColumn` | `/COLUMN/` |
| `IfcDoor` | `/DOOR/` |
| `IfcWindow` | `/WINDOW/` |
| `IfcBeam` | `/BEAM/` |
| `IfcStair` / `IfcStairFlight` | `/STAIR/` |
| `IfcRailing` | `/RAILING/` |
| `IfcRoof` | `/ROOF/` |
| `IfcFurnishingElement` | `/FURNISHING/` |
| `IfcBuildingElementProxy` | `/PROXY/` |
| `IfcSpace` | `/SPACE/` |
| `IfcOpeningElement` | `/OPENING/` |

```typescript
// Multiple categories in one query — finds walls OR slabs
finder.create("Walls & Slabs", [
  { categories: [/WALL/, /SLAB/] }
]);

// Separate queries for each category
finder.create("Doors", [{ categories: [/DOOR/] }]);
finder.create("Windows", [{ categories: [/WINDOW/] }]);
```

> **Multiple items in the array** = logical OR within that query.
> **Multiple query objects in the outer array** = logical AND across dimensions within one query object.

---

## `attributes` Field

Filters elements by IFC **property values** (direct attributes on the element).

### Structure

```typescript
attributes: {
  queries: [
    { name: RegExp, value: RegExp | number | boolean }
  ]
}
```

All entries in `queries` must match (logical AND).

### Examples

```typescript
// Find walls with "Masonry" in the Name property
finder.create("Masonry Walls", [
  {
    categories: [/WALL/],
    attributes: {
      queries: [{ name: /Name/, value: /Masonry/ }]
    }
  }
]);

// Find elements with a specific tag
finder.create("Tagged Elements", [
  {
    attributes: {
      queries: [{ name: /Tag/, value: /TAG-001/ }]
    }
  }
]);

// Multiple attribute conditions (both must match)
finder.create("Specific Wall Type", [
  {
    categories: [/WALL/],
    attributes: {
      queries: [
        { name: /Name/, value: /Exterior/ },
        { name: /IsExternal/, value: true }
      ]
    }
  }
]);
```

### Attribute Value Types

| Value Type | Example | Use Case |
|---|---|---|
| `RegExp` | `/Masonry/` | Match string properties |
| `number` | `200` | Match numeric properties exactly |
| `boolean` | `true` | Match boolean flags (e.g., `IsExternal`) |

---

## `relation` Field

Filters elements based on their **IFC relationships** to other elements. Most useful for finding elements within a specific **spatial structure** (floors, buildings, sites).

### Structure

```typescript
relation: {
  name: string;         // The IFC relationship class name
  query: FinderQueryData; // Nested query applied to the RELATED element
}
```

The `relation.query` is applied to the **target** of the relationship, not the element being filtered. So for `ContainedInStructure`, it's applied to the `IfcBuildingStorey`.

### Common Relation Names

| Relation Name | Meaning | Use Case |
|---|---|---|
| `ContainedInStructure` | Element is in a spatial structure (storey, building) | Find elements on a specific floor |
| `AggregatedBy` | Element is part of an aggregate | Find parts of a compound element |
| `HasAssociations` | Element has material or classification associations | Find elements with specific material |

### Spatial Containment Example (Most Common)

```typescript
// Find all columns on "FLOOR_LEVEL1"
finder.create("Column at level +0.20_FLOOR_LEVEL1", [
  {
    categories: [/COLUMN/],
    relation: {
      name: "ContainedInStructure",
      // This query is applied to the IfcBuildingStorey
      query: {
        attributes: {
          queries: [{ name: /Name/, value: /\+0\.20_FLOOR_LEVEL1/ }]
        }
      }
    }
  }
]);
```

> **Important**: The `relation.query` targets the **spatial structure element** (the storey), NOT the element itself. The `Name` being matched is the storey's name, not the column's name.

### Escaping Special Characters in Regex

Floor level names often contain special regex characters like `.` and `+`:

```typescript
// Level name: "+0.20_FLOOR_LEVEL1"
// Must escape: + → \+  and  . → \.
value: /\+0\.20_FLOOR_LEVEL1/

// Level name: "+3.60_FLOOR_LEVEL2"
value: /\+3\.60_FLOOR_LEVEL2/
```

---

## Combining Dimensions

All three dimensions (categories, attributes, relation) can be combined in one query object:

```typescript
finder.create("Exterior Masonry Walls on Level 1", [
  {
    categories: [/WALL/],
    attributes: {
      queries: [
        { name: /Name/, value: /Masonry/ },
        { name: /IsExternal/, value: true }
      ]
    },
    relation: {
      name: "ContainedInStructure",
      query: {
        attributes: {
          queries: [{ name: /Name/, value: /Level 1/ }]
        }
      }
    }
  }
]);
```

---

## Multiple Query Objects (OR Logic)

Passing multiple objects in the outer array acts as **OR** — elements matching ANY of the queries are included:

```typescript
// Elements that are EITHER walls OR columns
finder.create("Structural Elements", [
  { categories: [/WALL/] },
  { categories: [/COLUMN/] },
  { categories: [/BEAM/] }
]);
```

---

## Serialization

`ItemsFinder` implements `Serializable` — queries can be saved and restored:

```typescript
// Export all stored queries to a plain object
const saved = finder.export();
localStorage.setItem("finder-queries", JSON.stringify(saved));

// Later, restore them
const data = JSON.parse(localStorage.getItem("finder-queries")!);
finder.import(data);
```
