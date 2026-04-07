import admin from "../db/firebase.js";
import axios from "axios";

// Firebase API Key from environment (should match your project)
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;

// ─── Register (Email & Password) ─────────────────────────────────────────────
export const registerUser = async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || "",
    });

    return res.status(201).json({
      message: "User registered successfully",
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    });
  } catch (error) {
      return res
        .status(400)
        .json({ error: error.message });
  }
};

// ─── Login (Email & Password - Backend handles authentication) ────────────────
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Verify email and password using Firebase Auth REST API
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const { localId, idToken } = response.data;

    // Get full user details from Firebase Admin
    const user = await admin.auth().getUser(localId);

    // Create a custom token for this user
    const customToken = await admin.auth().createCustomToken(user.uid);

    return res.status(200).json({
      message: "Login successful",
      token: customToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    if (error.response?.data?.error?.message === 'INVALID_PASSWORD' || 
        error.response?.data?.error?.message === 'EMAIL_NOT_FOUND') {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// ─── OAuth Login (Google/GitHub - verify ID token from frontend) ────────────
export const oauthLogin = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "ID token is required" });
  }

  try {
    // Verify the ID token from Firebase client SDK OAuth
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = await admin.auth().getUser(decodedToken.uid);

    // Create custom token for session management
    const customToken = await admin.auth().createCustomToken(user.uid);

    return res.status(200).json({
      message: "OAuth login successful",
      token: customToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: decodedToken.firebase.sign_in_provider,
      },
    });
  } catch (error) {
    return res.status(401).json({ error: "OAuth authentication failed" });
  }
};

// ─── Get current user profile (protected route example) ──────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await admin.auth().getUser(req.user.uid);
    return res.status(200).json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
