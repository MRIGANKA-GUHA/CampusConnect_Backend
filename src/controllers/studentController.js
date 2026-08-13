import admin from "../db/firebase.js";

// ─── GET /api/student/stats ──────────────────────────────────────────────────
export const getStudentStats = async (req, res) => {
  const uid = req.user.uid;
  try {
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    const userData = userDoc.data() || {};
    const bookmarksCount = (userData.bookmarks || []).length;
    const clubsJoinedCount = (userData.joinedClubs || []).length;

    const eventsSnapshot = await admin.firestore().collection("events").where("attendees", "array-contains", uid).get();
    
    let eventsJoinedCount = 0;
    let upcomingEventsCount = 0;
    const now = new Date();
    // Reset time to start of day for comparison
    now.setHours(0,0,0,0);

    eventsSnapshot.forEach(doc => {
      eventsJoinedCount++;
      const data = doc.data();
      if (data.date) {
        const eventDate = new Date(data.date);
        if (eventDate >= now) {
          upcomingEventsCount++;
        }
      }
    });

    return res.status(200).json({
      stats: {
        eventsJoined: eventsJoinedCount,
        upcomingEvents: upcomingEventsCount,
        savedNotices: bookmarksCount,
        clubsJoined: clubsJoinedCount
      }
    });
  } catch (error) {
    console.error("getStudentStats error:", error);
    return res.status(500).json({ error: error.message });
  }
};

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

// ─── POST /api/student/clubs/:clubId/join ─────────────────────────────────────
// Adds the student UID to Club.members[] and the club ID to User.joinedClubs[].
// Uses a batch write so both updates are atomic.
export const joinClub = async (req, res) => {
  const uid = req.user.uid;
  const { clubId } = req.params;

  if (!clubId) return res.status(400).json({ error: "clubId is required." });

  try {
    const clubRef = admin.firestore().collection("clubs").doc(clubId);
    const clubDoc = await clubRef.get();
    if (!clubDoc.exists) return res.status(404).json({ error: "Club not found." });
    if (clubDoc.data().status !== "active") {
      return res.status(400).json({ error: "Cannot join an inactive club." });
    }

    const now = new Date().toISOString();
    const batch = admin.firestore().batch();

    // Add student UID to Club.members
    batch.update(clubRef, {
      members: admin.firestore.FieldValue.arrayUnion(uid),
      updatedAt: now
    });

    // Add club ID to User.joinedClubs
    batch.update(admin.firestore().collection("users").doc(uid), {
      joinedClubs: admin.firestore.FieldValue.arrayUnion(clubId),
      updatedAt: now
    });

    await batch.commit();
    return res.status(200).json({ message: "Joined club successfully.", clubId });
  } catch (error) {
    console.error("joinClub error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── DELETE /api/student/clubs/:clubId/leave ──────────────────────────────────
// Removes the student UID from Club.members[] and the club ID from User.joinedClubs[].
export const leaveClub = async (req, res) => {
  const uid = req.user.uid;
  const { clubId } = req.params;

  if (!clubId) return res.status(400).json({ error: "clubId is required." });

  try {
    const clubRef = admin.firestore().collection("clubs").doc(clubId);
    const clubDoc = await clubRef.get();
    if (!clubDoc.exists) return res.status(404).json({ error: "Club not found." });

    const now = new Date().toISOString();
    const batch = admin.firestore().batch();

    batch.update(clubRef, {
      members: admin.firestore.FieldValue.arrayRemove(uid),
      updatedAt: now
    });

    batch.update(admin.firestore().collection("users").doc(uid), {
      joinedClubs: admin.firestore.FieldValue.arrayRemove(clubId),
      updatedAt: now
    });

    await batch.commit();
    return res.status(200).json({ message: "Left club successfully.", clubId });
  } catch (error) {
    console.error("leaveClub error:", error);
    return res.status(500).json({ error: error.message });
  }
};

