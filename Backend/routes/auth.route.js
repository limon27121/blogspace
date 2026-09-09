import express from "express";
import { register, log_in } from "../controller/auth.controller.js";

const router = express.Router();

// both public: a guest must be able to reach them without a token
router.post("/register", register);
router.post("/login", log_in);

export default router;
