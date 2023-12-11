import {
  createMeeting,
  checkMeeting,
  createConnection,
  userLeaveMeeting,
  addChat,
  endMeeting,
} from "../models/meeting.js";

import {
  generateMeetingSummary,
  storeMeetingSummary,
} from "../utils/summary.js";

export let userConnections = [];
export const userMeetingRooms = {};

const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log("socket id is", socket.id);
    socket.on("userconnect", async (data) => {
      console.log("userconnect", data.displayName, data.meetingId);

      const otherUsers = userConnections.filter(
        (p) => p.meetingId === data.meetingId
      );
      console.log("otherUsers: ", otherUsers);

      userConnections.push({
        connectionId: socket.id,
        username: data.displayName,
        userId: data.userId,
        meetingId: data.meetingId,
      });
      try {
        if (await checkMeeting(data.meetingId)) {
          await createConnection(data.meetingId, data.userId, socket.id);
        } else {
          await createMeeting(data.meetingId, data.userId);
          await createConnection(data.meetingId, data.userId, socket.id);
        }
      } catch (err) {
        console.error("Error creating meeting and connection", err);
      }

      console.log("userConnections: ", userConnections);

      const userCount = otherUsers.length + 1;
      console.log("userCount", userCount);

      otherUsers.forEach((v) => {
        socket.to(v.connectionId).emit("informOthersAboutMe", {
          otherUserId: data.displayName,
          userId: data.userId,
          connId: socket.id,
          userNumber: userCount,
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
      console.log(`${connId} in server userVideoToggle`);
      // eslint-disable-next-line prefer-destructuring
      console.log("userConenctions in userVideoToggle", userConnections);
      const meetingId = userConnections.find((u) => u.connectionId === connId)
        .meetingId;

      console.log("camera status chaned: ", meetingId);
      const list = userConnections.filter((p) => p.meetingId === meetingId);
      console.log("the list to inform to disable the video is...", list);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("updateUserVideo", {
          connId,
          status,
        });
      });
    });

    socket.on("shareScreen", (connId) => {
      const meetingId = userConnections.find((u) => u.connectionId === connId)
        .meetingId;
      const list = userConnections.filter((p) => p.meetingId === meetingId);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("flipVideo", {
          from: connId,
        });
      });
    });

    socket.on("drawCanvas", (data) => {
      console.log("the server got drawCanvas");
      const { startX, startY, endX, endY, mode, myConnectionId } = data;
      const meetingId = userConnections.find(
        (u) => u.connectionId === myConnectionId
      ).meetingId;
      const list = userConnections.filter((u) => u.meetingId === meetingId);
      console.log("Inform these users about canvas drawing: ", list);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("updateCanvasDrawing", {
          startX,
          startY,
          endX,
          endY,
          mode,
          fromConnId: myConnectionId,
        });
      });
    });

    socket.on("drawerTurnsOffCanvas", (data) => {
      console.log("the server got drawerTurnsOffCanvas");
      const { myConnectionId } = data;
      console.log(
        "userConnections in drawerTurnsOffCanvas event",
        userConnections
      );
      const meetingId = userConnections.find(
        (u) => u.connectionId === myConnectionId
      ).meetingId;
      const list = userConnections.filter((u) => u.meetingId === meetingId);
      console.log("Inform these users about canvas clearing: ", list);
      console.log("myConnectionId", myConnectionId);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("clearCanvas", {
          fromConnId: myConnectionId,
        });
      });
    });

    socket.on("sendMessage", async (msg) => {
      console.log("this is the msg that the server got: ", msg);
      const mUser = userConnections.find((p) => p.connectionId === socket.id);

      if (mUser) {
        const meetingId = mUser.meetingId;
        const from = mUser.username;
        const list = userConnections.filter((p) => p.meetingId === meetingId);
        list.forEach((v) => {
          socket.to(v.connectionId).emit("showChatMessage", {
            from: from,
            message: msg,
          });
        });
        try {
          await addChat(mUser.meetingId, mUser.userId, socket.id, msg);
        } catch (err) {
          console.error("Error adding chat:", err);
        }
      }
    });

    socket.on("disconnect", async () => {
      console.log("Disconnected");
      const disUser = userConnections.find((p) => p.connectionId === socket.id);
      console.log("this is the disUser:", disUser);
      if (disUser) {
        const { meetingId } = disUser;
        console.log("this is the disUser meetingId:", meetingId);
        userConnections = userConnections.filter(
          (p) => p.connectionId !== socket.id
        );
        const list = userConnections.filter((p) => p.meetingId === meetingId);
        const userNumberAfterUserLeaves = userConnections.length;
        list.forEach((v) => {
          socket.to(v.connectionId).emit("informOtherAboutDisconnectedUser", {
            connId: socket.id,
            userWhoLeft: disUser.username,
            uNumber: userNumberAfterUserLeaves,
          });
        });
        userLeaveMeeting(meetingId, disUser.userId);
        console.log("meetingId", meetingId);
        if (userNumberAfterUserLeaves === 0) {
          try {
            await endMeeting(meetingId);
            const summary = await generateMeetingSummary(meetingId);
            await storeMeetingSummary(meetingId, summary);
          } catch (err) {
            console.error("Error ending meeting:", err);
          }
        }
      }
    });
  });
};

export default setupSocketEvents;
