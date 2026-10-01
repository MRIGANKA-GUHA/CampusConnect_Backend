import admin from "../db/firebase.js";
import { addUser, removeUser, isOnline, getOnlineUids } from "./onlineUsers.js";

/**
 * getConversationId — Deterministic conversation ID from two UIDs.
 * Always sorted so both users reference the same Firestore document.
 */
const getConversationId = (uid1, uid2) => [uid1, uid2].sort().join("_");

/**
 * areFriends — Check if two users have an accepted friendship in Firestore.
 */
const areFriends = async (uid1, uid2) => {
  const db = admin.firestore();
  const convId = getConversationId(uid1, uid2);
  const friendDoc = await db.collection("friendships").doc(convId).get();
  return friendDoc.exists && friendDoc.data()?.status === "accepted";
};

/**
 * initSocket — Attach all Socket.IO event handlers to the io instance.
 * Called once from index.js after the HTTP server is created.
 */
export const initSocket = (io) => {
  // ── Authentication middleware ──────────────────────────────────────────────
  // Verify Firebase ID token on every socket connection attempt.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error: No token"));

      const decoded = await admin.auth().verifyIdToken(token);

      // Also validate the backend session exists (same as verifyToken middleware)
      const sessionDoc = await admin.firestore().collection("sessions").doc(decoded.uid).get();
      if (!sessionDoc.exists) return next(new Error("Authentication error: Session expired"));

      const { expiresAt } = sessionDoc.data();
      if (Date.now() > expiresAt) return next(new Error("Authentication error: Session expired"));

      socket.uid = decoded.uid;
      socket.displayName = decoded.name || decoded.email;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // ── Connection ─────────────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const uid = socket.uid;
    console.log(`[Socket] Connected: ${uid} (${socket.id})`);

    // Register user presence
    addUser(uid, socket.id);

    // Join a personal room named after their UID
    // This lets us emit directly to them with io.to(uid)
    socket.join(uid);

    // Broadcast updated online list to everyone
    io.emit("online_users", getOnlineUids());

    // ── send_message ──────────────────────────────────────────────────────────
    socket.on("send_message", async (data, ack) => {
      try {
        const { toUid, text } = data;

        if (!toUid || !text?.trim()) {
          return ack?.({ error: "toUid and text are required" });
        }

        // Validate friendship before allowing message
        const friends = await areFriends(uid, toUid);
        if (!friends) {
          return ack?.({ error: "You can only message friends" });
        }

        const db = admin.firestore();
        const convId = getConversationId(uid, toUid);
        const now = admin.firestore.FieldValue.serverTimestamp();

        // Save message to Firestore sub-collection
        const messageRef = await db
          .collection("conversations")
          .doc(convId)
          .collection("messages")
          .add({
            senderUid: uid,
            text: text.trim(),
            createdAt: now,
            read: false,
          });

        // Update conversation metadata (last message preview)
        await db.collection("conversations").doc(convId).set(
          {
            participants: [uid, toUid].sort(),
            lastMessage: text.trim().substring(0, 100),
            lastMessageAt: now,
            [`unreadCount.${toUid}`]: admin.firestore.FieldValue.increment(1),
          },
          { merge: true }
        );

        const messagePayload = {
          id: messageRef.id,
          convId,
          senderUid: uid,
          toUid,
          text: text.trim(),
          createdAt: new Date().toISOString(),
          read: false,
        };

        // Emit to receiver's personal room (if online)
        io.to(toUid).emit("receive_message", messagePayload);

        // Ack back to sender
        ack?.({ success: true, message: messagePayload });
      } catch (err) {
        console.error("[Socket] send_message error:", err);
        ack?.({ error: "Failed to send message" });
      }
    });

    // ── mark_read ─────────────────────────────────────────────────────────────
    socket.on("mark_read", async ({ convId, friendUid }) => {
      try {
        if (!convId) return;
        const db = admin.firestore();

        // Reset unread count for the current user in this conversation
        await db.collection("conversations").doc(convId).set(
          { [`unreadCount.${uid}`]: 0 },
          { merge: true }
        );

        // Mark all messages from friendUid as read
        const unreadMessages = await db
          .collection("conversations")
          .doc(convId)
          .collection("messages")
          .where("senderUid", "==", friendUid)
          .where("read", "==", false)
          .get();

        const batch = db.batch();
        unreadMessages.forEach((doc) => batch.update(doc.ref, { read: true }));
        await batch.commit();

        // ── Notify the sender that their messages were read ──────────────────
        // This lets the sender's UI flip single tick → double tick in real time.
        if (friendUid) {
          io.to(friendUid).emit("messages_read", { convId, byUid: uid });
        }
      } catch (err) {
        console.error("[Socket] mark_read error:", err);
      }
    });

    // ── typing ────────────────────────────────────────────────────────────────
    socket.on("typing", ({ toUid }) => {
      if (toUid) {
        io.to(toUid).emit("user_typing", { fromUid: uid });
      }
    });

    socket.on("stop_typing", ({ toUid }) => {
      if (toUid) {
        io.to(toUid).emit("user_stop_typing", { fromUid: uid });
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${uid}`);
      removeUser(uid);
      io.emit("online_users", getOnlineUids());
    });
  });
};
