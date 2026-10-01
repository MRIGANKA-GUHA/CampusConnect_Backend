import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import clubRoutes from "./routes/clubRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  if (/^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/club", clubRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chat", chatRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "CampusConnect Backend is running" });
});

export default app;
