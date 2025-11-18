# AI Agent Instructions for Dashboard Builder

## 🎯 Your Mission
Create error-free dashboard components on the first try by following these exact patterns.

---

## 📋 Pre-Flight Checklist

Before creating ANY component:
1. ✅ Run `get_dashboard` to see current state
2. ✅ Identify the component type needed (chart/table/stat-card)
3. ✅ Check if it's single-row (stat-card) or multi-row (table/chart)
4. ✅ Select the correct template pattern from below
5. ✅ Verify field names match your SQL query columns

---

## 🎨 Handlebars Template Patterns

### Pattern 1: Stat-Card (Single Row Query)

**When to use:** KPIs, metrics, single aggregate values

**SQL Example:**
```sql
SELECT COALESCE(SUM(amount), 0) AS value,
       COALESCE(COUNT(*), 0) AS count
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
```

**Template (SIMPLIFIED - NO {{#each}} NEEDED):**
```handlebars
{
  "value": {{value}},
  "label": "Total Orders (30d)",
  "icon": "lucide:shopping-cart",
  "trend": {
    "value": {{count}},
    "direction": "up"
  }
}
```

**Key Points:**
- ✅ Direct field access: `{{value}}` not `{{data.0.value}}`
- ✅ Single-row results auto-flatten
- ✅ No `{{#each}}` wrapper needed
- ✅ Use Iconify icons (lucide set)

---

### Pattern 2: Table (Multiple Rows)

**When to use:** Lists, data tables, detailed records

**SQL Example:**
```sql
SELECT id, name, email, status, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10
```

**Template:**
```handlebars
{
  "columns": [
    {"key": "id", "label": "ID", "icon": "lucide:hash"},
    {"key": "name", "label": "Name", "icon": "lucide:user"},
    {"key": "email", "label": "Email", "icon": "lucide:mail"},
    {"key": "status", "label": "Status", "icon": "lucide:badge-check"}
  ],
  "rows": [
    {{#each data}}
    {
      "id": "{{id}}",
      "name": "{{name}}",
      "email": "{{email}}",
      "status": "{{uppercase status}}"
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ]
}
```

**Key Points:**
- ✅ Use `{{#each data}}...{{/each}}` for iteration
- ✅ **QUOTE ALL VALUES** (including numbers): `"{{id}}"`
- ✅ Use `{{#unless @last}},{{/unless}}` for commas
- ✅ Can use helpers: `{{uppercase status}}`
- ✅ Define columns with Iconify icons

---

### Pattern 3: Line/Bar Chart

**When to use:** Trends, time series, comparisons

**SQL Example:**
```sql
SELECT DATE(order_date) as date,
       SUM(total_amount) as revenue
FROM orders
WHERE order_date >= NOW() - INTERVAL '30 days'
GROUP BY DATE(order_date)
ORDER BY date
```

**Template:**
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
      "name": "Revenue",
      "type": "line",
      "data": [{{#each data}}{{revenue}}{{#unless @last}},{{/unless}}{{/each}}]
    }
  ]
}
```

**Key Points:**
- ✅ Category labels need quotes: `"{{date}}"`
- ✅ Numeric values DON'T need quotes: `{{revenue}}`
- ✅ Use `{{#each data}}` for arrays
- ✅ Use `{{#unless @last}},{{/unless}}` for commas

---

### Pattern 4: Pie Chart

**When to use:** Proportions, distributions, percentages

**SQL Example:**
```sql
SELECT region, SUM(sales) as total
FROM orders
GROUP BY region
ORDER BY total DESC
```

**Template:**
```handlebars
{
  "series": [
    {
      "type": "pie",
      "radius": "50%",
      "data": [
        {{#each data}}
        {
          "name": "{{region}}",
          "value": {{total}}
        }{{#unless @last}},{{/unless}}
        {{/each}}
      ]
    }
  ]
}
```

**Key Points:**
- ✅ Each item needs `{name, value}` structure
- ✅ Add line breaks for readability
- ✅ Avoid triple braces `}}}` on same line

---

## 🔧 Helper Functions You Can Use

### String Helpers
```handlebars
{{uppercase "hello"}}         → "HELLO"
{{lowercase "HELLO"}}         → "hello"
{{capitalize "hello world"}}  → "Hello world"
{{trim " text "}}             → "text"
{{concat firstName " " lastName}}
```

### Safety Helpers
```handlebars
{{default value 0}}                      → Use 0 if value is null
{{get object "nested.path" "N/A"}}       → Safe property access
```

### Comparison Helpers
```handlebars
{{#if (gt sales 1000)}}High{{/if}}
{{#if (eq status "active")}}Active{{/if}}
{{#if (lte count 5)}}Low{{/if}}
```

### Context Properties
```handlebars
{{count}}      → Number of rows
{{isEmpty}}    → Boolean: true if no data
{{first}}      → First row object
```

---

## ❌ Common Mistakes to AVOID

### Mistake 1: Wrong Context for Single-Row
```handlebars
❌ WRONG: {{#each data}}{{value}}{{/each}}  (for stat-card)
✅ RIGHT: {{value}}
```

### Mistake 2: Unquoted Table Values
```handlebars
❌ WRONG: {"id": {{id}}, "total": {{total}}}
✅ RIGHT: {"id": "{{id}}", "total": "{{total}}"}
```

### Mistake 3: Missing Comma Handling
```handlebars
❌ WRONG: {{#each data}}{"name":"{{name}}"},{{/each}}  (trailing comma!)
✅ RIGHT: {{#each data}}{"name":"{{name}}"}{{#unless @last}},{{/unless}}{{/each}}
```

### Mistake 4: Triple Braces on Same Line
```handlebars
❌ WRONG: {"value":{{value}}}{{#unless @last}},{{/unless}}
✅ RIGHT: {
  "value": {{value}}
}{{#unless @last}},{{/unless}}
```

### Mistake 5: Using data.0.field for Single Row
```handlebars
❌ OLD WAY: {{data.0.value}}
✅ NEW WAY: {{value}}  (auto-flattened!)
```

---

## 📝 Complete Examples

### Example 1: Revenue Stat Card
```javascript
{
  id: 'total_revenue',
  type: 'stat-card',
  gridArea: 'kpi1',
  title: 'Total Revenue',
  data: {},
  query: {
    sql: `SELECT COALESCE(SUM(amount), 0) AS value,
                 ROUND(((SUM(amount) - LAG(SUM(amount)) OVER ()) / NULLIF(LAG(SUM(amount)) OVER (), 0)) * 100, 1) AS trend_value
          FROM orders
          WHERE created_at >= NOW() - INTERVAL '30 days'`,
    handlebarsTemplate: `{
      "value": {{value}},
      "label": "Total Revenue",
      "icon": "lucide:dollar-sign",
      "trend": {
        "value": {{default trend_value 0}},
        "direction": "{{#if (gt trend_value 0)}}up{{else}}down{{/if}}"
      }
    }`
  }
}
```

### Example 2: Recent Orders Table
```javascript
{
  id: 'recent_orders',
  type: 'table',
  gridArea: 'orders',
  title: 'Recent Orders',
  data: {},
  query: {
    sql: `SELECT id, customer_name, total, status, created_at
          FROM orders
          ORDER BY created_at DESC
          LIMIT 10`,
    handlebarsTemplate: `{
      "columns": [
        {"key": "id", "label": "Order ID", "icon": "lucide:hash"},
        {"key": "customer_name", "label": "Customer", "icon": "lucide:user"},
        {"key": "total", "label": "Total", "icon": "lucide:dollar-sign"},
        {"key": "status", "label": "Status", "icon": "lucide:badge-check"}
      ],
      "rows": [
        {{#each data}}
        {
          "id": "{{id}}",
          "customer_name": "{{customer_name}}",
          "total": "{{total}}",
          "status": "{{uppercase status}}"
        }{{#unless @last}},{{/unless}}
        {{/each}}
      ]
    }`
  }
}
```

### Example 3: Sales Trend Chart
```javascript
{
  id: 'sales_trend',
  type: 'chart',
  gridArea: 'main_chart',
  title: 'Sales Trend (30 Days)',
  data: {},
  query: {
    sql: `SELECT DATE(created_at) as date,
                 SUM(amount) as sales
          FROM orders
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY date`,
    handlebarsTemplate: `{
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
          "smooth": true,
          "data": [{{#each data}}{{sales}}{{#unless @last}},{{/unless}}{{/each}}]
        }
      ]
    }`
  }
}
```

---

## 🚨 Error Recovery

If you see an error in the tool response:

1. **Check the error message** - It includes a template preview
2. **Verify field names** - Match SQL column names exactly
3. **Check quotes** - Tables need all values quoted
4. **Check commas** - Use `{{#unless @last}},{{/unless}}`
5. **Check braces** - Avoid `}}}` on same line

**Common Error Patterns:**
- `Parse error` → Usually missing/extra comma or quote issue
- `Empty values` → Using wrong context (need {{#each}} or direct access)
- `CLOSE_UNESCAPED` → Triple braces `}}}` issue - add line breaks

---

## ✅ Success Checklist

Before submitting create_component:
- [ ] Correct pattern selected (stat-card vs table vs chart)
- [ ] Field names match SQL columns
- [ ] Table values are quoted
- [ ] Comma handling with `{{#unless @last}},{{/unless}}`
- [ ] No triple braces `}}}` on same line
- [ ] Iconify icons used (lucide set)
- [ ] Template is properly formatted JSON

---

## 🎯 Quick Decision Tree

**Is it a single row (one aggregate/metric)?**
→ YES: Use direct field access: `{{value}}`
→ NO: Continue...

**Is it multiple rows?**
→ YES: Use `{{#each data}}...{{/each}}`

**Is it a table?**
→ YES: Quote all values: `"{{field}}"`

**Is it a chart?**
→ YES: Quote category labels, don't quote numbers

**Always:**
→ Use `{{#unless @last}},{{/unless}}` for commas
→ Use Iconify icons
→ Add line breaks in complex objects

---

## 🔗 Reference Files
- Full guide: `/TEMPLATE_FIX_GUIDE.md`
- Improvements doc: `/HANDLEBARS_IMPROVEMENTS.md`
- Implementation: `/client/src/utils/dataFetcher.ts`

Follow these patterns exactly and you'll create working components on the first try! 🎉
