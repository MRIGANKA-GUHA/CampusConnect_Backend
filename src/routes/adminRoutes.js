import express from "express";
import { getStudentCount, getStudents, deleteUser, updateUserRole, toggleVerification, toggleUserStatus } from "../controllers/adminController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// GET /api/admin/stats/students → protected: count of student-role users
router.get("/stats/students", verifyToken, getStudentCount);

// GET /api/admin/students → protected: list of student-role users
router.get("/students", verifyToken, getStudents);

// DELETE /api/admin/students/:id → protected: remove user from firestore + auth
router.delete("/students/:id", verifyToken, deleteUser);

// PATCH /api/admin/students/:id/role → protected: update user role
router.patch("/students/:id/role", verifyToken, updateUserRole);

// PATCH /api/admin/students/:id/verify → protected: toggle account verification
router.patch("/students/:id/verify", verifyToken, toggleVerification);

// PATCH /api/admin/students/:id/status → protected: disable/enable account
router.patch("/students/:id/status", verifyToken, toggleUserStatus);

export default router;
