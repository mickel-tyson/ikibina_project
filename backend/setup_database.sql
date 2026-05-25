-- Create database
CREATE DATABASE IF NOT EXISTS ikibina_guardian;
USE ikibina_guardian;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'chief', 'client') NOT NULL DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    chief_id INT NOT NULL,
    village VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chief_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_chief_id (chief_id),
    INDEX idx_village (village)
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_group_member (group_id, user_id),
    INDEX idx_group_id (group_id),
    INDEX idx_user_id (user_id)
);

-- Loans table (matching your exact schema)
CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    member_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    purpose VARCHAR(500) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    interest_rate DECIMAL(5,2) DEFAULT 0.00,
    due_date DATE,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    disbursed_at TIMESTAMP NULL,
    repaid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_group_id (group_id),
    INDEX idx_member_id (member_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
);

-- Notifications table (matching your exact schema)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_type (type)
);

-- Contributions table (for tracking member contributions)
CREATE TABLE IF NOT EXISTS contributions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    member_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    contribution_date DATE NOT NULL,
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_group_id (group_id),
    INDEX idx_member_id (member_id),
    INDEX idx_contribution_date (contribution_date)
);

-- Insert sample admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES 
('admin', 'admin@ikibina.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', '+250788123456', 'admin')
ON DUPLICATE KEY UPDATE username = VALUES(username);

-- Insert sample chief user (password: chief123)
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES 
('chief1', 'chief1@ikibina.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Mutabazi', '+250788123457', 'chief')
ON DUPLICATE KEY UPDATE username = VALUES(username);

-- Insert sample client user (password: client123)
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES 
('client1', 'client1@ikibina.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mary Kantarama', '+250788123458', 'client')
ON DUPLICATE KEY UPDATE username = VALUES(username);

-- Create a sample group
INSERT INTO groups (name, description, chief_id, village) VALUES 
('Kigali Savings Group', 'Community savings group for Kigali village residents', 2, 'Kigali')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Add sample client to the group
INSERT INTO group_members (group_id, user_id) VALUES (1, 3)
ON DUPLICATE KEY UPDATE group_id = VALUES(group_id);

-- Sample contribution
INSERT INTO contributions (group_id, member_id, amount, contribution_date, description) VALUES 
(1, 3, 50000.00, CURDATE(), 'Monthly savings contribution')
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- Sample loan request
INSERT INTO loans (group_id, member_id, amount, purpose, status, interest_rate, due_date) VALUES 
(1, 3, 100000.00, 'Business expansion capital', 'pending', 5.00, DATE_ADD(CURDATE(), INTERVAL 6 MONTH))
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- Sample notification
INSERT INTO notifications (user_id, title, message, type) VALUES 
(3, 'Welcome to Ikibina Guardian', 'Your account has been created successfully. You can now view your group information and track your contributions.', 'success')
ON DUPLICATE KEY UPDATE title = VALUES(title);

COMMIT;
