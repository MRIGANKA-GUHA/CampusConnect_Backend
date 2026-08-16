import express from "express";
import { getBookmarks, addBookmark, removeBookmark, joinClub, leaveClub, getStudentStats } from "../controllers/studentController.js";
import { registerForEvent, getMyRegistration, getMyRegistrations } from "../controllers/paymentController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// All bookmark routes require authentication.
// All authenticated users (student, admin, club) can use bookmarks.

router.get("/stats", verifyToken, getStudentStats);

// ─── Bookmarks ───
router.get("/bookmarks", verifyToken, getBookmarks);
router.post("/bookmarks/:noticeId", verifyToken, addBookmark);
router.delete("/bookmarks/:noticeId", verifyToken, removeBookmark);

// ─── Club Membership ───
// Students can join/leave clubs. Both updates (Club.members + User.joinedClubs) are atomic.
router.post("/clubs/:clubId/join", verifyToken, joinClub);
router.delete("/clubs/:clubId/leave", verifyToken, leaveClub);

// ─── Event Registrations ───
router.post("/events/:eventId/register", verifyToken, registerForEvent);
router.get("/events/:eventId/my-registration", verifyToken, getMyRegistration);
router.get("/registrations", verifyToken, getMyRegistrations);

export default router;
