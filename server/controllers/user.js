import axios from "axios";
import * as userModel from "../models/user.js";
import * as userProviderModel from "../models/userProvider.js";
import signJWT, { EXPIRE_TIME } from "../utils/signJWT.js";
import validator from "validator";

const COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  secure: true,
  samesite: "strict",
};

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

    const token = await signJWT(userId);
    res
      .cookie("jwtToken", token, COOKIE_OPTIONS)
      .status(200)
      .json({
        data: {
          access_token: token,
          access_expired: EXPIRE_TIME,
          user: {
            id: userId,
            provider: userProviderModel.PROVIDER.NATIVE,
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
    const token = await signJWT(user.user_id);
    res
      .cookie("jwtToken", token, COOKIE_OPTIONS)
      .status(200)
      .json({
        data: {
          access_token: token,
          access_expired: EXPIRE_TIME,
          user: {
            ...user,
            provider: userProviderModel.PROVIDER.NATIVE,
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
