import admin from "../db/firebase.js";

// ─── Verify Firebase ID Token (middleware) ───────────────────────────────────
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // attach user info to request
    next();
  } catch (error) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Invalid token" });
  }
};
