import { userConnections } from "./socketEvents.js";
import { getIO } from "../io.js";
import {
  createMeeting,
  checkMeeting,
  updateParentMeeting,
} from "../models/meeting.js";

export let userMeetingRooms = {};
export let roomIds = [];

function handleBreakoutSession(meetingId, callback) {
  const io = getIO();
  console.log("Handling breakout session for meetingId:", meetingId);
  const breakoutInfo = userMeetingRooms[meetingId];
  if (breakoutInfo) {
    breakoutInfo.rooms.forEach((roomUsers) => {
      roomUsers.forEach((user) => {
        const currentConnections = userConnections.find(
          (u) => u.userId === user.userId
        );
        if (currentConnections) {
          callback(io, currentConnections, meetingId);
        }
      });
    });
  }
}

function notifyToast(meetingId) {
  handleBreakoutSession(meetingId, (io, currentConnections, meetingId) => {
    io.to(currentConnections.connectionId).emit("5sBeforeEndNotice", {
      meetingId,
    });
  });
}

function endBreakoutSession(meetingId) {
  handleBreakoutSession(meetingId, (io, currentConnections, meetingId) => {
    io.to(currentConnections.connectionId).emit("informBackToOriginalMeeting", {
      meetingId,
    });
  });
  delete userMeetingRooms[meetingId];
}

/* eslint-disable consistent-return */
export async function breakoutRooms(req, res) {
  const io = getIO();
  const { meetingId, numOfRoom, setTime } = req.body;
  const rooms = [];
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

  for (let i = 0; i < numOfRoom; i += 1) {
    const roomUsers = usersInThisMeeting.slice(
      i * sliceIndex,
      (i + 1) * sliceIndex
    );
    const roomId = Math.random().toString(36).substring(2, 12);
    roomIds.push(roomId);
    rooms.push({
      roomUsers: roomUsers.map((u) => ({
        roomId,
        username: u.username,
        userId: u.userId,
        connId: u.connectionId,
      })),
    });

    console.log(
      "in breakoutRoom controllers",
      roomId,
      usersInThisMeeting[0].userId
    );
    if (!(await checkMeeting(roomId, usersInThisMeeting[0].userId))) {
      await createMeeting(roomId, usersInThisMeeting[0].userId);
      await updateParentMeeting(roomId, meetingId);
    }
  }

  console.log(
    `!!!!!!!!there are ${rooms} for this breakoutroom session!!!!!!!!!`
  );
  userMeetingRooms[meetingId] = {
    setTime,
    rooms: rooms.map((room) => room.roomUsers),
  };

  console.log("userMeetingRooms: ", userMeetingRooms);

  setTimeout(() => {
    notifyToast(meetingId);
  }, (setTime - 5) * 1000);
  setTimeout(() => {
    endBreakoutSession(meetingId);
  }, setTime * 1000);

  res.status(200).json({ success: true, message: rooms });
  console.log("rooms: ", rooms);
  rooms.forEach((room) => {
    room.roomUsers.forEach((user) => {
      console.log("About to emit informAboutBreakRooms!!!!");
      console.log(user.roomId, user.connId, user.username, user.userId);
      io.to(user.connId).emit("informAboutBreakRooms", {
        roomId: user.roomId,
        connId: user.connId,
        username: user.username,
      });
    });
  });
}
/* eslint-enable consistent-return */
