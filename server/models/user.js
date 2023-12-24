import pool from "./databasePool.js";
import argon2 from "argon2";

export const PROVIDER = {
  NATIVE: "native",
  GOOGLE: "google",
};

export async function checkUserExists(email) {
  const result = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM users
    WHERE email = $1
  `,
    [email]
  );
  return result.rows[0].count > 0;
}

export async function createNativeUser(name, email, password) {
  const encPassword = await argon2.hash(password);
  const result = await pool.query(
    `
      INSERT INTO users (name, email, password, provider)
      VALUES($1, $2, $3, $4)
      RETURNING user_id
    `,
    [name, email, encPassword, PROVIDER.NATIVE]
  );
  return result.rows[0].user_id;
}

export async function findUserByEmail(email) {
  const result = await pool.query(
    `
        SELECT user_id, name, email, picture
        FROM users
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

export async function checkPassword(userId, password) {
  const result = await pool.query(
    `
        SELECT * FROM users
        WHERE user_id = $1
    `,
    [userId]
  );
  if (result.rows.length === 0) {
    throw new Error("User not found");
  }
  const hashedPassword = result.rows[0].password;
  return argon2.verify(hashedPassword, password);
}
