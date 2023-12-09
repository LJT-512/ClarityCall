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

export async function endMeeting(meetingId) {
  const result = await pool.query(
    `
        UPDATE meetings
        SET end_at = NOW()
        WHERE meeting_id = $1 AND end_at IS NULL
        RETURNING *
        `,
    [meetingId]
  );

  return result.rowCount > 0 ? result.rows[0] : null;
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

export async function addSummary(meetingId, summary) {
  const result = await pool.query(
    `
    UPDATE meetings
    SET summary = $2
    WHERE meeting_id = $1
    `,
    [meetingId, summary]
  );
  return result.rowCount;
}

export async function getAvgMeetingLengthPerWeekDay(userId) {
  const result = await pool.query(
    `SELECT EXTRACT(DOW FROM m.start_at) AS day_of_week, 
                AVG(EXTRACT(EPOCH FROM (COALESCE(m.end_at, NOW()) - m.start_at)) / 60) AS average_length_minutes
         FROM meetings m
         JOIN meeting_participants mp ON m.meeting_id = mp.meeting_id
         WHERE mp.user_id = $1
         GROUP BY day_of_week
         ORDER BY day_of_week;`,
    [userId]
  );
  return result.rows;
}

export async function getAvgMeetingStatsPerMonth(userId) {
  const result = await pool.query(
    `SELECT EXTRACT(MONTH FROM m.start_at) AS month,
    COUNT(DISTINCT m.meeting_id) AS total_meetings,
    AVG(EXTRACT(EPOCH FROM (COALESCE(m.end_at, NOW()) - m.start_at)) / 60) AS average_length_minutes
         FROM meetings m
         JOIN meeting_participants mp ON m.meeting_id = mp.meeting_id
         WHERE mp.user_id = $1
         GROUP BY month
         ORDER BY month;`,
    [userId]
  );
  return result.rows;
}

export async function getMostFrequentContacts(userId) {
  const result = await pool.query(
    `SELECT u.user_id, u.name, COUNT(DISTINCT mp.meeting_id) AS meeting_count
         FROM meeting_participants mp
         JOIN users u ON mp.user_id = u.user_id
         WHERE mp.meeting_id IN (
             SELECT meeting_id FROM meeting_participants WHERE user_id = $1
         )
         AND mp.user_id != $1
         GROUP BY u.user_id, u.name
         ORDER BY meeting_count DESC
         LIMIT 3;`,
    [userId]
  );
  return result.rows;
}

export async function getMeetingLogsDetails(userId) {
  const result = await pool.query(
    `
        SELECT 
        m.meeting_id,
        m.start_at AS "startAt",
        COALESCE(m.end_at, NOW()) AS "endAt",
        ROUND(EXTRACT(EPOCH FROM (COALESCE(m.end_at, NOW()) - m.start_at)) / 60) AS "duration",
        ARRAY_AGG(DISTINCT u.name) FILTER (WHERE mp.user_id != $1) AS participants
     FROM meetings m
     JOIN meeting_participants mp ON m.meeting_id = mp.meeting_id
     JOIN users u ON mp.user_id = u.user_id
     WHERE m.meeting_id IN (
       SELECT DISTINCT meeting_id FROM meeting_participants WHERE user_id = $1
     )
     GROUP BY m.meeting_id, m.start_at, m.end_at
     ORDER BY m.start_at DESC;
        `,
    [userId]
  );

  const meetingLogs = result.rows.map((row) => ({
    meetingId: row.meeting_id,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    duration: `${row.duration} minutes`,
    participants: row.participants,
  }));

  return meetingLogs;
}

export async function getSubtitlesByMeeting(meetingId) {
  const result = await pool.query(
    `
        SELECT s.text AS subtitle, u.name AS username , s.timestamp  
        FROM subtitles s
        JOIN users u ON s.user_id = u.user_id
        WHERE meeting_id = $1
        ORDER BY s.timestamp;
        `,
    [meetingId]
  );

  return result.rows.map((row) => {
    return {
      username: row.username,
      time: row.timestamp.toISOString(),
      subtitle: row.subtitle,
    };
  });
}
