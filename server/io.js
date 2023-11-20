const socketIO = require("socket.io");

let io;

const init = (server) => {
  io = socketIO(server);
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Must call .init(server) before .getIO()");
  }
  return io;
};

module.exports = { init, getIO };
