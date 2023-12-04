import { fileURLToPath } from "url";
import { join, dirname } from "path";
import * as userModel from "../models/user.js";
import {
  signJWT,
  getUserInfoWithToken,
  EXPIRE_TIME,
} from "../utils/generateJWTToken.js";
import validator from "validator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  secure: true,
  samesite: "strict",
};

export async function serveSigninPage(req, res) {
  res.sendFile(join(__dirname + "./../public/signin.html"));
}

export async function signUp(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!(name && email && password)) {
      return res.status(400).json({ error: "All fields are requried." });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }
    if (
      !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 0,
        minNumbers: 1,
        minSymbols: 0,
      })
    ) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters long and contain both letters and numbers.",
      });
    }

    if (await userModel.checkUserExists(email)) {
      return res
        .status(403)
        .json({ error: "This account exists. Please log in." });
    }

    const userId = await userModel.createNativeUser(name, email, password);
    const user = await userModel.findUserByEmail(email);
    const token = await getUserInfoWithToken(user);
    res
      .cookie("jwtToken", token, COOKIE_OPTIONS)
      .status(200)
      .json({
        data: {
          access_token: token,
          access_expired: EXPIRE_TIME,
          user: {
            id: userId,
            provider: userModel.PROVIDER.NATIVE,
            name,
            email,
          },
        },
      });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ errors: err.message });
      return;
    }
    res.status(500).json({ errors: "sign up failed" });
  }
}

export async function signIn(req, res) {
  try {
    const { email, password } = req.body;
    if (!(email && password)) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = await userModel.findUserByEmail(email);

    const isValidPassword = await userModel.checkPassword(
      user.user_id,
      password
    );
    if (!isValidPassword) {
      throw new Error("invalid password");
    }
    const token = await signJWT(user);
    res
      .cookie("jwtToken", token, COOKIE_OPTIONS)
      .status(200)
      .json({
        data: {
          access_token: token,
          access_expired: EXPIRE_TIME,
          user: {
            ...user,
            provider: userModel.PROVIDER.NATIVE,
          },
        },
      });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ errors: err.message });
      return;
    }
    res.status(500).json({ errors: "sign in failed" });
  }
}

export async function getUserInfo(req, res) {
  if (req.user) {
    return res
      .status(200)
      .json({ username: req.user.name, userId: req.user.user_id });
  } else {
    return res.status(401).json({ errors: "Fail to get user info." });
  }
}
