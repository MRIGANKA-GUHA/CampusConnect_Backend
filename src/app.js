import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

const app = express();

const allowedOrigins = [
  "https://campuscon.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174"
];

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "CampusConnect Backend is running" });
});

export default app;
