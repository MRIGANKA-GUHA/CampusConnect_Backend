import admin from "../db/firebase.js";

// ─── GET /api/student/bookmarks ──────────────────────────────────────────────
// Returns the current user's bookmarked notice IDs array.
export const getBookmarks = async (req, res) => {
  const uid = req.user.uid;
  try {
    const docSnap = await admin.firestore().collection("users").doc(uid).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "User not found." });
    }
    const bookmarks = docSnap.data()?.bookmarks || [];
    return res.status(200).json({ bookmarks });
  } catch (error) {
    console.error("getBookmarks error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── POST /api/student/bookmarks/:noticeId ───────────────────────────────────
// Adds a notice ID to the user's bookmarks array (idempotent via arrayUnion).
export const addBookmark = async (req, res) => {
  const uid = req.user.uid;
  const { noticeId } = req.params;

  if (!noticeId) {
    return res.status(400).json({ error: "noticeId is required." });
  }

  try {
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({
        bookmarks: admin.firestore.FieldValue.arrayUnion(noticeId),
        updatedAt: new Date().toISOString(),
      });

    return res.status(200).json({ message: "Bookmark added.", noticeId });
  } catch (error) {
    console.error("addBookmark error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── DELETE /api/student/bookmarks/:noticeId ─────────────────────────────────
// Removes a notice ID from the user's bookmarks array (idempotent via arrayRemove).
export const removeBookmark = async (req, res) => {
  const uid = req.user.uid;
  const { noticeId } = req.params;

  if (!noticeId) {
    return res.status(400).json({ error: "noticeId is required." });
  }

  try {
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({
        bookmarks: admin.firestore.FieldValue.arrayRemove(noticeId),
        updatedAt: new Date().toISOString(),
      });

    return res.status(200).json({ message: "Bookmark removed.", noticeId });
  } catch (error) {
    console.error("removeBookmark error:", error);
    return res.status(500).json({ error: error.message });
  }
};
