-- Ikibina Guardian Database Setup Script
-- Run this script in your MySQL database to create all necessary tables

-- Use the database
USE ikibina_guardian;

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
    INDEX idx_chief_id (chief_id)
);

-- Group members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    member_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_group_member (group_id, member_id),
    INDEX idx_group_id (group_id),
    INDEX idx_member_id (member_id)
);

-- Contributions table
CREATE TABLE IF NOT EXISTS contributions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    group_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    contribution_date DATE NOT NULL,
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    INDEX idx_member_id (member_id),
    INDEX idx_group_id (group_id),
    INDEX idx_contribution_date (contribution_date)
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    group_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    repayment_period INT NOT NULL COMMENT 'Period in months',
    purpose VARCHAR(500) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    INDEX idx_member_id (member_id),
    INDEX idx_group_id (group_id),
    INDEX idx_status (status)
);

-- Loan repayments table (for tracking loan payments)
CREATE TABLE IF NOT EXISTS loan_repayments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    INDEX idx_loan_id (loan_id),
    INDEX idx_payment_date (payment_date)
);

-- Notifications table
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
    INDEX idx_is_read (is_read)
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
INSERT INTO group_members (group_id, member_id) VALUES (1, 3)
ON DUPLICATE KEY UPDATE group_id = VALUES(group_id);

-- Sample contribution
INSERT INTO contributions (member_id, group_id, amount, contribution_date, description) VALUES 
(3, 1, 50000.00, CURDATE(), 'Monthly savings contribution')
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- Sample loan request
INSERT INTO loans (member_id, group_id, amount, interest_rate, repayment_period, purpose, status) VALUES 
(3, 1, 100000.00, 5.00, 6, 'Business expansion capital', 'pending')
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- Sample notification
INSERT INTO notifications (user_id, title, message, type) VALUES 
(3, 'Welcome to Ikibina Guardian', 'Your account has been created successfully. You can now view your group information and track your contributions.', 'success')
ON DUPLICATE KEY UPDATE title = VALUES(title);

COMMIT;
