import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_KEY = process.env.JWT_KEY;

export default async function verifyJWT(token) {
  try {
    return new Promise((resolve, reject) => {
      jwt.verify(token, JWT_KEY, (err, decoded) => {
        if (err) reject(err);
        resolve(decoded);
      });
    });
  } catch (err) {
    console.error("verify JWT error: ", err);
  }
}
