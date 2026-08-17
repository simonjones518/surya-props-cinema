# Surya Cine Props

Build a world-class, ultra-premium cinematic Movie Props Rental Web Application called "Surya Cine Special Props" with a sleek, dark-themed aesthetic (Matte Black #0A0A0B, Deep Gunmetal Gray #121316, Cyberpunk Gold #D4AF37, and Neon Amber #FF9900 accents). 

### 1. Database & Architecture (Hostinger MySQL)

- Use standard REST API service layers (axios/fetch) pointing to the backend Hostinger MySQL endpoints (`/api/admin/kpi`, `/api/props`, `/api/bookings`).

- Provide fully typed TypeScript models for Props, Bookings, Clients, and KPI analytics.

- Mock all API responses seamlessly so the UI works out-of-the-box before the database URL is linked.

### 2. Frontend & Visual Scrollytelling

- **Dual Responsive Background Video Engine:**

  - Desktop: 16:9 widescreen video with scroll-linked scrubbing across 500vh container using Framer Motion `useScroll`.

  - Mobile: Automatically switch to 9:16 portrait video stream with high-performance CSS glassmorphism overlay (`backdrop-blur-md bg-black/60`).

- **Floating Prop Scrollytelling Cards:**

  - Stage 1: "Surya Cine Special Props — Where Real Props Bring Stories to Life" (Cinematic display headers in Bebas Neue/Anton).

  - Stage 2: "Action Armory & Weapons" (Vintage revolvers, tactical gear).

  - Stage 3: "Cinema Cameras & Sound" (Arri/Red rigs, boom mics).

  - Stage 4: "Vintage Film Vehicles" (1970s Willys jeeps, retro muscle cars).

- **Interactive Catalog & Rental Engine:**

  - Dynamic category pills & genre tags (Mass Action, Retro 80s, Sci-Fi, Crime Thriller).

  - Cards displaying prop title, daily/weekly rate in ₹ (INR), condition badge, and live stock indicator (In-Stock / On-Set / Booked).

  - Interactive "Take on Rent" modal: Date range picker (Shoot Start to Wrap Date), security deposit computation, advance payment percentage slider, and instant quotation breakdown.

### 3. Real-Time Admin ERP Dashboard

- **Header Metric Widgets:**

  - Today's Gross Revenue & Net Profit in ₹.

  - Active Rentals Count & On-Set Inventory Value.

  - Total Warehouse Valuation.

  - Outstanding Client Balances & Held Security Deposits.

- **Rental Pipeline Table:**

  - Columns: Booking ID, Production House, Assigned Props, Shoot Dates, Advance Paid, Balance Due, Status Pills (Reserved, On-Set, Returned, Overdue, Damaged).

  - Action buttons: "Mark On-Set", "Confirm Return & Inspect", "Refund Deposit".

- **Stock Management Modal:**

  - Add/Edit prop with serial number generator, category selector, daily rate, replacement valuation, and QR code preview card.

### 4. Aesthetics & Component Polish

- Tailwind CSS with customized dark metallic surfaces (`bg-zinc-950`, `border-amber-500/20`, `hover:border-amber-400`).

- Sonner toast notifications on booking submissions and status transitions.

- High-contrast accessibility for screen readability in production sets and office environments.  (-- Database Schema for Surya Cine Special Props

CREATE DATABASE IF NOT EXISTS surya_cine_props;

USE surya_cine_props;

-- 1. Prop Categories

CREATE TABLE IF NOT EXISTS categories (

  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL UNIQUE,

  slug VARCHAR(100) NOT NULL UNIQUE,

  icon VARCHAR(50) DEFAULT 'Film',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- 2. Film Props Inventory

CREATE TABLE IF NOT EXISTS props (

  id INT AUTO_INCREMENT PRIMARY KEY,

  serial_number VARCHAR(50) UNIQUE NOT NULL,

  title VARCHAR(255) NOT NULL,

  category_id INT NOT NULL,

  genre_tags VARCHAR(255) DEFAULT 'Action, Crime Thriller', -- Comma separated genres

  daily_rate DECIMAL(10, 2) NOT NULL,

  weekly_rate DECIMAL(10, 2) NOT NULL,

  security_deposit DECIMAL(10, 2) NOT NULL,

  replacement_value DECIMAL(12, 2) NOT NULL,

  condition_rating ENUM('Mint', 'Good', 'Distressed/Vintage', 'Needs Maintenance') DEFAULT 'Mint',

  status ENUM('In-Stock', 'On-Set', 'Booked', 'Maintenance') DEFAULT 'In-Stock',

  image_urls JSON, -- JSON array of image URLs

  video_preview_url VARCHAR(500),

  description TEXT,

  qr_code_id VARCHAR(100) UNIQUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE

);

-- 3. Production Clients (Producers / Production Houses)

CREATE TABLE IF NOT EXISTS clients (

  id INT AUTO_INCREMENT PRIMARY KEY,

  production_house VARCHAR(255) NOT NULL,

  contact_person VARCHAR(150) NOT NULL,

  email VARCHAR(150) UNIQUE NOT NULL,

  phone VARCHAR(20) NOT NULL,

  gst_number VARCHAR(50),

  address TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- 4. Rental Bookings & Production Pipeline

CREATE TABLE IF NOT EXISTS rental_bookings (

  id INT AUTO_INCREMENT PRIMARY KEY,

  booking_code VARCHAR(50) UNIQUE NOT NULL,

  client_id INT NOT NULL,

  start_date DATE NOT NULL,

  wrap_date DATE NOT NULL,

  total_rent DECIMAL(12, 2) NOT NULL,

  security_deposit DECIMAL(12, 2) NOT NULL,

  advance_paid DECIMAL(12, 2) DEFAULT 0.00,

  balance_due DECIMAL(12, 2) NOT NULL,

  deposit_status ENUM('Held', 'Partially Refunded', 'Refunded', 'Forfeited') DEFAULT 'Held',

  rental_status ENUM('Reserved', 'On-Set', 'Returned', 'Inspecting', 'Overdue', 'Damaged') DEFAULT 'Reserved',

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT

);

-- 5. Booking Line Items (Many-to-Many linking Props to Bookings)

CREATE TABLE IF NOT EXISTS booking_items (

  id INT AUTO_INCREMENT PRIMARY KEY,

  booking_id INT NOT NULL,

  prop_id INT NOT NULL,

  applied_daily_rate DECIMAL(10, 2) NOT NULL,

  quantity INT DEFAULT 1,

  FOREIGN KEY (booking_id) REFERENCES rental_bookings(id) ON DELETE CASCADE,

  FOREIGN KEY (prop_id) REFERENCES props(id) ON DELETE RESTRICT

);

-- 6. Financial Transactions & Ledger

CREATE TABLE IF NOT EXISTS transactions (

  id INT AUTO_INCREMENT PRIMARY KEY,

  booking_id INT NOT NULL,

  transaction_type ENUM('Advance', 'Final Settlement', 'Security Deposit', 'Damage Deduction', 'Refund') NOT NULL,

  amount DECIMAL(12, 2) NOT NULL,

  payment_method ENUM('Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Card') DEFAULT 'UPI',

  payment_reference VARCHAR(100),

  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (booking_id) REFERENCES rental_bookings(id) ON DELETE CASCADE

);

-- Initial Categories Seed Data

INSERT INTO categories (name, slug, icon) VALUES 

('Armory & Weapons', 'weapons', 'ShieldAlert'),

('Cinema Cameras & Audio', 'camera-audio', 'Camera'),

('Vintage Vehicles', 'vehicles', 'Car'),

('Period & Hero Gadgets', 'gadgets', 'Laptop'),

('Lighting & Grip', 'lighting', 'Lightbulb');)   MySQL server hostname is: srv1874.hstgr.io

IP hostname: 193.203.184.228

MySQL Database  : u851000947_SuryaCineProps

MySQL User  :  u851000947_suryacineprops

Password  : Nine@248688

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://surya-props-cinema.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/919de9a5-0117-4adf-bca6-c841aa4699bf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
