const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
const io = require("socket.io")(server);

app.use(express.static(path.join(__dirname, "")));

let userConnections = [];

io.on("connection", (socket) => {
  console.log("socket id is", socket.id);
  socket.on("userconnect", (data) => {
    console.log("userconnect", data.displayName, data.meetingId);

    const otherUsers = userConnections.filter(
      (p) => p.meetingId === data.meetingId
    );
    console.log("otherUsers: ", otherUsers);

    userConnections.push({
      connectionId: socket.id,
      userId: data.displayName,
      meetingId: data.meetingId,
    });

    console.log("userConnections: ", userConnections);

    otherUsers.forEach((v) => {
      socket.to(v.connectionId).emit("informOthersAboutMe", {
        otherUserId: data.displayName,
        connId: socket.id,
      });
    });
    console.log("Informing new user about others", otherUsers);
    socket.emit("informMeAboutOtherUser", otherUsers);
  });
  socket.on("SDPProcess", (data) => {
    socket.to(data.toConnId).emit("SDPProcess", {
      message: data.message,
      fromConnId: socket.id,
    });
  });
});
