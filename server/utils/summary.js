import axios from "axios";
import { getSubtitlesByMeeting, addSummary } from "../models/meeting.js";

export async function generateMeetingSummary(meetingId) {
  const subtitles = await getSubtitlesByMeeting(meetingId);

  const prompt = subtitles
    .map((s) => `${s.username}: ${s.subtitle}`)
    .join("\n");
  const fullPrompt = `Summarize the following meeting conversation in less than 300 words:\n\n${prompt}`;

  const data = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a participant in a meeting, please make a summary below 300 words.",
      },
      {
        role: "user",
        content: fullPrompt,
      },
    ],
  };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      data,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const summary = response.data.choices[0].message.content;
    console.log("summary from openai", summary);
    await storeMeetingSummary(meetingId, summary);
  } catch (err) {
    console.error("Error generating summary:", err);
  }
}

async function storeMeetingSummary(meetingId, summary) {
  try {
    await addSummary(meetingId, summary);
  } catch (err) {
    console.error("Failed to store meeting summary", err);
  }
}
