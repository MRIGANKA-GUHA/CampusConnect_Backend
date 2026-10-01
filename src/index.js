import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { initSocket } from "./socket/socketHandler.js";
import { setIo } from "./socket/ioInstance.js";

const PORT = process.env.PORT || 5000;

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  if (/^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
  return false;
};

// Wrap Express app in a native HTTP server so Socket.IO can share the same port
const httpServer = createServer(app);

// Attach Socket.IO with matching CORS config
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
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
