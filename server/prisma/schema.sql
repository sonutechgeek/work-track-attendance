-- =============================================================
-- WorkTrack — Raw MySQL Reference Schema
-- Version   : 1.0
-- Charset   : utf8mb4  (full Unicode, emoji-safe)
-- Collation : utf8mb4_unicode_ci
-- Engine    : InnoDB   (row-level locks, FK support, ACID)
--
-- NOTE: This file is for reference and direct MySQL execution.
--       Prisma generates its own versioned migrations from
--       schema.prisma — do NOT manually run this in a Prisma
--       project unless you know what you are doing.
--       Run via: mysql -u root -p < schema.sql
-- =============================================================

CREATE DATABASE IF NOT EXISTS worktrack
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE worktrack;

-- =============================================================
-- TABLE 1: departments
-- Created BEFORE users because users.department_id references it.
-- head_id FK is added AFTER users is created (circular reference).
-- =============================================================

CREATE TABLE departments (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)  NOT NULL,
  description TEXT          DEFAULT NULL,
  head_id     INT UNSIGNED  DEFAULT NULL,       -- FK added after users
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_dept_name (name)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- =============================================================
-- TABLE 2: users
-- All three roles (ADMIN, MANAGER, EMPLOYEE) share this table.
-- manager_id is self-referential — who this employee reports to.
-- =============================================================

CREATE TABLE users (
  id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)      NOT NULL,
  email         VARCHAR(150)      NOT NULL,
  password      VARCHAR(255)      NOT NULL,               -- bcrypt hash
  role          ENUM(
                  'ADMIN',
                  'MANAGER',
                  'EMPLOYEE'
                )                 NOT NULL DEFAULT 'EMPLOYEE',
  employee_id   VARCHAR(20)       DEFAULT NULL,            -- e.g. EMP-001
  department_id INT UNSIGNED      DEFAULT NULL,
  manager_id    INT UNSIGNED      DEFAULT NULL,            -- self-reference
  phone         VARCHAR(20)       DEFAULT NULL,
  avatar        VARCHAR(500)      DEFAULT NULL,            -- URL
  is_active     TINYINT(1)        NOT NULL DEFAULT 1,     -- soft delete
  failed_logins TINYINT UNSIGNED  NOT NULL DEFAULT 0,     -- lockout counter
  lock_until    DATETIME          DEFAULT NULL,            -- lockout expiry
  last_login    DATETIME          DEFAULT NULL,
  refresh_token TEXT              DEFAULT NULL,            -- hashed token
  created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_email       (email),
  UNIQUE KEY uq_employee_id (employee_id),

  KEY idx_role          (role),
  KEY idx_department_id (department_id),
  KEY idx_manager_id    (manager_id),
  KEY idx_is_active     (is_active),

  CONSTRAINT fk_users_department
    FOREIGN KEY (department_id)
    REFERENCES departments(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT fk_users_manager
    FOREIGN KEY (manager_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- =============================================================
-- STEP 2a: Close the circular FK  (departments.head_id → users)
-- Must run AFTER users table exists.
-- =============================================================

ALTER TABLE departments
  ADD CONSTRAINT fk_departments_head
    FOREIGN KEY (head_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;


-- =============================================================
-- TABLE 3: attendances
-- One row per employee per calendar day.
-- UNIQUE(employee_id, date) is the core integrity constraint.
--
-- Geolocation columns:
--   DECIMAL(10,8) for latitude  → ±90.00000000
--   DECIMAL(11,8) for longitude → ±180.00000000
--
-- Live timer logic:
--   check_in_time is stored on check-in.
--   Frontend computes: elapsed = Date.now() - check_in_time
--   This survives page refresh because the source of truth is DB.
--
-- working_hours:
--   Set on check-out: TIMESTAMPDIFF(SECOND, check_in_time, check_out_time) / 3600
--   Stored as DECIMAL(5,2) → max 999.99 hours (more than enough)
-- =============================================================

CREATE TABLE attendances (
  id                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  employee_id       INT UNSIGNED    NOT NULL,
  date              DATE            NOT NULL,

  -- Check-in
  check_in_time     DATETIME        DEFAULT NULL,
  check_in_lat      DECIMAL(10, 8)  DEFAULT NULL,
  check_in_lng      DECIMAL(11, 8)  DEFAULT NULL,
  check_in_address  VARCHAR(300)    DEFAULT NULL,

  -- Check-out
  check_out_time    DATETIME        DEFAULT NULL,
  check_out_lat     DECIMAL(10, 8)  DEFAULT NULL,
  check_out_lng     DECIMAL(11, 8)  DEFAULT NULL,
  check_out_address VARCHAR(300)    DEFAULT NULL,

  -- Computed summary
  working_hours     DECIMAL(5, 2)   DEFAULT NULL,
  status            ENUM(
                      'PRESENT',
                      'ABSENT',
                      'HALF_DAY',
                      'LEAVE',
                      'WFH',
                      'FIELD_VISIT'
                    )               NOT NULL DEFAULT 'PRESENT',
  note              TEXT            DEFAULT NULL,

  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance        (employee_id, date),    -- one row per day
  KEY        idx_att_date         (date),
  KEY        idx_att_status       (status),
  KEY        idx_att_emp_date     (employee_id, date),    -- cover queries

  CONSTRAINT fk_attendance_employee
    FOREIGN KEY (employee_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- =============================================================
-- TABLE 4: leaves
-- Leave requests submitted by employees.
--
-- duration:
--   DECIMAL(4,1) to support half-day (0.5) values.
--   Calculated server-side from start_date → end_date.
--
-- On APPROVED (Prisma $transaction does all three atomically):
--   1. UPDATE leaves SET status = 'APPROVED', reviewed_by_id = ?, reviewed_at = NOW()
--   2. INSERT INTO attendances for each date in [start_date, end_date]
--      with status matching the leave type (LEAVE / WFH / FIELD_VISIT)
--   3. UPDATE leave_balances SET *_used = *_used + duration  (if type deducts)
--
-- Types that DO deduct from leave_balances:
--   CASUAL, SICK, HALF_DAY, WFH
--
-- Types that do NOT deduct from leave_balances (informational only):
--   EARLY_LEAVE, FIELD_VISIT
-- =============================================================

CREATE TABLE leaves (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  employee_id     INT UNSIGNED    NOT NULL,
  type            ENUM(
                    'CASUAL',
                    'SICK',
                    'HALF_DAY',
                    'EARLY_LEAVE',
                    'WFH',
                    'FIELD_VISIT'
                  )               NOT NULL,
  start_date      DATE            NOT NULL,
  end_date        DATE            NOT NULL,
  duration        DECIMAL(4, 1)   NOT NULL DEFAULT 1.0,
  reason          TEXT            NOT NULL,
  status          ENUM(
                    'PENDING',
                    'APPROVED',
                    'REJECTED'
                  )               NOT NULL DEFAULT 'PENDING',
  reviewed_by_id  INT UNSIGNED    DEFAULT NULL,
  reviewed_at     DATETIME        DEFAULT NULL,
  comments        TEXT            DEFAULT NULL,

  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_leaves_employee        (employee_id),
  KEY idx_leaves_status          (status),
  KEY idx_leaves_dates           (start_date, end_date),
  KEY idx_leaves_emp_status      (employee_id, status),

  CONSTRAINT fk_leaves_employee
    FOREIGN KEY (employee_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_leaves_reviewer
    FOREIGN KEY (reviewed_by_id)
    REFERENCES users(id)
    ON DELETE SET NULL          -- preserve record if reviewer is deleted
    ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- =============================================================
-- TABLE 5: leave_balances
-- One row per employee per calendar year.
-- UNIQUE(employee_id, year) enforced at DB level.
--
-- *_total : configurable by Admin (default seeded on user creation)
-- *_used  : incremented by the approval transaction ONLY
--
-- Default allocations (can be changed per-employee by Admin):
--   Casual   : 12 days / year
--   Sick     : 10 days / year
--   Half-Day :  6 half-days / year
--   WFH      : 24 days / year
--
-- Balance check formula (server-side before approval):
--   available = casual_total - casual_used
--   if (duration > available) → reject with 422
-- =============================================================

CREATE TABLE leave_balances (
  id             INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  employee_id    INT UNSIGNED      NOT NULL,
  year           SMALLINT UNSIGNED NOT NULL,

  casual_total   TINYINT UNSIGNED  NOT NULL DEFAULT 12,
  casual_used    TINYINT UNSIGNED  NOT NULL DEFAULT 0,

  sick_total     TINYINT UNSIGNED  NOT NULL DEFAULT 10,
  sick_used      TINYINT UNSIGNED  NOT NULL DEFAULT 0,

  half_day_total TINYINT UNSIGNED  NOT NULL DEFAULT 6,
  half_day_used  TINYINT UNSIGNED  NOT NULL DEFAULT 0,

  wfh_total      TINYINT UNSIGNED  NOT NULL DEFAULT 24,
  wfh_used       TINYINT UNSIGNED  NOT NULL DEFAULT 0,

  created_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_balance      (employee_id, year),
  KEY        idx_bal_year    (year),

  CONSTRAINT fk_balance_employee
    FOREIGN KEY (employee_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- =============================================================
-- SEED: Default Admin user
-- Password: Admin@123  (bcrypt hash — change before production)
-- =============================================================

INSERT INTO users (name, email, password, role, employee_id, is_active)
VALUES (
  'System Admin',
  'admin@worktrack.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgTXZ.Gz0o/0LIzXFHTp5.',
  'ADMIN',
  'EMP-001',
  1
);


-- =============================================================
-- VERIFY (uncomment to run after creation)
-- =============================================================
-- SHOW TABLES;
-- DESCRIBE users;
-- DESCRIBE attendances;
-- DESCRIBE leaves;
-- DESCRIBE leave_balances;
-- SELECT table_name, engine, table_rows
--   FROM information_schema.tables
--  WHERE table_schema = 'worktrack';
