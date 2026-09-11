import express from "express";
import {
    register,
    log_in,
    forgot_password,
    reset_password_with_token,
} from "../controller/auth.controller.js";

const router = express.Router();

// both public: a guest must be able to reach them without a token
router.post("/register", register);
router.post("/login", log_in);

// public: the whole point is that the caller cannot log in
router.post("/forgot-password", forgot_password);
router.patch("/reset-password/:token", reset_password_with_token);

export default router;
