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
  addSummary,
} from "../models/meeting.js";

import { generateMeetingSummary } from "../utils/summary.js";

export let userConnections = [];

const filterConnectionsByMeetingId = (meetingId) => {
  return userConnections.filter((p) => p.meetingId === meetingId);
};

const getConnectionByConnId = (connId) => {
  return userConnections.find((p) => p.connectionId === connId);
};

export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    const emitToConnections = (connections, event, data) => {
      connections.forEach((connection) =>
        socket.to(connection.connectionId).emit(event, data)
      );
    };

    socket.on("userconnect", async (data) => {
      const { displayName, userId, meetingId } = data;

      const otherUsers = filterConnectionsByMeetingId(meetingId);
      console.log("otherUsers: ", otherUsers);

      userConnections.push({
        connectionId: socket.id,
        username: displayName,
        userId: userId,
        meetingId: meetingId,
      });

      try {
        const meetingExists = await checkMeeting(meetingId);

        if (!meetingExists) {
          await createMeeting(meetingId, userId);
        } else if (
          (await isMeetingFinished(meetingId)) &&
          !(await hasOngoingRoomMeeting(meetingExists))
        ) {
          await updateMeetingStartAt(meetingId);
        }
        await createConnection(meetingId, userId, socket.id);
      } catch (err) {
        console.error("Error handling user connection:", err);
      }

      console.log("userConnections: ", userConnections);

      emitToConnections(otherUsers, "informOthersAboutMe", {
        otherUserName: displayName,
        userId: userId,
        connId: socket.id,
        userNumber: otherUsers.length + 1,
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
      const meetingId = getConnectionByConnId(connId)?.meetingId;
      if (meetingId) {
        const list = filterConnectionsByMeetingId(meetingId);
        emitToConnections(list, "updateUserVideo", {
          connId,
          status,
        });
      }
    });

    socket.on("shareScreen", (connId) => {
      const meetingId = getConnectionByConnId(connId)?.meetingId;
      if (meetingId) {
        const list = filterConnectionsByMeetingId(meetingId);
        emitToConnections(list, "flipVideo", {
          from: connId,
        });
      }
    });

    socket.on("drawCanvas", (data) => {
      const { startX, startY, endX, endY, mode, myConnectionId } = data;
      const meetingId = getConnectionByConnId(myConnectionId)?.meetingId;
      if (meetingId) {
        const list = userConnections.filter((u) => u.meetingId === meetingId);
        emitToConnections(list, "updateCanvasDrawing", {
          startX,
          startY,
          endX,
          endY,
          mode,
          fromConnId: myConnectionId,
        });
      }
    });

    socket.on("drawerTurnsOffCanvas", (data) => {
      const { myConnectionId } = data;
      const meetingId = getConnectionByConnId(myConnectionId)?.meetingId;
      if (meetingId) {
        const list = userConnections.filter((u) => u.meetingId === meetingId);
        emitToConnections(list, "clearCanvas", {
          fromConnId: myConnectionId,
        });
      }
    });

    socket.on("sendMessage", async (msg) => {
      const user = getConnectionByConnId(socket.id);

      if (user) {
        const { meetingId, userId, username } = user;
        const list = filterConnectionsByMeetingId(meetingId);
        emitToConnections(list, "showChatMessage", {
          from: username,
          message: msg,
        });
        try {
          await addChat(meetingId, userId, socket.id, msg);
        } catch (err) {
          console.error("Error adding chat:", err);
        }
      }
    });

    socket.on("disconnect", async () => {
      const disUser = getConnectionByConnId(socket.id);
      if (disUser) {
        const { meetingId } = disUser;
        userConnections = userConnections.filter(
          (p) => p.connectionId !== socket.id
        );

        const usersInMeeting = filterConnectionsByMeetingId(meetingId);
        const userCount = usersInMeeting.length;

        if (userCount === 0 && !(await hasOngoingRoomMeeting(meetingId))) {
          try {
            await endMeeting(meetingId);
            const summary = await generateMeetingSummary(meetingId);
            if (summary) {
              await addSummary(meetingId, summary);
            }
          } catch (err) {
            console.error("Error ending meeting:", err);
          }
        }

        if (userCount > 0) {
          emitToConnections(
            usersInMeeting,
            "informOtherAboutDisconnectedUser",
            {
              connId: socket.id,
              userWhoLeft: disUser.username,
              uNumber: userCount,
            }
          );
        }
        userLeaveMeeting(meetingId, disUser.userId);
      }
    });
  });
};

export default setupSocketEvents;
