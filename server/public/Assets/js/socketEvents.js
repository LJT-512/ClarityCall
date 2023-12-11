import {
  initRTCConnection,
  setConnection,
  SDPProcess,
  closeConnectionCall,
  myConnectionId,
} from "./RTCConnection.js";
import { addUser, adjustUserBoxSize } from "./uiHandler.js";

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
    console.log(
      `${connId} in onCameraToggle, this is who turns on or off the camera`
    );
    socket.emit("userVideoToggle", { connId, status });
  }

  if (socket.connected) {
    initRTCConnection(SDPFunction, socket.id, (status) =>
      onCameraToggle(status, socket.id)
    );
  } else {
    socket.on("connect", () => {
      initRTCConnection(SDPFunction, socket.id, (status) =>
        onCameraToggle(status, socket.id)
      );
    });
  }

  socket.on("informOthersAboutMe", async function (data) {
    addUser(data.otherUserId, data.connId, data.userNumber);
    adjustUserBoxSize(data.userNumber);
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
        adjustUserBoxSize(userNumber);
        try {
          await setConnection(otherUsers[i].connectionId);
        } catch (err) {
          console.error("Error setting connection:", err);
          si;
        }
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("socket is disconnected.", reason);
    socket.connect();
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

  socket.on("flipVideo", (data) => {
    const userVideoToFlipped = document.getElementById(`v_${data.from}`);
    userVideoToFlipped.style.setProperty("transform", "none", "important");
    userVideoToFlipped.style.setProperty(
      "-webkit-transform",
      "none",
      "important"
    );
    userVideoToFlipped.style.setProperty("-moz-transform", "none", "important");
  });

  socket.on("updateCanvasDrawing", (data) => {
    console.log("client side got updateCanvasDrawing event!!!!!");
    const { startX, startY, endX, endY, mode, fromConnId } = data;
    console.log("coordinates:", startX, startY, endX, endY);
    const mainCanvas = document.getElementById(`mc_${fromConnId}`);
    const mainCtx = mainCanvas.getContext("2d");
    const drawingCanvas = document.getElementById(`dc_${fromConnId}`);
    const drawingCtx = drawingCanvas.getContext("2d");
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

  socket.on("clearCanvas", (data) => {
    const { fromConnId } = data;
    console.log("in clearCanvas, the fromConnId is......", fromConnId);
    const mainCanvas = document.getElementById(`mc_${fromConnId}`);
    const mainCtx = mainCanvas.getContext("2d");
    const drawingCanvas = document.getElementById(`dc_${fromConnId}`);
    const drawingCtx = drawingCanvas.getContext("2d");
    drawingCtx.clearRect(0, 0, drawingCanvas.width, mainCanvas.height);
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  });

  socket.on("newSubtitle", (data) => {
    console.log("Received subtitle:", data.subtitleContent);
    const time = new Date();
    const lTime = time.toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    const div = document.createElement("div");
    if (data.speakerId === myConnectionId) {
      div.classList.add("subtitle-message");
      div.classList.add("subtitle-from-me");
      div.innerHTML = `<div><span class="font-weight-bold" style="color: black;">Me</span> ${lTime}</br>${data.subtitleContent}</div>`;
    } else {
      div.classList.add("chat-message");
      div.classList.add("subtitle-from-others");
      div.innerHTML = `<div><span class="font-weight-bold" style="color: black;">${data.speakerName}</span> ${lTime}</br>${data.subtitleContent}</div>`;
    }

    const subtitleDiv = document.getElementById("real-time-subtitles");
    subtitleDiv.appendChild(div);
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
    console.log("in showChatMessage the username is ", username);
    console.log("in showChatMessage the data is", data);
    const time = new Date();
    const lTime = time.toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    const div = document.createElement("div");
    div.classList.add("chat-message");
    if (data.from === username) {
      console.log(
        `this is data from:  ${data.from} and this is username: ${username}`
      );
      div.classList.add("message-from-me");
      div.innerHTML = `<div><span class="font-weight-bold" style="color: black;">You</span> ${lTime}</br>${data.message}</div>`;
    } else {
      div.classList.add("message-from-others");
      div.innerHTML = `<div><span class="font-weight-bold" style="color: black;">${data.from}</span> ${lTime}</br>${data.message}</div>`;
    }

    const messagesDiv = document.getElementById("messages");
    messagesDiv.appendChild(div);

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
};

export const eventHandling = (username) => {
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
      div.classList.add("chat-message");
      div.classList.add("message-from-me");
      div.innerHTML = `<div><span class="font-weight-bold" style="color: black;">Me</span> ${lTime}</br>${messageContent}</div>`;

      const messagesDiv = document.getElementById("messages");
      messagesDiv.appendChild(div);

      document.getElementById("msgbox").value = "";
    }
  });

  const url = window.location.href;
  const meetinUrl = document.querySelector(".meeting_url");
  const copyInfo = document.querySelector(".copy_info");
  meetinUrl.textContent = url;
  copyInfo.addEventListener("click", copyJoiningInfo);
};

function copyJoiningInfo() {
  console.log("copyJoiningInfo is running");
  const meetinUrl = document.querySelector(".meeting_url");
  const linkConf = document.querySelector(".link-conf");
  const tempInput = document.createElement("input");
  document.body.appendChild(tempInput);
  tempInput.value = meetinUrl.textContent;
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  linkConf.style.display = "inline";
  setTimeout(() => {
    linkConf.style.display = "none";
  }, 3000);
}
