import {
  initRTCConnection,
  setConnection,
  SDPProcess,
  closeConnectionCall,
} from "./RTCConnection.js";
import { myConnectionId } from "./RTCConnection.js";
import { addUser } from "./uiHandler.js";
import { drawPath } from "./media.js";

export const eventProcessForSignalingServer = (socket, username, meetingId) => {
  const SDPFunction = function (data, toConnId) {
    console.log("========== SDPFunction being called ==========");
    socket.emit("SDPProcess", {
      message: data,
      toConnId: toConnId,
    });
    console.log("After emitting SPDProcess...");
  };

  function onCameraToggle(status, connId) {
    console.log("onCameraToggle is being called!");
    socket.emit("userVideoToggle", { connId, status });
  }

  socket.on("connect", () => {
    if (socket.connected) {
      initRTCConnection(SDPFunction, socket.id, (status) =>
        onCameraToggle(status, socket.id)
      );
      console.log("in eventProcessForSignalingServer meetingId", meetingId);
      if (username != "" && meetingId != "") {
        socket.emit("userconnect", {
          displayName: username,
          meetingId,
        });
      }
    }
  });

  socket.on("informOthersAboutMe", async function (data) {
    addUser(data.otherUserId, data.connId), data.userNumber;
    console.log("informOthersAboutMe connId: ", data.connId);
    try {
      await setConnection(data.connId);
    } catch (err) {
      console.error("Error setting connection:", err);
    }
  });

  socket.on("informMeAboutOtherUser", async function (otherUsers) {
    const userNumberWithoutMe = otherUsers.length;
    const userNumber = userNumberWithoutMe + 1;
    if (otherUsers) {
      for (let i = 0; i < otherUsers.length; i++) {
        console.log("who are the others:", otherUsers[i]);
        addUser(otherUsers[i].username, otherUsers[i].connectionId, userNumber);
        try {
          await setConnection(otherUsers[i].connectionId);
        } catch (err) {
          console.error("Error setting connection:", err);
        }
      }
    }
  });

  socket.on("informOtherAboutDisconnectedUser", async function (data) {
    document.getElementById(`${data.connId}`).remove();
    const participantCount = document.querySelector(".participant-count");
    participantCount.textContent = data.uNumber;
    document.getElementById(`participant-${data.connId}`).remove();
    try {
      await closeConnectionCall(data.connId);
    } catch (err) {
      console.error("Error setting connection:", err);
    }
  });

  socket.on("SDPProcess", async function (data) {
    console.log(
      `Received SDPProcess message, toConnId: ${data.toConnId}, fromConnId: ${socket.id}`
    );
    try {
      await SDPProcess(data.message, data.fromConnId);
    } catch (err) {
      console.error("Error setting connection:", err);
    }
  });

  socket.on("updateUserVideo", (data) => {
    console.log("client got the updateUserVideo event!!!!");
    const { connId, status } = data;
    const userVideoToRemoved = document.getElementById(`v_${connId}`);

    if (userVideoToRemoved && status === "off") {
      userVideoToRemoved.srcObject = null;
    }
  });

  socket.on("updateCanvasDrawing", (data) => {
    console.log("client side got updateCanvasDrawing event!!!!!");
    const { startX, startY, endX, endY, mode, fromConnId } = data;
    console.log("coordinates:", startX, startY, endX, endY);
    const mainCanvas = document.getElementById(`mc_${fromConnId}`);
    const mainCtx = mainCanvas.getContext("2d");
    const drawingCanvas = document.getElementById(`dc_${fromConnId}`);
    const drawingCtx = drawingCanvas.getContext("2d");
    // drawPath(startX, startY, endX, endY, mode);
    const eraserThickness = 10;
    if (mode === "drawing") {
      drawingCtx.beginPath();
      drawingCtx.moveTo(startX, startY);
      drawingCtx.lineTo(endX, endY);
      drawingCtx.strokeStyle = "blue";
      drawingCtx.lineWidth = 3;
      drawingCtx.stroke();
    } else if (mode === "erasing") {
      drawingCtx.globalCompositeOperation = "destination-out";
      drawingCtx.arc(startX, startY, eraserThickness, 0, Math.PI * 2, false);
      drawingCtx.fill();

      drawingCtx.globalCompositeOperation = "source-over";
    } else {
      return;
    }
  });

  socket.on("informCanvasClear", (data) => {
    console.log(
      "client side got informCanvasClear event to clear canvas: ",
      data.fromConnId
    );
    const mainCanvasId = `mc_${data.fromConnId}`;
    const drawingCanvasId = `dc_${data.fromConnId}`;

    const mainCanvas = document.getElementById(mainCanvasId);
    const drawingCanvas = document.getElementById(drawingCanvasId);

    if (mainCanvas && drawingCanvas) {
      const mainCtx = mainCanvas.getContext("2d");
      const drawingCtx = drawingCanvas.getContext("2d");

      mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    } else {
      console.error(
        `One of the canvas elements was not found: mainCanvasId: ${mainCanvasId}, drawingCanvasId: ${drawingCanvasId}`
      );
    }
  });

  socket.on("newSubtitle", (data) => {
    console.log("Received subtitle:", data.subtitle);
    const userDivId = data.speakerId === myConnectionId ? "me" : data.speakerId;
    console.log("which user is speaking: ", userDivId);
    const userDiv = document.getElementById(userDivId);
    if (userDiv) {
      const subtitleDiv = userDiv.querySelector(".subtitle");

      if (data.subtitle) {
        subtitleDiv.innerHTML = `<p>${data.subtitle}</p>`;
      }
    }
  });

  socket.on("informAboutBreakRooms", (data) => {
    console.log("informAboutBreakRooms is running!!!!!");
    console.error(`Breakout room is about to start ${data.roomId}`);
    window.location.href = `/?meetingID=${data.roomId}`;
  });

  socket.on("informBackToOriginalMeeting", (data) => {
    console.log("got informBackToOriginalMeeting");
    window.location.href = `/?meetingID=${data.meetingId}`;
  });

  socket.on("showChatMessage", (data) => {
    const time = new Date();
    const lTime = time.toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    const div = document.createElement("div");
    div.innerHTML = `<sapn class="font-weight-bold mr-3" style="color: black;">${data.from}</span>${lTime}</br>${data.message}`;
    const messagesDiv = document.getElementById("messages");
    messagesDiv.appendChild(div);
  });
};

export const eventHandling = () => {
  const sendBtn = document.getElementById("btnsend");
  sendBtn.addEventListener("click", () => {
    const messageContent = document.getElementById("msgbox").value;
    if (messageContent.trim()) {
      socket.emit("sendMessage", messageContent);
      const time = new Date();
      const lTime = time.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
      const div = document.createElement("div");
      div.innerHTML = `<sapn class="font-weight-bold mr-3" style="color: black;">${username}</span>${lTime}</br>${messageContent}`;
      const messagesDiv = document.getElementById("messages");
      messagesDiv.appendChild(div);

      document.getElementById("msgbox").value = "";
    }
  });
};
