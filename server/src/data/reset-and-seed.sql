-- Drop all existing tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Create tables with relations
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    timezone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    region_id INTEGER REFERENCES regions(id),
    status VARCHAR(50) DEFAULT 'active',
    signup_date DATE NOT NULL,
    last_purchase_date DATE,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    region_id INTEGER REFERENCES regions(id),
    order_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE website_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    page_path VARCHAR(255) NOT NULL,
    pageviews INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5, 2) DEFAULT 0,
    avg_time_on_page INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    region_id INTEGER REFERENCES regions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_targets (
    id SERIAL PRIMARY KEY,
    region_id INTEGER REFERENCES regions(id),
    month DATE NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    achieved_amount DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_performance (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(255) NOT NULL,
    region_id INTEGER REFERENCES regions(id),
    department VARCHAR(100),
    sales_count INTEGER DEFAULT 0,
    revenue_generated DECIMAL(12, 2) DEFAULT 0,
    customer_satisfaction DECIMAL(3, 2) DEFAULT 0,
    month DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
-- Regions (10 regions)
INSERT INTO regions (name, country, timezone) VALUES
('North America - East', 'USA', 'America/New_York'),
('North America - West', 'USA', 'America/Los_Angeles'),
('Europe - North', 'UK', 'Europe/London'),
('Europe - Central', 'Germany', 'Europe/Berlin'),
('Asia - East', 'Japan', 'Asia/Tokyo'),
('Asia - South', 'India', 'Asia/Kolkata'),
('South America', 'Brazil', 'America/Sao_Paulo'),
('Middle East', 'UAE', 'Asia/Dubai'),
('Africa', 'South Africa', 'Africa/Johannesburg'),
('Oceania', 'Australia', 'Australia/Sydney');

-- Categories (15 categories)
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and gadgets'),
('Computers', 'Laptops, desktops, and accessories'),
('Mobile Phones', 'Smartphones and accessories'),
('Home & Garden', 'Home improvement and garden supplies'),
('Furniture', 'Indoor and outdoor furniture'),
('Clothing', 'Apparel and fashion items'),
('Sports & Outdoors', 'Sports equipment and outdoor gear'),
('Books', 'Physical and digital books'),
('Toys & Games', 'Toys, games, and collectibles'),
('Health & Beauty', 'Health and beauty products'),
('Food & Beverages', 'Gourmet food and beverages'),
('Automotive', 'Car parts and accessories'),
('Office Supplies', 'Office equipment and supplies'),
('Pet Supplies', 'Pet food and accessories'),
('Jewelry', 'Jewelry and watches');

-- Products (100 products)
INSERT INTO products (name, category_id, price, cost, stock_quantity, rating) 
SELECT 
    'Product ' || generate_series || ' - ' || c.name,
    c.id,
    ROUND((RANDOM() * 500 + 20)::numeric, 2),
    ROUND((RANDOM() * 250 + 10)::numeric, 2),
    FLOOR(RANDOM() * 1000 + 10)::INTEGER,
    ROUND((RANDOM() * 2 + 3)::numeric, 2)
FROM generate_series(1, 100), 
     categories c 
WHERE generate_series % 15 = (c.id - 1) % 15
LIMIT 100;

-- Customers (5000 customers)
INSERT INTO customers (first_name, last_name, email, region_id, status, signup_date, total_spent, loyalty_points)
SELECT 
    'FirstName' || generate_series,
    'LastName' || generate_series,
    'customer' || generate_series || '@example.com',
    (generate_series % 10) + 1,
    CASE WHEN RANDOM() < 0.9 THEN 'active' ELSE 'inactive' END,
    CURRENT_DATE - (RANDOM() * 730)::INTEGER,
    ROUND((RANDOM() * 10000)::numeric, 2),
    FLOOR(RANDOM() * 5000)::INTEGER
FROM generate_series(1, 5000);

-- Orders (20000 orders over the last 2 years)
WITH order_data AS (
    SELECT 
        (FLOOR(RANDOM() * 5000) + 1)::INTEGER as customer_id,
        CURRENT_TIMESTAMP - (RANDOM() * 730 || ' days')::INTERVAL as order_date,
        ARRAY['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as statuses,
        ARRAY['credit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'] as payment_methods
    FROM generate_series(1, 20000)
)
INSERT INTO orders (customer_id, region_id, order_date, status, total_amount, discount_amount, shipping_cost, payment_method)
SELECT 
    od.customer_id,
    c.region_id,
    od.order_date,
    od.statuses[FLOOR(RANDOM() * 5 + 1)],
    ROUND((RANDOM() * 800 + 50)::numeric, 2),
    ROUND((RANDOM() * 50)::numeric, 2),
    ROUND((RANDOM() * 30 + 5)::numeric, 2),
    od.payment_methods[FLOOR(RANDOM() * 4 + 1)]
FROM order_data od
JOIN customers c ON c.id = od.customer_id;

-- Order Items (50000 items - 2-3 items per order on average)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount)
SELECT 
    o.id,
    (FLOOR(RANDOM() * 100) + 1)::INTEGER,
    FLOOR(RANDOM() * 5 + 1)::INTEGER,
    p.price,
    ROUND((RANDOM() * 20)::numeric, 2)
FROM orders o
CROSS JOIN LATERAL (
    SELECT generate_series(1, FLOOR(RANDOM() * 3 + 1)::INTEGER)
) gs
JOIN products p ON p.id = (FLOOR(RANDOM() * 100) + 1)::INTEGER
LIMIT 50000;

-- Update product views
UPDATE products 
SET views = FLOOR(RANDOM() * 50000 + 100)::INTEGER;

-- Website Analytics (last 365 days, multiple pages per day)
INSERT INTO website_analytics (date, page_path, pageviews, unique_visitors, bounce_rate, avg_time_on_page, conversions, region_id)
SELECT 
    (CURRENT_DATE - generate_series)::DATE,
    pages.path,
    FLOOR(RANDOM() * 5000 + 100)::INTEGER,
    FLOOR(RANDOM() * 3000 + 50)::INTEGER,
    ROUND((RANDOM() * 40 + 30)::numeric, 2),
    FLOOR(RANDOM() * 300 + 30)::INTEGER,
    FLOOR(RANDOM() * 50)::INTEGER,
    (FLOOR(RANDOM() * 10) + 1)::INTEGER
FROM generate_series(0, 364),
     (VALUES ('/'), ('/products'), ('/category'), ('/checkout'), ('/account'), ('/blog'), ('/contact'), ('/about')) AS pages(path);

-- Sales Targets (last 24 months for all regions)
INSERT INTO sales_targets (region_id, month, target_amount, achieved_amount)
SELECT 
    r.id,
    (DATE_TRUNC('month', CURRENT_DATE) - (generate_series || ' months')::INTERVAL)::DATE,
    ROUND((RANDOM() * 200000 + 100000)::numeric, 2),
    ROUND((RANDOM() * 220000 + 80000)::numeric, 2)
FROM generate_series(0, 23),
     regions r;

-- Employee Performance (last 12 months)
INSERT INTO employee_performance (employee_name, region_id, department, sales_count, revenue_generated, customer_satisfaction, month)
SELECT 
    'Employee ' || emp_num,
    (emp_num % 10) + 1,
    depts.dept,
    FLOOR(RANDOM() * 100 + 10)::INTEGER,
    ROUND((RANDOM() * 50000 + 5000)::numeric, 2),
    ROUND((RANDOM() * 2 + 3)::numeric, 2),
    (DATE_TRUNC('month', CURRENT_DATE) - (month_num || ' months')::INTERVAL)::DATE
FROM generate_series(1, 50) AS emp_num,
     generate_series(0, 11) AS month_num,
     (VALUES ('Sales'), ('Marketing'), ('Support'), ('Operations')) AS depts(dept);

-- Update customer last_purchase_date
UPDATE customers c
SET last_purchase_date = (
    SELECT MAX(o.order_date::DATE)
    FROM orders o
    WHERE o.customer_id = c.id
);

-- Create useful indexes for performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_region_id ON orders(region_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_customers_region_id ON customers(region_id);
CREATE INDEX idx_website_analytics_date ON website_analytics(date);
CREATE INDEX idx_sales_targets_region_id ON sales_targets(region_id);
CREATE INDEX idx_employee_performance_region_id ON employee_performance(region_id);

-- Create some useful views for dashboard queries
CREATE VIEW daily_sales AS
SELECT 
    DATE(order_date) as sale_date,
    region_id,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value,
    SUM(discount_amount) as total_discounts
FROM orders
WHERE status != 'cancelled'
GROUP BY DATE(order_date), region_id;

CREATE VIEW product_performance AS
SELECT 
    p.id,
    p.name,
    p.category_id,
    c.name as category_name,
    p.price,
    p.cost,
    p.stock_quantity,
    p.rating,
    p.views,
    COUNT(oi.id) as times_sold,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.quantity * oi.unit_price) as total_revenue
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, c.name;

CREATE VIEW customer_segments AS
SELECT 
    c.id,
    c.first_name || ' ' || c.last_name as customer_name,
    c.email,
    r.name as region,
    c.signup_date,
    c.total_spent,
    c.loyalty_points,
    COUNT(o.id) as order_count,
    CASE 
        WHEN c.total_spent >= 5000 THEN 'VIP'
        WHEN c.total_spent >= 2000 THEN 'Premium'
        WHEN c.total_spent >= 500 THEN 'Regular'
        ELSE 'New'
    END as segment
FROM customers c
JOIN regions r ON c.region_id = r.id
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, r.name;

-- Summary statistics
DO $$
BEGIN
    RAISE NOTICE 'Database reset complete!';
    RAISE NOTICE '=========================';
    RAISE NOTICE 'Tables created: 9';
    RAISE NOTICE 'Regions: %', (SELECT COUNT(*) FROM regions);
    RAISE NOTICE 'Categories: %', (SELECT COUNT(*) FROM categories);
    RAISE NOTICE 'Products: %', (SELECT COUNT(*) FROM products);
    RAISE NOTICE 'Customers: %', (SELECT COUNT(*) FROM customers);
    RAISE NOTICE 'Orders: %', (SELECT COUNT(*) FROM orders);
    RAISE NOTICE 'Order Items: %', (SELECT COUNT(*) FROM order_items);
    RAISE NOTICE 'Website Analytics Records: %', (SELECT COUNT(*) FROM website_analytics);
    RAISE NOTICE 'Sales Targets: %', (SELECT COUNT(*) FROM sales_targets);
    RAISE NOTICE 'Employee Performance Records: %', (SELECT COUNT(*) FROM employee_performance);
END $$;
