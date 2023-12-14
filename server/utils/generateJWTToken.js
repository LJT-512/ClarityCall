import jwt from "jsonwebtoken";

const JWT_KEY = process.env.JWT_KEY || "";
export const EXPIRE_TIME = 60 * 60;

export function signJWT(payload) {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      JWT_KEY,
      { expiresIn: EXPIRE_TIME },
      function (err, token) {
        if (err) {
          reject(err);
        }
        resolve(token);
      }
    );
  });
}

export async function getUserInfoWithToken(user) {
  const token = await signJWT(user);
  return {
    token: token,
    userData: {
      id: user.user_id,
      provider: user.provider,
      name: user.name,
      email: user.email,
      picture: user.picture,
    },
  };
}
