import express from "express";
import { 
  getDashboardStats,
  getAllEvents,
  updateEventStatus,
  getStudents, 
  deleteUser, 
  updateUserRole, 
  toggleVerification, 
  toggleUserStatus,
  getClubs,
  getPublicClubs,
  getPublicStats,
  getPublicEvents,
  getPublicEventById,
  createClub,
  updateClubStatus,
  deleteClub,
  getConvenors,
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice
} from "../controllers/adminController.js";
import { getAllRegistrations, adminUpdatePaymentStatus } from "../controllers/paymentController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import pdfUpload from "../middlewares/pdfUpload.js";

const router = express.Router();

// ─── User Management ───
router.get("/stats/dashboard", verifyToken, getDashboardStats);
router.get("/students", verifyToken, getStudents);
router.delete("/students/:id", verifyToken, deleteUser);
router.patch("/students/:id/role", verifyToken, updateUserRole);
router.patch("/students/:id/verify", verifyToken, toggleVerification);
router.patch("/students/:id/status", verifyToken, toggleUserStatus);
router.get("/convenors", verifyToken, getConvenors);

// ─── Admin Event Management ───
router.get("/events", verifyToken, getAllEvents);
router.patch("/events/:id/status", verifyToken, updateEventStatus);

// ─── Club Management ───
router.get("/clubs/public", getPublicClubs);  // No auth — for landing page
router.get("/stats/public", getPublicStats);  // No auth — for landing page stats
router.get("/events/public", getPublicEvents); // No auth — for landing page events
router.get("/events/:id/public", getPublicEventById); // No auth — for QR code deep-link
router.get("/clubs", verifyToken, getClubs);
router.post("/clubs", verifyToken, createClub);
router.patch("/clubs/:id/status", verifyToken, updateClubStatus);
router.delete("/clubs/:id", verifyToken, deleteClub);

// ─── Notices ───
router.get("/notices", verifyToken, getNotices);
router.post("/notices", verifyToken, pdfUpload.single('pdf'), createNotice);
router.put("/notices/:id", verifyToken, pdfUpload.single('pdf'), updateNotice);
router.delete("/notices/:id", verifyToken, deleteNotice);

// ─── Registrations ───
router.get("/registrations", verifyToken, getAllRegistrations);
router.patch("/registrations/:id/status", verifyToken, adminUpdatePaymentStatus);

export default router;
