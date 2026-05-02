import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const dbHost = process.env.DB_HOST ?? "localhost";
const dbPort = Number(process.env.DB_PORT ?? 3306);
const dbUser = process.env.DB_USER ?? "localhost";
const dbPassword = process.env.DB_PASSWORD ?? "Gil404040@";
const dbName = process.env.DB_NAME ?? "projsaude";

let pool = null;

function createPool(user) {
  return mysql.createPool({
    host: dbHost,
    port: dbPort,
    user,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

async function getPool() {
  if (pool) {
    return pool;
  }

  try {
    pool = createPool(dbUser);
    await pool.query("SELECT 1");
    return pool;
  } catch (error) {
    const isAccessDenied = String(error?.code ?? "").includes("ER_ACCESS_DENIED_ERROR");
    const canTryRootFallback = dbUser === "localhost";

    if (isAccessDenied && canTryRootFallback) {
      const fallbackPool = createPool("root");
      await fallbackPool.query("SELECT 1");
      pool = fallbackPool;
      console.warn("DB fallback ativado: usando usuário 'root' em vez de 'localhost'.");
      return pool;
    }

    throw error;
  }
}

export async function query(sql, params = []) {
  const activePool = await getPool();
  const [rows] = await activePool.execute(sql, params);
  return rows;
}

export async function testConnection() {
  const activePool = await getPool();
  await activePool.query("SELECT 1");
}

export async function initDatabase() {
  const adminConnection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser === "localhost" ? "root" : dbUser,
    password: dbPassword,
  });

  await adminConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await adminConnection.query(`USE \`${dbName}\``);
  await adminConnection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [adminColumnRows] = await adminConnection.query(
    `
      SELECT COUNT(*) AS total
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'
    `,
    [dbName],
  );
  const hasAdminColumn = Array.isArray(adminColumnRows) && Number(adminColumnRows[0]?.total ?? 0) > 0;
  if (!hasAdminColumn) {
    await adminConnection.query("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0");
  }

  await adminConnection.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      sender ENUM('user', 'bot', 'system') NOT NULL,
      kind ENUM('text', 'audio', 'file') NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_chat_messages_user_id_created_at (user_id, created_at),
      CONSTRAINT fk_chat_messages_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  await adminConnection.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      appointment_date DATE NOT NULL,
      appointment_time TIME NOT NULL,
      doctor VARCHAR(150) NOT NULL,
      specialty VARCHAR(120) NOT NULL,
      type ENUM('consulta', 'retorno', 'exame') NOT NULL,
      status ENUM('agendada', 'confirmada', 'pendente') NOT NULL DEFAULT 'agendada',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_appointments_user_date (user_id, appointment_date, appointment_time),
      CONSTRAINT fk_appointments_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  await adminConnection.query(`
    CREATE TABLE IF NOT EXISTS reminders (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      title VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      reminder_date DATE NOT NULL,
      category ENUM('medicamento', 'especial') NOT NULL,
      end_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_reminders_user_date (user_id, reminder_date),
      CONSTRAINT fk_reminders_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  await adminConnection.query(`
    CREATE TABLE IF NOT EXISTS prescription_requests (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      medicine VARCHAR(150) NOT NULL,
      details TEXT NULL,
      status ENUM('pendente', 'atendida') NOT NULL DEFAULT 'pendente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prescription_requests_user (user_id, created_at),
      CONSTRAINT fk_prescription_requests_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  await adminConnection.end();
}
