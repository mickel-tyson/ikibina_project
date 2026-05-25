-- IKIBINA MANAGEMENT SYSTEM - FULL MYSQL DATABASE SETUP
-- =====================================================

DROP DATABASE IF EXISTS ikibina_system;
CREATE DATABASE ikibina_system;
USE ikibina_system;

-- =====================================================
-- 1. USERS TABLE (Admin / Chief / Member)
-- =====================================================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','chief','member') NOT NULL,
    status ENUM('active','inactive','suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. GROUPS TABLE
-- =====================================================

CREATE TABLE groups_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(150) NOT NULL,
    group_code VARCHAR(50) UNIQUE NOT NULL,
    district VARCHAR(100),
    sector VARCHAR(100),
    cell_name VARCHAR(100),
    village VARCHAR(100),
    contribution_amount DECIMAL(12,2) DEFAULT 0,
    frequency ENUM('weekly','monthly') DEFAULT 'weekly',
    draw_day VARCHAR(50),
    status ENUM('active','inactive') DEFAULT 'active',
    chief_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chief_id) REFERENCES users(id)
);

-- =====================================================
-- 3. MEMBERSHIP TABLE
-- =====================================================

CREATE TABLE memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    member_number INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES groups_table(id)
);

-- =====================================================
-- 4. CONTRIBUTIONS TABLE
-- =====================================================

CREATE TABLE contributions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_cycle VARCHAR(100),
    payment_status ENUM('paid','pending','missed') DEFAULT 'paid',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES groups_table(id)
);

-- =====================================================
-- 5. ATTENDANCE TABLE
-- =====================================================

CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    meeting_date DATE NOT NULL,
    status ENUM('present','absent','late') NOT NULL,
    fine_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES groups_table(id)
);

-- =====================================================
-- 6. SMART DRAW TABLE
-- =====================================================

CREATE TABLE draws (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    winner_user_id INT NOT NULL,
    cycle_name VARCHAR(100),
    total_amount DECIMAL(12,2),
    drawn_by INT,
    draw_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups_table(id),
    FOREIGN KEY (winner_user_id) REFERENCES users(id),
    FOREIGN KEY (drawn_by) REFERENCES users(id)
);

-- =====================================================
-- 7. LOANS TABLE
-- =====================================================

CREATE TABLE loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    status ENUM('pending','approved','rejected','paid') DEFAULT 'pending',
    approved_by INT NULL,
    balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES groups_table(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- =====================================================
-- 8. FINES TABLE
-- =====================================================

CREATE TABLE fines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    reason VARCHAR(255),
    amount DECIMAL(10,2),
    status ENUM('unpaid','paid') DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES groups_table(id)
);

-- =====================================================
-- 9. NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NULL,
    user_id INT NULL,
    title VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    group_id INT NULL,
    action_done VARCHAR(255),
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- DEMO USERS
-- PASSWORD = 123456
-- =====================================================

INSERT INTO users(full_name,email,phone,password,role) VALUES
('System Admin','admin@ikibina.com','0788000001','123456','admin'),
('Chief Jean Claude','chief@ikibina.com','0788000002','123456','chief'),
('Alice Member','alice@ikibina.com','0788000003','123456','member'),
('Bob Member','bob@ikibina.com','0788000004','123456','member'),
('David Member','david@ikibina.com','0788000005','123456','member');

-- =====================================================
-- DEMO GROUP
-- =====================================================

INSERT INTO groups_table(
group_name,group_code,district,sector,cell_name,village,
contribution_amount,frequency,draw_day,status,chief_id
)
VALUES(
'Abishyizehamwe Group',
'IKB001',
'Kigali',
'Gasabo',
'Kimironko',
'Bibare',
5000,
'weekly',
'Friday',
'active',
2
);

-- =====================================================
-- MEMBERS ASSIGNMENT
-- =====================================================

INSERT INTO memberships(user_id,group_id,member_number) VALUES
(3,1,101),
(4,1,102),
(5,1,103);

-- =====================================================
-- CONTRIBUTIONS
-- =====================================================

INSERT INTO contributions(user_id,group_id,amount,payment_cycle) VALUES
(3,1,5000,'Week 1'),
(4,1,5000,'Week 1'),
(5,1,5000,'Week 1');

-- =====================================================
-- ATTENDANCE
-- =====================================================

INSERT INTO attendance(user_id,group_id,meeting_date,status) VALUES
(3,1,CURDATE(),'present'),
(4,1,CURDATE(),'late'),
(5,1,CURDATE(),'present');

-- =====================================================
-- DRAW WINNER
-- =====================================================

INSERT INTO draws(group_id,winner_user_id,cycle_name,total_amount,drawn_by)
VALUES(1,3,'Week 1',15000,2);

-- =====================================================
-- LOANS
-- =====================================================

INSERT INTO loans(user_id,group_id,amount,reason,status,balance)
VALUES
(4,1,10000,'School Fees','approved',10000);

-- =====================================================
-- FINES
-- =====================================================

INSERT INTO fines(user_id,group_id,reason,amount)
VALUES
(4,1,'Late Attendance',1000);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

INSERT INTO notifications(group_id,title,message)
VALUES
(1,'Meeting Reminder','Weekly meeting is Friday at 6 PM');

-- =====================================================
-- AUDIT LOGS
-- =====================================================

INSERT INTO audit_logs(user_id,group_id,action_done)
VALUES
(1,1,'Created Group'),
(2,1,'Started Draw'),
(3,1,'Paid Contribution');
