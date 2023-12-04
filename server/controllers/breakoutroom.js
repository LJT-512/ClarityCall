import { userConnections, userMeetingRooms } from "./socketEvents.js";
import { getIO } from "../io.js";

function endBreakoutSession(meetingId) {
  const io = getIO();
  console.log("===============Breakoutroom session is ending ==========");
  const breakoutInfo = userMeetingRooms[meetingId];
  console.log("userMeetingId", userMeetingRooms[meetingId]);
  // console.log("userMeetingUsers", userMeetingRooms.rooms.roomUsers);
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
  const roomIds = [];

  for (let i = 0; i < numOfRoom; i += 1) {
    const roomUsers = usersInThisMeeting.slice(
      i * sliceIndex,
      (i + 1) * sliceIndex
    );
    const roomId = Math.random().toString(36).substring(2, 12);
    roomIds.push({ roomId });
    rooms.push({
      roomUsers: roomUsers.map((u) => ({
        roomId,
        username: u.username,
        userId: u.userId,
        connId: u.connectionId,
      })),
    });
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
    endBreakoutSession(meetingId);
  }, setTime * 1000); // setTime in seconds

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
