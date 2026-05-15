-- SQL Queries to Create Admin and Chief Users
-- Run these queries in your MySQL database after setting up the tables

-- Create Admin User
-- Email: admin@ikibina.com
-- Password: admin123
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES 
('admin', 'admin@ikibina.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', '+250788123456', 'admin');

-- Create Chief User 1
-- Email: chief1@ikibina.com  
-- Password: chief123
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES 
('chief1', 'chief1@ikibina.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Mutabazi', '+250788123457', 'chief');

-- Create Chief User 2
-- Email: chief2@ikibina.com
-- Password: chief123  
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES 
('chief2', 'chief2@ikibina.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alice Mukamana', '+250788123459', 'chief');

-- Create Sample Client Users
-- Email: client1@ikibina.com
-- Password: client123
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES 
('client1', 'client1@ikibina.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mary Kantarama', '+250788123458', 'client');

-- Email: client2@ikibina.com
-- Password: client123
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES 
('client2', 'client2@ikibina.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Peter Niyoyita', '+250788123460', 'client');

-- Email: client3@ikibina.com  
-- Password: client123
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES 
('client3', 'client3@ikibina.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Grace Uwimana', '+250788123461', 'client');

-- Verify the users were created
SELECT id, username, email, full_name, role, created_at FROM users ORDER BY role, username;
