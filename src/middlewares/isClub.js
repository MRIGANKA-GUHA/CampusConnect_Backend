import admin from "../db/firebase.js";

/**
 * isClub Middleware
 * Ensures the authenticated user has the "club" role and that the club account is active.
 * Must be used after verifyToken middleware.
 */
export const isClub = async (req, res, next) => {
  if (!req.user || req.user.role !== "club") {
    return res.status(403).json({ error: "Access denied. Club accounts only." });
  }

  try {
    const snapshot = await admin.firestore()
      .collection("clubs")
      .where("clubAuthUid", "==", req.user.uid)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const clubData = snapshot.docs[0].data();
      if (clubData.status === "restricted" || clubData.status === "inactive") {
        return res.status(403).json({ 
          error: "Your club account has been restricted by the Administrator. Actions are temporarily disabled." 
        });
      }
    }
  } catch (err) {
    console.error("isClub status verification error:", err);
  }

  next();
};
