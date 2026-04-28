import express from "express";
import { 
  getStudentCount, 
  getStudents, 
  deleteUser, 
  updateUserRole, 
  toggleVerification, 
  toggleUserStatus,
  getClubs,
  getPublicClubs,
  getPublicStats,
  getPublicEvents,
  createClub,
  updateClubStatus,
  deleteClub,
  getConvenors,
  getNotices,
  createNotice
} from "../controllers/adminController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import pdfUpload from "../middlewares/pdfUpload.js";

const router = express.Router();

// ─── User Management ───
router.get("/stats/students", verifyToken, getStudentCount);
router.get("/students", verifyToken, getStudents);
router.delete("/students/:id", verifyToken, deleteUser);
router.patch("/students/:id/role", verifyToken, updateUserRole);
router.patch("/students/:id/verify", verifyToken, toggleVerification);
router.patch("/students/:id/status", verifyToken, toggleUserStatus);
router.get("/convenors", verifyToken, getConvenors);

// ─── Club Management ───
router.get("/clubs/public", getPublicClubs);  // No auth — for landing page
router.get("/stats/public", getPublicStats);  // No auth — for landing page stats
router.get("/events/public", getPublicEvents); // No auth — for landing page events
router.get("/clubs", verifyToken, getClubs);
router.post("/clubs", verifyToken, createClub);
router.patch("/clubs/:id/status", verifyToken, updateClubStatus);
router.delete("/clubs/:id", verifyToken, deleteClub);

// ─── Notices ───
router.get("/notices", verifyToken, getNotices);
router.post("/notices", verifyToken, pdfUpload.single('pdf'), createNotice);

export default router;
