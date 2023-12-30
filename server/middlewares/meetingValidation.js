import { roomIds } from "../controllers/breakoutroom.js";

export async function isMeetingValid(req, res, next) {
  const meetingId = req.query.meetingId;
  if (
    !meetingId ||
    (isNaN(meetingId) &&
      meetingId.toString().length !== 8 &&
      !roomIds.includes(meetingId))
  ) {
    return res.redirect("/action");
  }

  next();
}
