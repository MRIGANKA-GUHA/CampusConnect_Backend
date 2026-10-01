/**
 * ioInstance — Singleton store for the Socket.IO server instance.
 *
 * Why: Express controllers are separate from the Socket.IO setup in index.js.
 * By storing `io` here, controllers can import getIo() and emit real-time
 * events after REST operations (e.g. friend request sent → push to receiver).
 *
 * Usage:
 *   index.js       → setIo(io) once after creating the Server
 *   controllers/*  → getIo()?.to(uid).emit(...)
 */

let _io = null;

export const setIo = (io) => {
  _io = io;
};

export const getIo = () => _io;
