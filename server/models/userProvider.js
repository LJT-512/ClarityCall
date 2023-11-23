import * as argon2 from "argon2";
import pool from "./databasePool.js";

export const PROVIDER = {
  NATIVE: "native",
  GOOGLE: "google",
};

export async function createNativeProvider(userId, password) {
  const token = await argon2.hash(password);
  await pool.query(
    `
        INSERT INTO user_providers (user)id, provider_name, token)
        VALUES ($1, $2, $3)
    `,
    [userId, PROVIDER.NATIVE, token]
  );
}

export async function checkNativeProviderToken(userId, password) {
  const result = await pool.query(
    `
    SELECT * FROM user_providers
    WHERE user_id = $1 AND name = 'native'
  `,
    [userId]
  );
  const provider = result.rows[0];
  if (provider) {
    return argon2.verify(providers.token, password);
  } else {
    return false;
  }
}
