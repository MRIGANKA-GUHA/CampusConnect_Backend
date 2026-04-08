import admin from "../db/firebase.js";
import axios from "axios";
import bcrypt from "bcrypt";
import { sendOtpEmail } from "../services/emailService.js";

// Firebase API Key from environment (should match your project)
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;

// ─── Register Init (Step 1: Create Disabled User & Send OTP) ──────────────────
export const registerUser = async (req, res) => {
  const { email, password, displayName, rollNo, role } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // 1. Create the user in Firebase Auth but keep them DISABLED
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      disabled: true, 
    });

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 3. Store OTP and Metadata in Firestore
    await admin.firestore().collection("verificationCodes").doc(email).set({
      email,
      otp,
      expires,
      uid: userRecord.uid,
      displayName,
      rollNo: rollNo || "",
      role: role || "student"
    });

    // 4. Send the email
    await sendOtpEmail(email, otp, displayName);

    return res.status(200).json({
      message: "Check your email for the verification code",
      email,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(400).json({ error: error.message });
  }
};

// ─── Verify OTP (Step 2: Enable Account) ────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const docRef = admin.firestore().collection("verificationCodes").doc(email);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Verification session not found" });
    }

    const data = doc.data();

    if (Date.now() > data.expires) {
      await docRef.delete();
      // Also delete the disabled user so they can try again
      await admin.auth().deleteUser(data.uid);
      return res.status(400).json({ error: "OTP expired. Please register again." });
    }

    if (data.otp !== otp) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    // Success! Enable the user in Firebase Auth
    await admin.auth().updateUser(data.uid, {
      disabled: false,
    });

    // Create a permanent user profile in Firestore
    const userProfile = {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      rollNo: data.rollNo,
      role: data.role,
      createdAt: new Date().toISOString(),
      isVerified: true
    };

    await admin.firestore().collection("users").doc(data.uid).set(userProfile);

    // Clean up verification code
    await docRef.delete();

    // Create a custom token for immediate login
    const customToken = await admin.auth().createCustomToken(data.uid);

    return res.status(200).json({
      message: "Account verified successfully",
      token: customToken,
      user: userProfile
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({ error: error.message });
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

    // Get ID token for API calls
    const { localId, idToken } = response.data;

    // Get full user details from Firebase Admin
    const userAuth = await admin.auth().getUser(localId);

    // Get metadata from Firestore users collection
    const userDoc = await admin.firestore().collection("users").doc(localId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Create a custom token for this user
    const customToken = await admin.auth().createCustomToken(localId);

    return res.status(200).json({
      message: "Login successful",
      token: customToken,
      user: {
        uid: localId,
        email: userAuth.email,
        displayName: userAuth.displayName,
        photoURL: userAuth.photoURL,
        ...userData
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
    const userAuth = await admin.auth().getUser(decodedToken.uid);

    // Check if user profile exists in Firestore
    const userDocRef = admin.firestore().collection("users").doc(userAuth.uid);
    const userDoc = await userDocRef.get();
    
    let userData = {};

    if (!userDoc.exists) {
      // First time social login -> Create profile
      userData = {
        uid: userAuth.uid,
        email: userAuth.email,
        displayName: userAuth.displayName,
        photoURL: userAuth.photoURL,
        role: "student", // Default role
        rollNo: "", // Social login doesn't have Roll No
        createdAt: new Date().toISOString(),
        isVerified: true,
        authProvider: decodedToken.firebase.sign_in_provider
      };
      await userDocRef.set(userData);
    } else {
      userData = userDoc.data();
    }

    // Create custom token for session management
    const customToken = await admin.auth().createCustomToken(userAuth.uid);

    return res.status(200).json({
      message: "OAuth login successful",
      token: customToken,
      user: {
        uid: userAuth.uid,
        email: userAuth.email,
        displayName: userAuth.displayName,
        photoURL: userAuth.photoURL,
        ...userData
      },
    });
  } catch (error) {
    console.error("OAuth error:", error);
    return res.status(401).json({ error: "OAuth authentication failed" });
  }
};

// ─── Get current user profile (protected route example) ──────────────────────
export const getProfile = async (req, res) => {
  try {
    const userAuth = await admin.auth().getUser(req.user.uid);
    const userDoc = await admin.firestore().collection("users").doc(req.user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    return res.status(200).json({
      uid: userAuth.uid,
      email: userAuth.email,
      displayName: userAuth.displayName,
      photoURL: userAuth.photoURL,
      ...userData
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
