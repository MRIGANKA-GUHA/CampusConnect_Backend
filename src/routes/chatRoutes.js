import express from "express";
import {
  sendFriendRequest,
  respondToFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  getConversationHistory,
  searchStudents,
  sendDirectMessage,
  markMessagesRead,
} from "../controllers/chatController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// All chat routes require authentication
// ─── Friend Requests ────────────────────────────────────────────────────────
router.post("/friend-request", verifyToken, sendFriendRequest);
router.patch("/friend-request/:friendshipId", verifyToken, respondToFriendRequest);
router.get("/friend-requests", verifyToken, getFriendRequests);

// ─── Friends ─────────────────────────────────────────────────────────────────
router.get("/friends", verifyToken, getFriends);
router.delete("/friends/:friendUid", verifyToken, removeFriend);

// ─── Messages ─────────────────────────────────────────────────────────────────
router.get("/messages/:friendUid", verifyToken, getConversationHistory);
router.post("/messages", verifyToken, sendDirectMessage);
router.patch("/mark-read", verifyToken, markMessagesRead);

// ─── Student Search ───────────────────────────────────────────────────────────
router.get("/search-students", verifyToken, searchStudents);

export default router;
