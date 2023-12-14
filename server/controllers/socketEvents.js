import {
  createMeeting,
  checkMeeting,
  createConnection,
  userLeaveMeeting,
  addChat,
  endMeeting,
  updateParentMeeting,
  updateMeetingStartAt,
  isMeetingFinished,
  hasOngoingRoomMeeting,
} from "../models/meeting.js";

import {
  generateMeetingSummary,
  storeMeetingSummary,
} from "../utils/summary.js";

import { userMeetingRooms } from "./breakoutroom.js";

export let userConnections = [];

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

      let parentMeetingId = null;

      try {
        // const isBreakoutRoom = data.meetingId.length !== 8;

        // if (!isBreakoutRoom) {
        const meetingExists = await checkMeeting(data.meetingId);

        if (!meetingExists) {
          await createMeeting(data.meetingId, data.userId);
        } else if (
          (await isMeetingFinished(data.meetingId)) &&
          !hasOngoingRoomMeeting(data.meetingExists)
        ) {
          console.log(`About to update ${data.meetingId} start time `);
          await updateMeetingStartAt(data.meetingId);
        }
        // } else {
        // await createMeeting(data.meetingId, data.userId);
        // for (const [meetingId, details] of Object.entries(userMeetingRooms)) {
        //   const roomFound = details.rooms.some((room) =>
        //     room.some((user) => user.roomId === data.meetingId)
        //   );
        //   if (roomFound) {
        //     parentMeetingId = meetingId;
        //     break;
        //   }
        // }
        // if (parentMeetingId) {
        //   await updateParentMeeting(data.meetingId, parentMeetingId);
        // } else {
        //   throw new Error("Parent meeting ID not found for breakout room");
        // }
        // }
        await createConnection(data.meetingId, data.userId, socket.id);
      } catch (err) {
        console.error("Error handling user connection:", err);
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

        const usersInMeeting = userConnections.filter(
          (p) => p.meetingId === meetingId
        );
        const userCount = usersInMeeting.length;
        console.log("User count after disconnect", userCount);

        if (userCount === 0 && !(await hasOngoingRoomMeeting(meetingId))) {
          try {
            console.log(
              `Ending meeting ${meetingId} as there are no more participants.`
            );
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
