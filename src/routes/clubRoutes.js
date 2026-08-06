import express from "express";
import {
  getClubProfile,
  updateClubProfile,
  uploadClubLogo,
  uploadClubCover,
  getClubEvents,
  createClubEvent,
  updateClubEvent,
  deleteClubEvent,
  getClubMembers,
  getClubNotices,
  postClubNotice,
  deleteClubNotice,
  getClubStats
} from "../controllers/clubController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { isClub } from "../middlewares/isClub.js";
import pdfUpload from "../middlewares/pdfUpload.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// All club routes require both verifyToken and isClub middleware

// ─── Dashboard Stats ───
router.get("/stats", verifyToken, isClub, getClubStats);

// ─── Club Profile ───
router.get("/profile", verifyToken, isClub, getClubProfile);
router.patch("/profile", verifyToken, isClub, updateClubProfile);
router.post("/profile/logo", verifyToken, isClub, upload.single("image"), uploadClubLogo);
router.post("/profile/cover", verifyToken, isClub, upload.single("image"), uploadClubCover);

// ─── Events ───
router.get("/events", verifyToken, isClub, getClubEvents);
router.post("/events", verifyToken, isClub, createClubEvent);
router.put("/events/:id", verifyToken, isClub, updateClubEvent);
router.delete("/events/:id", verifyToken, isClub, deleteClubEvent);

// ─── Members ───
router.get("/members", verifyToken, isClub, getClubMembers);

// ─── Notices ───
router.get("/notices", verifyToken, isClub, getClubNotices);
router.post("/notices", verifyToken, isClub, pdfUpload.single("pdf"), postClubNotice);
router.delete("/notices/:id", verifyToken, isClub, deleteClubNotice);

export default router;
