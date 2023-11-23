export let userConnections = [];
export const userMeetingRooms = {};

const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log("socket id is", socket.id);
    socket.on("userconnect", (data) => {
      console.log("userconnect", data.displayName, data.meetingId);

      const otherUsers = userConnections.filter(
        (p) => p.meetingId === data.meetingId
      );
      console.log("otherUsers: ", otherUsers);

      userConnections.push({
        connectionId: socket.id,
        userId: data.displayName,
        meetingId: data.meetingId,
      });

      console.log("userConnections: ", userConnections);

      otherUsers.forEach((v) => {
        socket.to(v.connectionId).emit("informOthersAboutMe", {
          otherUserId: data.displayName,
          connId: socket.id,
        });
      });
      console.log("Informing new user about others", otherUsers);
      socket.emit("informMeAboutOtherUser", otherUsers);
    });
    socket.on("SDPProcess", (data) => {
      socket.to(data.toConnId).emit("SDPProcess", {
        message: data.message,
        fromConnId: socket.id,
      });
    });

    socket.on("userVideoToggle", (data) => {
      console.log("userVideoToggle got the message");
      const { connId, status } = data;
      // eslint-disable-next-line prefer-destructuring
      const meetingId = userConnections.find(
        (u) => u.connId === userConnections.connectionId
      ).meetingId;

      console.log("camera status chaned: ", meetingId);
      const list = userConnections.filter((p) => p.meetingId === meetingId);
      console.log("the list to inform to disable the video is...", list);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("updateUserVideo", {
          connId,
          status,
        });
      });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected");
      const disUser = userConnections.find((p) => p.connectionId === socket.id);
      console.log("this is the disUser:", disUser);
      if (disUser) {
        const { meetingId } = disUser;
        console.log("this is the disUser meetingId:", meetingId);
        userConnections = userConnections.filter(
          (p) => p.connectionId !== socket.id
        );
        const list = userConnections.filter((p) => p.meetingId === meetingId);
        list.forEach((v) => {
          socket.to(v.connectionId).emit("informOtherAboutDisconnectedUser", {
            connId: socket.id,
          });
        });
      }
    });
  });
};

export default setupSocketEvents;
