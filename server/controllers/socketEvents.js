import {
  createMeeting,
  checkMeeting,
  createConnection,
  userLeaveMeeting,
  addChat,
  endMeeting,
  updateMeetingStartAt,
  isMeetingFinished,
  hasOngoingRoomMeeting,
} from "../models/meeting.js";

import {
  generateMeetingSummary,
  storeMeetingSummary,
} from "../utils/summary.js";

export let userConnections = [];

const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
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

      let parentMeetingId = null;

      try {
        const meetingExists = await checkMeeting(data.meetingId);

        if (!meetingExists) {
          await createMeeting(data.meetingId, data.userId);
        } else if (
          (await isMeetingFinished(data.meetingId)) &&
          !hasOngoingRoomMeeting(data.meetingExists)
        ) {
          await updateMeetingStartAt(data.meetingId);
        }
        await createConnection(data.meetingId, data.userId, socket.id);
      } catch (err) {
        console.error("Error handling user connection:", err);
      }

      console.log("userConnections: ", userConnections);

      const userCount = otherUsers.length + 1;

      otherUsers.forEach((v) => {
        socket.to(v.connectionId).emit("informOthersAboutMe", {
          otherUserId: data.displayName,
          userId: data.userId,
          connId: socket.id,
          userNumber: userCount,
        });
      });
      socket.emit("informMeAboutOtherUser", otherUsers);
    });
    socket.on("SDPProcess", (data) => {
      socket.to(data.toConnId).emit("SDPProcess", {
        message: data.message,
        fromConnId: socket.id,
      });
    });

    socket.on("userVideoToggle", (data) => {
      const { connId, status } = data;
      // eslint-disable-next-line prefer-destructuring
      const meetingId = userConnections.find((u) => u.connectionId === connId)
        .meetingId;

      const list = userConnections.filter((p) => p.meetingId === meetingId);
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
      const { startX, startY, endX, endY, mode, myConnectionId } = data;
      const meetingId = userConnections.find(
        (u) => u.connectionId === myConnectionId
      ).meetingId;
      const list = userConnections.filter((u) => u.meetingId === meetingId);
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
      const { myConnectionId } = data;
      const meetingId = userConnections.find(
        (u) => u.connectionId === myConnectionId
      ).meetingId;
      const list = userConnections.filter((u) => u.meetingId === meetingId);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("clearCanvas", {
          fromConnId: myConnectionId,
        });
      });
    });

    socket.on("sendMessage", async (msg) => {
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
      const disUser = userConnections.find((p) => p.connectionId === socket.id);
      if (disUser) {
        const { meetingId } = disUser;
        userConnections = userConnections.filter(
          (p) => p.connectionId !== socket.id
        );

        const usersInMeeting = userConnections.filter(
          (p) => p.meetingId === meetingId
        );
        const userCount = usersInMeeting.length;

        if (userCount === 0 && !(await hasOngoingRoomMeeting(meetingId))) {
          try {
            await endMeeting(meetingId);
            const summary = await generateMeetingSummary(meetingId);
            if (summary) {
              await storeMeetingSummary(meetingId, summary);
            }
          } catch (err) {
            console.error("Error ending meeting:", err);
          }
        }

        if (userCount > 0) {
          usersInMeeting.forEach((v) => {
            socket.to(v.connectionId).emit("informOtherAboutDisconnectedUser", {
              connId: socket.id,
              userWhoLeft: disUser.username,
              uNumber: userCount,
            });
          });
        }
        userLeaveMeeting(meetingId, disUser.userId);
      }
    });
  });
};

export default setupSocketEvents;
