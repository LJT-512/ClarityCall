import {
  getAvgMeetingLengthPerWeekDay,
  getAvgMeetingStatsPerMonth,
  getMostFrequentContacts,
  getMeetingLogsDetails,
  getSubtitlesByMeeting,
} from "../models/meeting.js";

import { BASE_URL } from "../config/constants.js";

export async function getAggregatedInfo(req, res) {
  const userId = req.user.user_id;

  try {
    const avgMeetingLengthPerWeekDay = await getAvgMeetingLengthPerWeekDay(
      userId
    );
    const avgMeetingStatsPerMonth = await getAvgMeetingStatsPerMonth(userId);
    const mostFrequentContacts = await getMostFrequentContacts(userId);

    res.status(200).json({
      avgMeetingLengthPerWeekDay,
      avgMeetingStatsPerMonth,
      mostFrequentContacts,
    });
  } catch (err) {
    console.error("Error getting aggregated meeting info:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMeetingLogs(req, res) {
  const userId = req.user.user_id;

  try {
    const meetingLogs = await getMeetingLogsDetails(userId);

    meetingLogs.forEach((meetingLog) => {
      const subtitleLink = `${BASE_URL}/api/meetings/subtitles/?meetingId=${meetingLog.meetingId}`;
      const summaryLink = `${BASE_URL}/api/meetings/summary/?meetingId=${meetingLog.meetingId}`;
      meetingLog.subtitleLink = subtitleLink;
      meetingLog.summaryLink = summaryLink;
    });
    res.status(200).json({ meetingLogs });
  } catch (err) {
    console.error("Error getting meeting stats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMeetingSubtitles(req, res) {
  const meetingId = req.query.meetingId;

  try {
    const meetingSubtitles = await getSubtitlesByMeeting(meetingId);
    res.status(200).json({ meetingSubtitles });
  } catch (err) {
    console.error("Error getting meeting subtitles:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
