const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
require("dotenv").config();
const upload = require("./middleware/multer.js");
const { init } = require("./io.js");
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const io = init(server);

require("./controller/transcribe.js");

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

app.post("/api/upload", upload.single("audio"), (req, res) => {
  res.send({ message: "File uploaded successfully." });
});

let userConnections = [];
let userMeetingRooms = {};

app.post("/api/breakoutroom", (req, res) => {
  const { meetingId, numOfRoom, setTime } = req.body;
  let rooms = [];
  const usersInThisMeeting = userConnections.filter(
    (u) => u.meetingId === meetingId
  );
  if (usersInThisMeeting.length % numOfRoom !== 0) {
    return res.status(400).json({
      success: false,
      message: "Users cannot be evenly distributed into rooms",
    });
  }

  const sliceIndex = Math.ceil(usersInThisMeeting.length / numOfRoom);
  let roomIds = [];

  for (let i = 0; i < numOfRoom; i++) {
    const roomUsers = usersInThisMeeting.slice(
      i * sliceIndex,
      (i + 1) * sliceIndex
    );

    const roomId = Math.random().toString(36).substring(2, 12);
    roomIds.push({ roomId });
    rooms.push({
      roomUsers: roomUsers.map((u) => ({
        roomId,
        userId: u.userId,
        connId: u.connectionId,
      })),
    });
  }

  userMeetingRooms[meetingId] = {
    setTime,
    rooms: rooms.map((room) => room.roomUsers),
  };

  console.log("userMeetingRooms: ", userMeetingRooms);
  setTimeout(() => {
    endBreakoutSession(meetingId);
  }, setTime * 1000); // setTime in seconds

  res.status(200).json({ success: true, message: rooms });
  console.log("rooms: ", rooms);
  rooms.forEach((room) => {
    room.roomUsers.forEach((user) => {
      console.log("About to emit informAboutBreakRooms!!!!");
      io.to(user.connId).emit("informAboutBreakRooms", {
        roomId: user.roomId,
        connId: user.connId,
        userId: user.userId,
      });
    });
  });
});

function endBreakoutSession(meetingId) {
  console.log("===============Breakoutroom session is ending ==========");
  const breakoutInfo = userMeetingRooms[meetingId];
  console.log("breakoutInfo", breakoutInfo);
  if (breakoutInfo) {
    breakoutInfo.rooms.forEach((roomUsers) => {
      roomUsers.forEach((user) => {
        const currentConnections = userConnections.find(
          (u) => u.userId === user.userId
        );
        if (currentConnections) {
          console.log("user.connId", user.connId);
          console.log("meetingId", meetingId);
          io.to(
            currentConnections.connectionId
          ).emit("informBackToOriginalMeeting", { meetingId });
        }
      });
    });
  }
  delete userMeetingRooms[meetingId];
}

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

  socket.on("userVideoToggle", (data) => {
    console.log("userVideoToggle got the message");
    const { connId, status } = data;
    const meetingId = userConnections.find(
      (u) => u.connId === userConnections.connectionId
    ).meetingId;
    const userId = userConnections.find(
      (u) => u.connId === userConnections.connectionId
    ).userId;
    const list = userConnections.filter(
      (p) => p.meetingId === meetingId && p.userId !== userId
    );
    console.log("the list to inform to disable the video is...", list);
    list.forEach((v) => {
      socket.to(v.connectionId).emit("updateUserVideo", {
        connId,
        status,
      });
    });
  });

  socket.on("disconnect", function () {
    console.log("Disconnected");
    const disUser = userConnections.find((p) => p.connectionId === socket.id);
    console.log("this is the disUser:", disUser);
    if (disUser) {
      const meetingId = disUser.meetingId;
      console.log("this is the disUser meetingId:", meetingId);
      userConnections = userConnections.filter(
        (p) => p.connectionId != socket.id
      );
      const list = userConnections.filter((p) => p.meetingId === meetingId);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("informOtherAboutDisconnectedUser", {
          connId: socket.id,
        });
      });
    }
  });
});

module.exports = io;
