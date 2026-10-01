import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { initSocket } from "./socket/socketHandler.js";
import { setIo } from "./socket/ioInstance.js";

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "https://campuscon.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
];

// Wrap Express app in a native HTTP server so Socket.IO can share the same port
const httpServer = createServer(app);

// Attach Socket.IO with matching CORS config
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
});

// Register all socket event handlers
initSocket(io);
// Store io in singleton so REST controllers can emit events
setIo(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
