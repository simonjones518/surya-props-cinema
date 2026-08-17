-- Surya Cine Special Props — MySQL schema
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  icon VARCHAR(60) NOT NULL DEFAULT 'Boxes'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS props (
  id INT AUTO_INCREMENT PRIMARY KEY,
  serial_number VARCHAR(60) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  category_id INT NOT NULL,
  genre_tags JSON NULL,
  daily_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  weekly_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  security_deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
  replacement_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  condition_rating VARCHAR(40) NOT NULL DEFAULT 'Good',
  status VARCHAR(30) NOT NULL DEFAULT 'In-Stock',
  image_urls JSON NULL,
  video_preview_url VARCHAR(500) NULL,
  description TEXT NULL,
  qr_code_id VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_props_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_house VARCHAR(200) NOT NULL,
  contact_person VARCHAR(160) NOT NULL,
  email VARCHAR(200) NULL,
  phone VARCHAR(40) NULL,
  gst_number VARCHAR(40) NULL,
  address VARCHAR(400) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(40) NOT NULL UNIQUE,
  client_id INT NOT NULL,
  start_date DATE NOT NULL,
  wrap_date DATE NOT NULL,
  total_rent DECIMAL(12,2) NOT NULL DEFAULT 0,
  security_deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
  advance_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,
  deposit_status VARCHAR(30) NOT NULL DEFAULT 'Held',
  rental_status VARCHAR(30) NOT NULL DEFAULT 'Reserved',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_client FOREIGN KEY (client_id) REFERENCES clients(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS booking_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  prop_id INT NOT NULL,
  prop_title VARCHAR(200) NOT NULL,
  applied_daily_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_items_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_prop FOREIGN KEY (prop_id) REFERENCES props(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO categories (id, name, slug, icon) VALUES
  (1, 'Armory & Weapons', 'weapons', 'ShieldAlert'),
  (2, 'Cinema Cameras & Audio', 'camera-audio', 'Camera'),
  (3, 'Vintage Vehicles', 'vehicles', 'Car'),
  (4, 'Period & Hero Gadgets', 'gadgets', 'Laptop'),
  (5, 'Lighting & Grip', 'lighting', 'Lightbulb');