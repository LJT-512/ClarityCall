import pool from "./databasePool.js";

export const PROVIDER = {
  NATIVE: "native",
  FACEBOOK: "facebook",
  GOOGLE: "google",
};

export async function createNativeProvider(userId, password) {
  const token = await argon2.hash(password);
  await pool.query(
    `
      INSERT INTO user_providers (user_id, name, token)
      VALUES($1, $2, $3)
    `,
    [userId, PROVIDER.NATIVE, token]
  );
}
