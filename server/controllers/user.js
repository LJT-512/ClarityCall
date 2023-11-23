import axios from 'axios';
import * as userModel from "../models/user.js";
import * as userProviderModel from '../models/userProvider.js';
import signJWT, { EXPIRE_TIME } from '../utils/signJWT.js';

const COOKIE_OPTIONS = {
    httpOnly = true,
    path: "/",
    secure: true,
    samesite: "strict"
}

export async function signUp(req, res) {
    try{
        const { name, email, password } = req.body;
        const userId = await createUser(email, name);
        await userProviderModel.createNativeProvider(userId, password);
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
                        email
                    }
                }
            });
    } catch(err) {
        if(err instanceof Error){
            res.status(400).json({ errors: err.message });
            return;
        }
        res.status(500).json({ errors: "sign up failed" });
    }
}

export async function signIn(req, res) {
    try {
        const { email, password } = req.body;
        const user = await userModel.findUser(email);
        if(!user) {
            throw new Error ('user not exist');
        }

        const isValidPassword = await userProviderModel.checkNativeProviderToken(user.user_id, password);
        if (!isValidPassword) {
            throw new Error ('invalid password');
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

    } catch(err) {
        if(err instanceof Error) {
            res.status(400).json({ errors: err.message });
            return;
        }
        res.status(500).json({ errors: "sign in failed" });
    }
}