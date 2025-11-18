# Dashboard Builder - Database Schema Documentation

## Overview
This database contains **80,685 total records** across 9 related tables, perfect for building comprehensive dashboards.

## Data Summary

| Table | Records | Description |
|-------|---------|-------------|
| **order_items** | 50,000 | Individual line items for each order |
| **orders** | 20,000 | Customer orders over 2 years |
| **customers** | 5,000 | Customer profiles with loyalty data |
| **website_analytics** | 2,920 | Daily page analytics (365 days × 8 pages) |
| **employee_performance** | 2,400 | Monthly employee metrics (50 employees × 12 months × 4 depts) |
| **sales_targets** | 240 | Regional monthly targets (10 regions × 24 months) |
| **products** | 100 | Product catalog with ratings and inventory |
| **categories** | 15 | Product categories |
| **regions** | 10 | Geographic regions worldwide |

## Schema Relationships

```
regions (10)
├── customers (5,000) - via region_id
├── orders (20,000) - via region_id
├── website_analytics (2,920) - via region_id
├── sales_targets (240) - via region_id
└── employee_performance (2,400) - via region_id

categories (15)
└── products (100) - via category_id

customers (5,000)
└── orders (20,000) - via customer_id
    └── order_items (50,000) - via order_id

products (100)
└── order_items (50,000) - via product_id
```

## Table Schemas

### 1. **regions**
Global geographic regions for analysis
- `id`, `name`, `country`, `timezone`, `created_at`

### 2. **categories**  
Product categories for classification
- `id`, `name`, `description`, `created_at`

### 3. **customers**
Customer profiles with purchase history
- `id`, `first_name`, `last_name`, `email`, `region_id`
- `status`, `signup_date`, `last_purchase_date`
- `total_spent`, `loyalty_points`, `created_at`

### 4. **products**
Product catalog with performance metrics
- `id`, `name`, `category_id`, `price`, `cost`
- `stock_quantity`, `rating`, `views`, `created_at`

### 5. **orders**
Customer orders with payment info
- `id`, `customer_id`, `region_id`, `order_date`
- `status`, `total_amount`, `discount_amount`, `shipping_cost`
- `payment_method`, `created_at`

### 6. **order_items**
Individual line items per order
- `id`, `order_id`, `product_id`, `quantity`
- `unit_price`, `discount`, `created_at`

### 7. **website_analytics**
Daily page performance metrics
- `id`, `date`, `page_path`, `pageviews`, `unique_visitors`
- `bounce_rate`, `avg_time_on_page`, `conversions`, `region_id`

### 8. **sales_targets**
Monthly revenue targets by region
- `id`, `region_id`, `month`, `target_amount`
- `achieved_amount`, `created_at`

### 9. **employee_performance**
Monthly employee KPIs
- `id`, `employee_name`, `region_id`, `department`
- `sales_count`, `revenue_generated`, `customer_satisfaction`, `month`

## Pre-built Views

### `daily_sales`
Aggregated daily sales metrics by region
- `sale_date`, `region_id`, `order_count`, `total_revenue`
- `avg_order_value`, `total_discounts`

### `product_performance`
Comprehensive product sales analysis
- Product details + `times_sold`, `total_quantity_sold`, `total_revenue`

### `customer_segments`
Customer classification by spending
- Customer info + `order_count`, `segment` (VIP/Premium/Regular/New)

## Dashboard Ideas

### 📊 Sales & Revenue Dashboards
1. **Sales Overview** - Line charts for daily/monthly revenue trends
2. **Regional Performance** - Heatmap or bar chart by region
3. **Revenue vs Targets** - Gauge charts comparing actual vs target
4. **Payment Methods** - Pie chart of payment distribution
5. **Order Status Funnel** - Funnel chart of order statuses

### 👥 Customer Analytics
1. **Customer Segments** - Donut chart of VIP/Premium/Regular/New
2. **Customer Lifetime Value** - Scatter plot of total_spent vs loyalty_points
3. **Acquisition Trends** - Area chart of signup_date over time
4. **Regional Distribution** - Geographic map or bar chart
5. **Customer Retention** - Cohort analysis from order dates

### 📦 Product Analytics
1. **Top Products** - Bar chart of best sellers
2. **Category Performance** - Tree map or bar chart by category
3. **Inventory Levels** - Table or gauge for stock_quantity
4. **Profit Margins** - Scatter plot of (price - cost) vs quantity sold
5. **Product Ratings** - Star ratings with sales volume

### 📈 Website Analytics
1. **Traffic Trends** - Line chart of pageviews over time
2. **Page Performance** - Table comparing all pages
3. **Bounce Rate Analysis** - Bar chart by page_path
4. **Conversion Funnel** - Funnel showing page progression
5. **Regional Traffic** - Map or pie chart by region

### 👤 Employee Performance
1. **Top Performers** - Leaderboard by revenue_generated
2. **Department Comparison** - Grouped bar chart
3. **Satisfaction Scores** - Gauge charts for customer_satisfaction
4. **Sales Productivity** - Scatter of sales_count vs revenue
5. **Regional Team Performance** - Stacked bar by region

### 📉 Time Series Analysis
1. **YoY Growth** - Compare year-over-year trends
2. **Seasonal Patterns** - Identify monthly/quarterly patterns
3. **Trend Analysis** - Moving averages and forecasts
4. **Event Impact** - Before/after analysis

### 🔄 Relational Insights
1. **Customer Journey** - Flow from signup → orders → items
2. **Cross-sell Analysis** - Products frequently bought together
3. **Regional Product Preferences** - Category popularity by region
4. **Employee-Customer Impact** - Employee performance vs customer segments

## Chart Types You Can Create

✅ **Line Charts** - Time series data (sales, analytics, trends)  
✅ **Bar Charts** - Comparisons (regions, products, categories)  
✅ **Pie/Donut Charts** - Distributions (segments, payment methods)  
✅ **Area Charts** - Cumulative trends (revenue, customers)  
✅ **Scatter Plots** - Correlations (price vs sales, ratings vs views)  
✅ **Heatmaps** - Regional performance, time-based patterns  
✅ **Funnel Charts** - Order status, customer journey  
✅ **Gauge Charts** - KPIs, targets vs actuals  
✅ **Tables** - Detailed data listings with sorting/filtering  
✅ **Cards/KPIs** - Single metric displays  
✅ **Tree Maps** - Hierarchical data (categories, departments)  
✅ **Stacked Charts** - Multi-dimensional comparisons

## Sample Queries

### Total Revenue by Region
```sql
SELECT r.name, SUM(o.total_amount) as total_revenue
FROM orders o
JOIN regions r ON o.region_id = r.id
WHERE o.status != 'cancelled'
GROUP BY r.name
ORDER BY total_revenue DESC;
```

### Monthly Sales Trend
```sql
SELECT 
    DATE_TRUNC('month', order_date) as month,
    COUNT(*) as order_count,
    SUM(total_amount) as revenue
FROM orders
WHERE status != 'cancelled'
GROUP BY month
ORDER BY month;
```

### Top 10 Products
```sql
SELECT 
    p.name,
    COUNT(oi.id) as times_ordered,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.quantity * oi.unit_price) as total_revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY total_revenue DESC
LIMIT 10;
```

### Customer Segments Distribution
```sql
SELECT 
    CASE 
        WHEN total_spent >= 5000 THEN 'VIP'
        WHEN total_spent >= 2000 THEN 'Premium'
        WHEN total_spent >= 500 THEN 'Regular'
        ELSE 'New'
    END as segment,
    COUNT(*) as customer_count
FROM customers
GROUP BY segment
ORDER BY customer_count DESC;
```

### Website Conversion Rate
```sql
SELECT 
    page_path,
    AVG(bounce_rate) as avg_bounce_rate,
    SUM(conversions)::float / SUM(unique_visitors) * 100 as conversion_rate
FROM website_analytics
GROUP BY page_path
ORDER BY conversion_rate DESC;
```

## Data Characteristics

- **Time Range**: Last 2 years (orders, sales targets, employee performance)
- **Geographic Coverage**: 10 regions across 6 continents
- **Product Mix**: 15 categories, 100 products
- **Customer Base**: 5,000 active/inactive customers
- **Order Volume**: Average 27 orders per day
- **Realistic Data**: Random but realistic values for prices, ratings, metrics
- **Complete Relations**: All foreign keys properly linked

## Tips for Dashboard Building

1. **Start Simple** - Build basic KPI cards first (total revenue, customer count)
2. **Add Filters** - Date ranges, regions, categories for interactivity
3. **Use Views** - Pre-built views make complex queries easier
4. **Combine Charts** - Mix different visualizations for context
5. **Show Trends** - Always include time-based analysis
6. **Add Context** - Compare metrics (actual vs target, YoY growth)
7. **Drill Down** - Link from summary to detailed views
8. **Performance** - Indexes are already created for fast queries

---

**Database Connection**: `postgres://postgres:postgres@localhost:5432/dashboard-builder`
