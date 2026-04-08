import express from "express";
import { registerUser, verifyOtp, loginUser, oauthLogin, getProfile } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// POST /api/auth/register  → create user with email & password (starts OTP flow)
router.post("/register", registerUser);

// POST /api/auth/verify-otp → verify OTP and enable account
router.post("/verify-otp", verifyOtp);

// POST /api/auth/login     → authenticate with email & password
router.post("/login", loginUser);

// POST /api/auth/oauth     → authenticate with Google/GitHub OAuth token
router.post("/oauth", oauthLogin);

// GET  /api/auth/profile   → protected: get current user profile
router.get("/profile", verifyToken, getProfile);

export default router;
