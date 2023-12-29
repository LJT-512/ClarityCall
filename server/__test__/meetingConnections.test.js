import {
  setupSocketEvents,
  userConnections,
} from "../controllers/socketEvents.js";

jest.mock("../models/meeting.js");

describe("socketEvents", () => {
  let socket;
  let io;

  beforeEach(() => {
    socket = {
      id: "socket1",
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    io = {
      on: jest.fn().mockImplementation((_event, callback) => callback(socket)),
    };
    userConnections.length = 0;
  });

  test("userconnect should add user to userConnections", () => {
    // Arrange
    const userData = {
      userId: "user1",
      meetingId: "meeting1",
      displayName: "Test User",
    };
    socket.on.mockImplementation((event, callback) => {
      if (event === "userconnect") {
        callback(userData);
      }
    });

    // Act
    setupSocketEvents(io);

    // Assert
    expect(userConnections).toContainEqual({
      connectionId: socket.id,
      userId: userData.userId,
      meetingId: userData.meetingId,
      username: userData.displayName,
    });
  });
});
