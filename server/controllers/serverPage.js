import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function serveActionPage(_req, res) {
  res.sendFile(join(__dirname, "../public/action.html"));
}

export async function serveMeetingHistoryPage(_req, res) {
  res.sendFile(join(__dirname, "../public/meetinghistory.html"));
}

export async function serveMeetingPage(_req, res) {
  res.sendFile(join(__dirname, "../public/main.html"));
}

export async function serveSigninPage(_req, res) {
  res.sendFile(join(__dirname + "../public/signin.html"));
}
