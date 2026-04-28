import { randomUUID } from "crypto";
import { pool } from "../db/pool.js";

export async function listUsers() {
  const { rows } = await pool.query(
    "SELECT id, name, email, created_at, updated_at FROM users ORDER BY created_at DESC"
  );
  return rows;
}

export async function getUserById(id) {
  const { rows } = await pool.query(
    "SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

export async function createUser(payload) {
  const id = randomUUID();
  const { rows } = await pool.query(
    `
      INSERT INTO users (id, name, email)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at, updated_at
    `,
    [id, payload.name, payload.email]
  );
  return rows[0];
}

export async function updateUser(id, payload) {
  const { rows } = await pool.query(
    `
      UPDATE users
      SET name = COALESCE($2, name),
          email = COALESCE($3, email)
      WHERE id = $1
      RETURNING id, name, email, created_at, updated_at
    `,
    [id, payload.name ?? null, payload.email ?? null]
  );
  return rows[0] || null;
}

export async function deleteUser(id) {
  const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [id]);
  return rowCount > 0;
}
