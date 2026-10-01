import admin from "../db/firebase.js";
import { getIo } from "../socket/ioInstance.js";

/**
 * getConversationId — Deterministic conversation ID, same helper used in socketHandler.
 */
const getConversationId = (uid1, uid2) => [uid1, uid2].sort().join("_");

// ─── POST /api/chat/friend-request ──────────────────────────────────────────
// Send a friend request to another student by their UID.
export const sendFriendRequest = async (req, res) => {
  const fromUid = req.user.uid;
  const { toUid } = req.body;

  if (!toUid) return res.status(400).json({ error: "toUid is required" });
  if (fromUid === toUid) return res.status(400).json({ error: "Cannot send a request to yourself" });

  try {
    const db = admin.firestore();
    const friendshipId = getConversationId(fromUid, toUid);
    const ref = db.collection("friendships").doc(friendshipId);
    const existing = await ref.get();

    if (existing.exists) {
      const status = existing.data().status;
      if (status === "accepted") return res.status(400).json({ error: "Already friends" });
      if (status === "pending") return res.status(400).json({ error: "Friend request already sent" });
    }

    // Check that target user exists and is a student
    const targetDoc = await db.collection("users").doc(toUid).get();
    if (!targetDoc.exists) return res.status(404).json({ error: "User not found" });
    if (targetDoc.data().role !== "student") {
      return res.status(400).json({ error: "Can only send friend requests to students" });
    }

    const now = new Date().toISOString();
    await ref.set({
      fromUid,
      toUid,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // ── Real-time: push the request to the receiver's socket room ─────────────
    // Fetch sender profile to enrich the payload
    const senderDoc = await db.collection("users").doc(fromUid).get();
    const sender = senderDoc.exists ? senderDoc.data() : {};
    getIo()?.to(toUid).emit("friend_request", {
      friendshipId,
      createdAt: now,
      sender: {
        uid: fromUid,
        displayName: sender.displayName || "",
        photoURL: sender.photoURL || "",
        rollNo: sender.rollNo || "",
        department: sender.department || "",
      },
    });

    return res.status(201).json({ message: "Friend request sent", friendshipId });
  } catch (err) {
    console.error("sendFriendRequest error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ─── PATCH /api/chat/friend-request/:friendshipId ───────────────────────────
// Accept or reject a friend request. Only the receiver can respond.
export const respondToFriendRequest = async (req, res) => {
  const uid = req.user.uid;
  const { friendshipId } = req.params;
  const { action } = req.body; // "accepted" | "rejected"

  if (!["accepted", "rejected"].includes(action)) {
    return res.status(400).json({ error: "action must be 'accepted' or 'rejected'" });
  }

  try {
    const db = admin.firestore();
    const ref = db.collection("friendships").doc(friendshipId);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: "Friend request not found" });
    const data = doc.data();

    // Only the receiver can accept/reject
    if (data.toUid !== uid) {
      return res.status(403).json({ error: "Forbidden: Only the receiver can respond" });
    }
    if (data.status !== "pending") {
      return res.status(400).json({ error: "Request is not pending" });
    }

    await ref.update({ status: action, updatedAt: new Date().toISOString() });

    // ── Real-time: notify the original sender of the response ─────────────────
    // Also, if accepted, push the new friend's profile to the receiver (uid)
    // so their friends list refreshes without a page reload.
    const io = getIo();
    if (io) {
      // Notify the request sender (fromUid) of the decision
      io.to(data.fromUid).emit("friend_request_responded", {
        friendshipId,
        status: action,
        byUid: uid,
      });

      if (action === "accepted") {
        // Give both sides their new friend's profile so they can update state
        const [senderDoc, receiverDoc] = await Promise.all([
          db.collection("users").doc(data.fromUid).get(),
          db.collection("users").doc(uid).get(),
        ]);
        const senderData = senderDoc.exists ? senderDoc.data() : {};
        const receiverData = receiverDoc.exists ? receiverDoc.data() : {};

        // Tell original sender: your request was accepted, here is the new friend
        io.to(data.fromUid).emit("friend_accepted", {
          friendshipId,
          friend: {
            uid,
            displayName: receiverData.displayName || "",
            photoURL: receiverData.photoURL || "",
            rollNo: receiverData.rollNo || "",
            department: receiverData.department || "",
            bio: receiverData.bio || "",
            friendshipId,
          },
        });

        // Tell the accepter: here is your new friend too (so their list updates)
        io.to(uid).emit("friend_accepted", {
          friendshipId,
          friend: {
            uid: data.fromUid,
            displayName: senderData.displayName || "",
            photoURL: senderData.photoURL || "",
            rollNo: senderData.rollNo || "",
            department: senderData.department || "",
            bio: senderData.bio || "",
            friendshipId,
          },
        });
      }
    }

    return res.status(200).json({ message: `Friend request ${action}`, friendshipId, status: action });
  } catch (err) {
    console.error("respondToFriendRequest error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/chat/friend-requests ──────────────────────────────────────────
// Get all incoming pending friend requests for the current user.
export const getFriendRequests = async (req, res) => {
  const uid = req.user.uid;
  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection("friendships")
      .where("toUid", "==", uid)
      .where("status", "==", "pending")
      .get();

    const requests = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Enrich with sender's profile info
      const senderDoc = await db.collection("users").doc(data.fromUid).get();
      const sender = senderDoc.exists ? senderDoc.data() : {};
      requests.push({
        friendshipId: doc.id,
        fromUid: data.fromUid,
        createdAt: data.createdAt,
        sender: {
          uid: data.fromUid,
          displayName: sender.displayName || "",
          photoURL: sender.photoURL || "",
          rollNo: sender.rollNo || "",
          department: sender.department || "",
        },
      });
    }
    return res.status(200).json({ requests });
  } catch (err) {
    console.error("getFriendRequests error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/chat/friends ───────────────────────────────────────────────────
// Get all accepted friends for the current user.
export const getFriends = async (req, res) => {
  const uid = req.user.uid;
  try {
    const db = admin.firestore();

    // Query both directions (I may have sent or received the request)
    const [sentSnap, receivedSnap] = await Promise.all([
      db.collection("friendships").where("fromUid", "==", uid).where("status", "==", "accepted").get(),
      db.collection("friendships").where("toUid", "==", uid).where("status", "==", "accepted").get(),
    ]);

    const friendUids = new Set();
    const friendshipMap = {};

    [...sentSnap.docs, ...receivedSnap.docs].forEach((doc) => {
      const data = doc.data();
      const friendUid = data.fromUid === uid ? data.toUid : data.fromUid;
      friendUids.add(friendUid);
      friendshipMap[friendUid] = doc.id;
    });

    const friends = [];
    for (const friendUid of friendUids) {
      const friendDoc = await db.collection("users").doc(friendUid).get();
      if (friendDoc.exists) {
        const f = friendDoc.data();
        friends.push({
          uid: friendUid,
          displayName: f.displayName || "",
          photoURL: f.photoURL || "",
          rollNo: f.rollNo || "",
          department: f.department || "",
          bio: f.bio || "",
          friendshipId: friendshipMap[friendUid],
        });
      }
    }

    return res.status(200).json({ friends });
  } catch (err) {
    console.error("getFriends error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ─── DELETE /api/chat/friends/:friendUid ─────────────────────────────────────
// Remove a friend (delete the friendship document).
export const removeFriend = async (req, res) => {
  const uid = req.user.uid;
  const { friendUid } = req.params;

  try {
    const db = admin.firestore();
    const friendshipId = getConversationId(uid, friendUid);
    const ref = db.collection("friendships").doc(friendshipId);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: "Friendship not found" });
    const data = doc.data();
    if (data.fromUid !== uid && data.toUid !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await ref.delete();

    // ── Real-time: notify the unfriended party ────────────────────────────────
    getIo()?.to(friendUid).emit("friend_removed", { friendshipId, byUid: uid });

    return res.status(200).json({ message: "Friend removed", friendshipId });
  } catch (err) {
    console.error("removeFriend error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/chat/messages/:friendUid ──────────────────────────────────────
// Get conversation history with a specific friend (paginated).
export const getConversationHistory = async (req, res) => {
  const uid = req.user.uid;
  const { friendUid } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const db = admin.firestore();
    const convId = getConversationId(uid, friendUid);

    // Security: check they are friends
    const friendshipDoc = await db.collection("friendships").doc(convId).get();
    if (!friendshipDoc.exists || friendshipDoc.data().status !== "accepted") {
      return res.status(403).json({ error: "Not friends with this user" });
    }

    const messagesSnap = await db
      .collection("conversations")
      .doc(convId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const messages = messagesSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }))
      .reverse(); // Oldest first

    return res.status(200).json({ messages, convId });
  } catch (err) {
    console.error("getConversationHistory error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/chat/search-students ──────────────────────────────────────────
// Search for students by name or rollNo to send friend requests.
export const searchStudents = async (req, res) => {
  const uid = req.user.uid;
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: "Search query must be at least 2 characters" });
  }

  try {
    const db = admin.firestore();
    // Fetch all students and filter in-memory (Firestore has limited full-text search)
    const snapshot = await db.collection("users").where("role", "==", "student").get();

    const query = q.trim().toLowerCase();
    const results = [];

    snapshot.forEach((doc) => {
      if (doc.id === uid) return; // exclude self
      const data = doc.data();
      const nameMatch = data.displayName?.toLowerCase().includes(query);
      const rollMatch = data.rollNo?.toLowerCase().includes(query);
      if (nameMatch || rollMatch) {
        results.push({
          uid: doc.id,
          displayName: data.displayName || "",
          photoURL: data.photoURL || "",
          rollNo: data.rollNo || "",
          department: data.department || "",
        });
      }
    });

    return res.status(200).json({ students: results.slice(0, 20) });
  } catch (err) {
    console.error("searchStudents error:", err);
    return res.status(500).json({ error: err.message });
  }
};
