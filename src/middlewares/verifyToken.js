import admin from "../db/firebase.js";

const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ─── Create / refresh a session in Firestore ────────────────────────────────
export const createSession = async (uid) => {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await admin.firestore().collection("sessions").doc(uid).set({
    uid,
    expiresAt,
    createdAt: new Date().toISOString(),
  });
  return expiresAt;
};

// ─── Delete session from Firestore ──────────────────────────────────────────
export const deleteSession = async (uid) => {
  await admin.firestore().collection("sessions").doc(uid).delete();
};

// ─── Verify Firebase ID Token + active backend session (middleware) ───────────
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;

    // ── Check backend session ────────────────────────────────────────────────
    const sessionDoc = await admin
      .firestore()
      .collection("sessions")
      .doc(decodedToken.uid)
      .get();

    if (!sessionDoc.exists) {
      return res.status(401).json({ error: "SESSION_EXPIRED", message: "Session not found. Please log in again." });
    }

    const { expiresAt } = sessionDoc.data();
    if (Date.now() > expiresAt) {
      // Clean up expired session
      await deleteSession(decodedToken.uid);
      return res.status(401).json({ error: "SESSION_EXPIRED", message: "Your session has expired. Please log in again." });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
