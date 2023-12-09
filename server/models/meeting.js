import pool from "./databasePool.js";

export async function createMeeting(meetingId, userId) {
  const startAt = new Date();
  const result = await pool.query(
    `
        INSERT INTO meetings (meeting_id, host_user_id, start_at)
        VALUES ($1, $2, $3)
        RETURNING meeting_id
        `,
    [meetingId, userId, startAt]
  );
  return result.rows[0];
}

export async function checkMeeting(meetingId) {
  const result = await pool.query(
    `
        SELECT * FROM meetings
        WHERE meeting_id = $1
        `,
    [meetingId]
  );
  return result.rowCount > 0 ? true : false;
}

export async function createConnection(meetingId, userId, connectionId) {
  const joinAt = new Date();
  const result = await pool.query(
    `
        INSERT INTO meeting_participants (meeting_id, user_id, connection_id, join_at)
        VALUES ($1, $2, $3, $4)
        RETURNING meeting_participants_id
        `,
    [meetingId, userId, connectionId, joinAt]
  );
  return result.rows[0];
}

export async function userLeaveMeeting(meetingId, userId) {
  const leaveAt = new Date();
  const result = await pool.query(
    `
        UPDATE meeting_participants
        SET leave_at = $1
        WHERE meeting_id = $2 AND user_id = $3 AND leave_at IS NULL
        `,
    [leaveAt, meetingId, userId]
  );
  return result.rowCount;
}

export async function addChat(meetingId, userId, connectionId, text) {
  const timestamp = new Date();
  const result = await pool.query(
    `
        INSERT INTO chats (meeting_id, user_id, connection_id, text, timestamp)
        VALUES ($1, $2, $3, $4, $5)
        `,
    [meetingId, userId, connectionId, text, timestamp]
  );
  return result.rowCount;
}

export async function addSubtitle(meetingId, userId, connectionId, text) {
  const timestamp = new Date();
  const result = await pool.query(
    `
        INSERT INTO subtitles (meeting_id, user_id, connection_id, text, timestamp)
        VALUES ($1, $2, $3, $4, $5)
        `,
    [meetingId, userId, connectionId, text, timestamp]
  );
  return result.rowCount;
}
