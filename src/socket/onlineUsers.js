/**
 * onlineUsers — In-memory store for currently connected socket users.
 * Maps uid → socketId so we can target a specific user's socket room.
 */

const onlineUsers = new Map(); // uid -> socketId

export const addUser = (uid, socketId) => {
  onlineUsers.set(uid, socketId);
};

export const removeUser = (uid) => {
  onlineUsers.delete(uid);
};

export const getSocketId = (uid) => {
  return onlineUsers.get(uid);
};

export const getOnlineUids = () => {
  return Array.from(onlineUsers.keys());
};

export const isOnline = (uid) => {
  return onlineUsers.has(uid);
};
