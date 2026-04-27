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
  createClub,
  updateClubStatus,
  deleteClub,
  getConvenors
} from "../controllers/adminController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

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
router.get("/clubs", verifyToken, getClubs);
router.post("/clubs", verifyToken, createClub);
router.patch("/clubs/:id/status", verifyToken, updateClubStatus);
router.delete("/clubs/:id", verifyToken, deleteClub);

export default router;
