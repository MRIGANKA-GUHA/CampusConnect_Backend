import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

const app = express();

// Middlewares
app.use(cors({ origin: "https://campuscon.vercel.app", credentials: true }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "CampusConnect Backend is running 🚀" });
});

export default app;
