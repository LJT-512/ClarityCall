import { roomIds } from "../controllers/breakoutroom.js";

export async function isMeetingValid(req, res, next) {
  const meetingId = req.query.meetingId;
  console.log(meetingId);
  if (meetingId) {
    const meetingIdLength = meetingId.toString().length;
    const isMeetingRoom = roomIds.includes(meetingId);

    if (isNaN(meetingId) && meetingIdLength !== 8) {
      if (!isMeetingRoom) {
        return next(new Error("Invalid meetingId. Should be 8 digit number."));
      }
    }
  }
  next();
}
