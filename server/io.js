import { Server } from "socket.io";

let io;

export const init = (server) => {
  io = new Server(server);
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Must call .init(server) before .getIO()");
  }
  return io;
};
