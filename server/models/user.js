import pool from "./databasePool.js";

export async function createUser(email, name) {
  const result = await pool.query(
    `
      INSERT INTO users (email, name)
      VALUES($1, $2)
      RETURNING user_id
    `,
    [email, name]
  );
  return result.rows[0].id;
}

export async function findUser(email) {
  const result = await pool.query(
    `
        SELECT * FROM users
        WHERE email = $1
    `,
    [email]
  );
  return result.rows[0];
}

export async function findUserById(userId) {
  const result = await pool.query(
    `
      SELECT * FROM users
      WHERE user_id = ?
    `,
    [userId]
  );
  return result.rows[0];
}
