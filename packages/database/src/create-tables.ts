import mysql from 'mysql2/promise';

const sqls = [
  `CREATE TABLE IF NOT EXISTS inv_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    domain VARCHAR(50) NOT NULL,
    email VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS inv_filings (
    id VARCHAR(36) PRIMARY KEY,
    filing_number VARCHAR(30) NOT NULL UNIQUE,
    type VARCHAR(30) NOT NULL,
    project_stage VARCHAR(20) NOT NULL DEFAULT 'invest',
    project_category VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    legal_entity_name VARCHAR(200),
    domain VARCHAR(50) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    investment_ratio DECIMAL(5,2),
    valuation_amount DECIMAL(15,2),
    original_target DECIMAL(15,2),
    new_target DECIMAL(15,2),
    change_reason TEXT,
    approval_groups JSON NOT NULL,
    email_recipients JSON NOT NULL,
    confirmed_by VARCHAR(36),
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    risk_level VARCHAR(10),
    project_code VARCHAR(50),
    creator_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    filing_time TIMESTAMP NULL,
    INDEX idx_creator (creator_id),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS inv_approvals (
    id VARCHAR(36) PRIMARY KEY,
    filing_id VARCHAR(36) NOT NULL,
    approver_id VARCHAR(36) NOT NULL,
    approver_name VARCHAR(100) NOT NULL,
    stage VARCHAR(20) NOT NULL DEFAULT 'business',
    level INT NOT NULL,
    group_name VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP NULL,
    reassigned_from VARCHAR(36),
    external_todo_id VARCHAR(100),
    INDEX idx_filing_id (filing_id),
    INDEX idx_approver_status (approver_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS inv_attachments (
    id VARCHAR(36) PRIMARY KEY,
    filing_id VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_filing_id (filing_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS inv_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id TEXT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    detail JSON NOT NULL,
    field_source JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS inv_approval_group_configs (
    id VARCHAR(36) PRIMARY KEY,
    group_name VARCHAR(30) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(200) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS inv_email_cc_configs (
    id VARCHAR(36) PRIMARY KEY,
    group_name VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS inv_user_roles (
    emp_code VARCHAR(20) PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    created_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST ?? '10.250.12.15',
    port: Number(process.env.DB_PORT ?? 3100),
    user: process.env.DB_USER ?? 'jbs_test',
    password: process.env.DB_PASS ?? 'l#1yCNYn8Qex',
    database: process.env.DB_NAME ?? 'jbs_haier2',
    connectTimeout: 10000,
  });

  try {
    for (const s of sqls) {
      const tableName = s.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      await pool.execute(s);
      console.log('✅', tableName);
    }
    console.log('\nAll tables created successfully.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
