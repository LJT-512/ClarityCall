import axios from "axios";
import { getSubtitlesByMeeting, addSummary } from "../models/meeting.js";

export async function generateMeetingSummary(meetingId) {
  const subtitles = await getSubtitlesByMeeting(meetingId);
  if (subtitles.length > 0) {
    const prompt = subtitles
      .map((s) => `${s.username}: ${s.subtitle}`)
      .join("\n");
    const fullPrompt = `Summarize the following meeting conversation in less than 100 words:\n\n${prompt}`;

    const data = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a participant in a meeting, please make a summary below 100 words.",
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
      return summary;
    } catch (err) {
      console.error("Error generating summary:", err);
    }
  } else {
    return "No subtitles were available to generate a summary.";
  }
}
