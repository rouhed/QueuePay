-- Database Schema for QueuePay (using Entity terminology)

-- Drop tables if they exist to allow clean reset
DROP TABLE IF EXISTS transactions, bookings, wallets, desks, services, entity_settings, users, entities CASCADE;

-- 1. Entities Table (Organisations, Mairies, Banques, etc.)
CREATE TABLE IF NOT EXISTS entities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT, -- Can be base64 image data
  description TEXT,
  email VARCHAR(255),
  address TEXT,
  max_booking_price NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
  commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Clients, Admins, Agents)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'COMPANY', 'AGENT', 'CLIENT')), -- 'COMPANY' represents the Entity Admin
  phone_number VARCHAR(50),
  entity_id INT REFERENCES entities(id) ON DELETE CASCADE, -- Linked if role is COMPANY or AGENT
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Entity Settings Table
CREATE TABLE IF NOT EXISTS entity_settings (
  entity_id INT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  working_hours_start TIME NOT NULL DEFAULT '08:00:00',
  working_hours_end TIME NOT NULL DEFAULT '17:00:00',
  working_days VARCHAR(50) NOT NULL DEFAULT '1,2,3,4,5', -- Comma-separated day numbers (1=Mon, 7=Sun)
  average_duration_minutes INT NOT NULL DEFAULT 10
);

-- 4. Services Table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  entity_id INT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Desks Table (Counter/Guichet)
CREATE TABLE IF NOT EXISTS desks (
  id SERIAL PRIMARY KEY,
  entity_id INT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  service_id INT REFERENCES services(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL, -- e.g. 'Guichet 1', 'Accueil'
  assigned_agent_id INT REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bookings Table (Tickets)
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(10) NOT NULL, -- e.g. '001', '002'
  client_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_id INT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  desk_id INT REFERENCES desks(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  time_slot TIME NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CALLING', 'COMPLETED', 'ABSENT', 'CANCELLED')),
  qr_code_token VARCHAR(255) UNIQUE NOT NULL,
  called_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'PAYMENT', 'REFUND', 'COMMISSION')),
  payment_method VARCHAR(50) CHECK (payment_method IN ('MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY')),
  reference_number VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast queue lookups
CREATE INDEX IF NOT EXISTS idx_bookings_queue ON bookings (entity_id, service_id, booking_date, status);
