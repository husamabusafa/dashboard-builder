# Template Issue Diagnosis & Fix Guide

## 🔍 Root Cause

The issue occurs due to a **data structure mismatch** between PostgreSQL query results and Handlebars template context.

### Data Flow

1. **PostgreSQL returns**:
```json
{
  "success": true,
  "data": [
    {
      "value": "455.73",
      "trend_value": "4.13",
      "trend_direction": "up"
    }
  ],
  "rowCount": 1
}
```

2. **DataFetcher extracts** (line 91 in `dataFetcher.ts`):
```typescript
const rawForTransform = raw.data; // Extract just the data array
```

3. **Handlebars receives context** (line 276-279 in `dataFetcher.ts`):
```typescript
const context = {
  data: [{value: "455.73", ...}],  // The array is wrapped in 'data' property
  ...templateConfig.context
};
```

### Why Templates Failed

**❌ WRONG (causes empty values):**
```handlebars
{"value":{{value}}}
```
- Tries to find `value` in root context
- But `value` is inside `data[0]`
- Result: `{"value":}` (empty)

**✅ CORRECT:**
```handlebars
{{#each data}}{"value":{{value}}}{{/each}}
```
- Iterates into the `data` array
- Accesses `value` from the first (and only) object
- Result: `{"value":455.73}`

---

## ✨ SIMPLIFIED SYNTAX (NEW!)

**As of the latest update**, single-row queries now support **direct field access**!

### Smart Context Enhancement
- Single-row results are automatically flattened
- Fields accessible directly without `{{#each}}`
- New helpers: `{{first}}`, `{{count}}`, `{{isEmpty}}`
- New string helpers: `{{uppercase}}`, `{{lowercase}}`, `{{capitalize}}`
- Safe property access: `{{get object "path.to.field" "default"}}`

---

## 🛠️ Template Patterns by Component Type

### 1. Stat-Card (Single Row Query)

**Query returns**: 1 row with value(s)

**✅ BEST - Direct Access (NEW!):**
```handlebars
{
  "value": {{value}},
  "label": "Avg Order Value",
  "icon": "lucide:calculator",
  "trend": {
    "value": {{trend_value}},
    "direction": "{{trend_direction}}"
  }
}
```
*No `{{#each}}` needed for single-row results!*

**✅ ALSO WORKS - Each Loop:**
```handlebars
{{#each data}}{
  "value": {{value}},
  "label": "Avg Order Value",
  "icon": "lucide:calculator",
  "trend": {
    "value": {{trend_value}},
    "direction": "{{trend_direction}}"
  }
}{{/each}}
```

**✅ ALSO WORKS - First Helper:**
```handlebars
{
  "value": {{first.value}},
  "label": "Avg Order Value",
  "icon": "lucide:calculator",
  "trend": {
    "value": {{first.trend_value}},
    "direction": "{{first.trend_direction}}"
  }
}
```

**📌 Recommendation:** Use **direct access** for single-row queries. Use `{{#each data}}` for multi-row queries.

---

### 2. Table (Multiple Rows Query)

**Query returns**: Multiple rows

**❌ WRONG (causes parse error):**
```handlebars
{
  "columns": [...],
  "rows": [
    {{#each data}}
    {
      "order_id": {{order_id}},
      "total": {{total}}
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ]
}
```

**Issue:** Unquoted numbers create parse errors near `}},"value":{{value}}}`

**✅ CORRECT:**
```handlebars
{
  "columns": [
    {"key":"order_id","label":"Order ID","icon":"lucide:hash"},
    {"key":"customer","label":"Customer","icon":"lucide:user"},
    {"key":"total","label":"Total","icon":"lucide:badge-dollar-sign"}
  ],
  "rows": [
    {{#each data}}
    {
      "order_id": "{{order_id}}",
      "order_date": "{{order_date}}",
      "customer": "{{customer}}",
      "status": "{{status}}",
      "payment_method": "{{payment_method}}",
      "total": "{{total}}"
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ]
}
```

**Key fixes:**
- ✅ Quote all values (including numbers): `"{{total}}"` instead of `{{total}}`
- ✅ Use `{{#unless @last}},{{/unless}}` to avoid trailing commas
- ✅ Ensure proper nesting of braces

---

### 3. Charts (Line, Bar, Pie)

#### Line/Bar Chart

**✅ CORRECT:**
```handlebars
{
  "xAxis": {
    "type": "category",
    "data": [{{#each data}}"{{date}}"{{#unless @last}},{{/unless}}{{/each}}]
  },
  "yAxis": {
    "type": "value"
  },
  "series": [
    {
      "name": "Sales",
      "type": "line",
      "data": [{{#each data}}{{sales}}{{#unless @last}},{{/unless}}{{/each}}]
    }
  ]
}
```

**Key points:**
- Category labels need quotes: `"{{date}}"`
- Numeric values don't need quotes in series data: `{{sales}}`
- Use `{{#unless @last}},{{/unless}}` to handle commas

#### Pie Chart

**❌ WRONG (causes parse error):**
```handlebars
{
  "series": [
    {
      "type": "pie",
      "data": [
        {{#each data}}
        {"name":"{{region}}","value":{{value}}}{{#unless @last}},{{/unless}}
        {{/each}}
      ]
    }
  ]
}
```

**✅ CORRECT:**
```handlebars
{
  "series": [
    {
      "type": "pie",
      "data": [
        {{#each data}}
        {
          "name": "{{region}}",
          "value": {{value}}
        }{{#unless @last}},{{/unless}}
        {{/each}}
      ]
    }
  ]
}
```

**Key fixes:**
- ✅ Add proper line breaks and indentation
- ✅ Separate complex object properties on different lines
- ✅ Avoid triple braces: `}}}` → add newlines

---

## 📦 New Handlebars Helpers

### Comparison Helpers
- `{{#if (gt a b)}}` - Greater than
- `{{#if (lt a b)}}` - Less than
- `{{#if (gte a b)}}` - Greater than or equal
- `{{#if (lte a b)}}` - Less than or equal
- `{{#if (eq a b)}}` - Equal
- `{{#if (ne a b)}}` - Not equal

### Logical Helpers
- `{{#if (and a b)}}` - Logical AND
- `{{#if (or a b)}}` - Logical OR
- `{{#if (not a)}}` - Logical NOT

### Array Helpers
- `{{first data}}` - Get first item
- `{{last data}}` - Get last item
- `{{row data 2}}` - Get item at index 2
- `{{length data}}` - Get array length

### String Helpers
- `{{uppercase "hello"}}` → "HELLO"
- `{{lowercase "HELLO"}}` → "hello"
- `{{capitalize "hello world"}}` → "Hello world"
- `{{trim " text "}}` → "text"
- `{{concat "Hello" " " "World"}}` → "Hello World"

### Safe Property Access
```handlebars
{{get object "nested.property.path" "default value"}}
```
Returns default if path doesn't exist (no errors!)

### JSON Helpers
```handlebars
{{json object}}          - Compact JSON
{{json object true}}     - Pretty-printed JSON
{{jsonParse jsonString}} - Parse JSON string
```

### Default Value Helper
```handlebars
{{default value "fallback"}}  - Use fallback if value is null/undefined
```

### Context Properties (Available in all templates)
- `{{data}}` - The full data array
- `{{first}}` - First row (for single-row queries)
- `{{count}}` - Number of rows
- `{{isEmpty}}` - True if no data
- Direct field access when query returns 1 row

---

## 🎯 AI Agent Instructions

### For AI Agents Creating Components:

**Use these SIMPLIFIED template patterns:**

#### 1. Stat-Card (single row) - SIMPLIFIED:
```handlebars
{
  "value": {{value_field}},
  "label": "Label Text",
  "icon": "lucide:icon-name",
  "trend": {
    "value": {{trend_field}},
    "direction": "{{direction_field}}"
  }
}
```
*Direct access works for single-row results! No {{#each}} needed.*

#### 2. Table (multiple rows):
```handlebars
{
  "columns": [
    {"key":"field1","label":"Field 1","icon":"lucide:hash"},
    {"key":"field2","label":"Field 2","icon":"lucide:text"}
  ],
  "rows": [
    {{#each data}}
    {
      "field1": "{{field1}}",
      "field2": "{{field2}}",
      "number_field": "{{number_field}}"
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ]
}
```

#### 3. Charts:
```handlebars
{
  "xAxis": {
    "type": "category",
    "data": [{{#each data}}"{{label_field}}"{{#unless @last}},{{/unless}}{{/each}}]
  },
  "series": [
    {
      "name": "Series Name",
      "type": "line|bar|pie",
      "data": [{{#each data}}{{value_field}}{{#unless @last}},{{/unless}}{{/each}}]
    }
  ]
}
```

#### 4. Using New Helpers:
```handlebars
{
  "status": "{{uppercase status}}",
  "name": "{{capitalize customer_name}}",
  "total": {{default total 0}},
  "isEmpty": {{isEmpty}},
  "rowCount": {{count}}
}
```

---

## ✅ Validation Checklist

Before creating a component, verify:

- [ ] Template uses `{{#each data}}` for iteration
- [ ] String values are quoted: `"{{field}}"`
- [ ] Table numeric values are also quoted: `"{{total}}"`
- [ ] No triple braces `}}}` on same line (add newlines)
- [ ] Commas handled with `{{#unless @last}},{{/unless}}`
- [ ] JSON is properly formatted with newlines for complex objects
- [ ] Test template compiles without parse errors

---

## 🔧 Quick Fixes

### If you see empty values:
1. Wrap template in `{{#each data}}...{{/each}}`
2. Or use `{{data.0.field}}` for single-row results

### If you see parse errors:
1. Add quotes around all values in tables
2. Add line breaks between complex object properties
3. Check for proper comma placement with `{{#unless @last}}`
4. Ensure no `}}}` triple braces on same line

### If charts don't render:
1. Verify xAxis data uses quoted strings: `"{{date}}"`
2. Verify series data uses unquoted numbers: `{{value}}`
3. Check ECharts options structure matches expected format

---

## 📚 Code Reference

**Template processing:** `/client/src/utils/dataFetcher.ts` (lines 270-296)
```typescript
const context = {
  data,  // ← Query results are here
  ...templateConfig.context,
};
```

**Component creation:** `/client/src/components/DashboardBuilderTools.tsx` (line 357)
```typescript
const traceResult = await dataFetcher.fetchDataWithTrace(params.id, finalDataConfig);
```

---

## 🎓 Summary

**The golden rules for Handlebars templates:**

### ✨ NEW: Simplified Single-Row Access
- ✅ **DO**: Use `{{field}}` directly for single-row queries (auto-flattened!)
- ✅ **DO**: Use `{{first.field}}` to access first row explicitly
- ✅ **DO**: Use convenience helpers: `{{count}}`, `{{isEmpty}}`

### Multi-Row Queries
- ✅ **DO**: Use `{{#each data}}{{field}}{{/each}}` for multiple rows
- ✅ **DO**: Quote all table values: `"{{field}}"` (including numbers)
- ✅ **DO**: Use `{{#unless @last}},{{/unless}}` for comma separation

### Best Practices
- ✅ **DO**: Use new helpers for safety: `{{default value "fallback"}}`
- ✅ **DO**: Use string helpers: `{{uppercase}}`, `{{capitalize}}`
- ✅ **DO**: Use safe access: `{{get object "path" "default"}}`
- ❌ **DON'T**: Create triple braces `}}}` on same line (add newlines)
- ❌ **DON'T**: Leave table numeric values unquoted

### What's Fixed
1. ✅ **Smart Context**: Single-row results auto-flatten to root context
2. ✅ **30+ New Helpers**: Comparison, logical, string, array, JSON helpers
3. ✅ **Better Errors**: Template preview shown in error messages
4. ✅ **Null Safety**: `{{get}}` and `{{default}}` helpers prevent errors

Following these patterns will ensure all components render correctly on first creation!
