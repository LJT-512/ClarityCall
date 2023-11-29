const AppProcess = (function () {
  let peersConnectionIds = [];
  let peersConnection = [];
  let remoteVidStream = [];
  let remoteAudStream = [];
  let localDiv;
  let serverProcess;
  let onCameraToggle;
  let audio;
  let isAudioMute = true;
  let rtpAudSenders = [];
  let videoStates = {
    none: 0,
    camera: 1,
    screenShare: 2,
    draw: 3,
  };
  let handLandmarker;
  let runningMode = "IMAGE";
  let isDrawing = false;
  let previousPosition = {
    x: -1,
    y: -1,
  };
  let webcamRunning = false;
  let videoSt = videoStates.none;
  let videoCamTrack;
  let rtpVidSenders = [];
  let recorder;
  let audioChunks = [];
  let isRecording = false;
  let intervalId;
  let mainCanvas;
  let mainCtx;
  let drawingCanvas;
  let drawingCtx;

  async function _init(SDPFunction, myConnId, cameraToggleCallback) {
    serverProcess = SDPFunction;
    myConnectionId = myConnId;
    onCameraToggle = cameraToggleCallback;
    eventProcess();
    localDiv = document.getElementById("localVideoPlayer");
    mainCanvas = document.getElementById("me-output-canvas");
    mainCtx = mainCanvas.getContext("2d");
    drawingCanvas = document.getElementById("me-drawing-canvas");
    drawingCtx = drawingCanvas.getContext("2d");
  }

  async function initializeHandTracking() {
    console.log("this is the beginning of handTracker function.......");
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    console.log("vision", vision);
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU",
      },
      runningMode: runningMode,
      numHands: 2,
    });

    console.log("handLandmarker in initializeHandTracking", handLandmarker);
  }

  function processHandLandmarks(landmarks) {
    console.log("processHandLandmarks is being called");
    const indexFingerTip = landmarks[8];
    console.log("indexFingerTip", indexFingerTip);
    const currentX = indexFingerTip.x * drawingCanvas.width;
    const currentY = indexFingerTip.y * drawingCanvas.height;

    if (indexFingerTip) {
      if (!isDrawing) {
        isDrawing = true;
        previousPosition = { x: currentX, y: currentY };
      } else {
        if (previousPosition.x !== -1 && previousPosition.y !== -1) {
          drawPath(previousPosition.x, previousPosition.y, currentX, currentY);
        }
        previousPosition = { x: currentX, y: currentY };
      }
    } else {
      isDrawing = false;
      previousPosition = { x: -1, y: -1 };
    }
  }

  function drawPath(startX, startY, endX, endY) {
    drawingCtx.beginPath();
    drawingCtx.moveTo(startX, startY);
    drawingCtx.lineTo(endX, endY);
    drawingCtx.strokeStyle = "blue";
    drawingCtx.lineWidth = 3;
    drawingCtx.stroke();
  }

  let lastVideoTime = -1;
  let detectionResults = undefined;

  let shouldUpdateCanvas = true;

  async function updateCanvas() {
    console.log("updateCanvas is running!");

    if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await handLandmarker.setOptions({ runningMode: "VIDEO" });
    }

    if (lastVideoTime != localDiv.currentTime) {
      lastVideoTime = localDiv.currentTime;
      const detectionResults = await handLandmarker.detectForVideo(
        localDiv,
        performance.now()
      );

      mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

      if (detectionResults.landmarks) {
        detectionResults.landmarks.forEach((landmarks) => {
          console.log("landmarks of detectionResults", landmarks);
          processHandLandmarks(landmarks);
          drawConnectors(mainCtx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 3,
          });
          drawLandmarks(mainCtx, landmarks, { color: "#FF0000", lineWidth: 2 });
        });
      }
    }

    mainCtx.drawImage(drawingCanvas, 0, 0);

    if (videoCamTrack) {
      window.requestAnimationFrame(updateCanvas);
    }
  }

  function eventProcess() {
    const micBtn = document.getElementById("micMuteUnmute");
    micBtn.addEventListener("click", async (e) => {
      if (!audio) {
        await loadAudio();
        startRecording();
      }
      if (!audio) {
        alert("Audio permission has not granted.");
        return;
      }
      if (isAudioMute) {
        audio.enabled = true;
        micBtn.innerHTML =
          '<span class="material-icons" style="width: 100%">mic</span>';
        updateMediaSenders(audio, rtpAudSenders);
        startRecording();
      } else {
        audio.enabled = false;
        micBtn.innerHTML =
          '<span class="material-icons" style="width: 100%">mic_off</span>';
        removeMediaSenders(rtpAudSenders);
        stopRecording();
      }
      isAudioMute = !isAudioMute;
    });
    const videoBtn = document.getElementById("videoCamOnOff");
    videoBtn.addEventListener("click", async (e) => {
      if (videoSt === videoStates.camera) {
        await videoProcess(videoStates.none);
      } else {
        await videoProcess(videoStates.camera);
      }
    });
    const screenShareBtn = document.getElementById("screenShareOnOff");
    screenShareBtn.addEventListener("click", async (e) => {
      if (videoSt === videoStates.screenShare) {
        await videoProcess(videoStates.none);
      } else {
        await videoProcess(videoStates.screenShare);
      }
    });
    const drawBtn = document.getElementById("drawOnOff");
    drawBtn.addEventListener("click", async (e) => {
      if (videoSt === videoStates.draw) {
        await videoProcess(videoStates.none);
      } else {
        await videoProcess(videoStates.draw);
      }
    });
  }

  async function loadAudio() {
    try {
      let aStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      audio = aStream.getAudioTracks()[0];
      audio.enabled = false;
      recorder = new MediaRecorder(aStream, {
        mimeType: "audio/webm;codecs=opus",
      });
    } catch (err) {
      console.error("Failed to load audio: ", err);
    }
  }

  function startRecording() {
    if (!isRecording) {
      audioChunks = [];
      recorder.start();
      console.log("Audio recording start!");
      isRecording = true;

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        console.log("Stopping audio recording...");
        await uploadAudioToServer();
        audioChunks = [];
        if (isRecording) {
          recorder.start();
        }
      };

      intervalId = setInterval(() => {
        recorder.stop();
      }, 5000);
    }
  }

  function stopRecording() {
    if (isRecording) {
      clearInterval(intervalId);
      recorder.stop();
      isRecording = false;
    }
  }

  async function uploadAudioToServer() {
    let blob = new Blob(audioChunks, { type: "audio/webm" });
    let formData = new FormData();
    let fileName = `recorded_segment_${myConnectionId}_${Date.now()}.webm`;
    formData.append("audio", blob, fileName);

    try {
      let response = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      let data = response.json();
      console.log("upload to server successful:", data);
    } catch (err) {
      console.error("upload audo failed: ", err);
    }
  }

  function connectionStatus(connection) {
    if (
      connection &&
      (connection.connectionState === "new" ||
        connection.connectionState === "connecting" ||
        connection.connectionState === "connected")
    ) {
      return true;
    } else {
      return false;
    }
  }

  async function updateMediaSenders(track, rtpSenders) {
    console.log("peersConnectionIds: ", peersConnectionIds);
    for (let conId in peersConnectionIds) {
      if (connectionStatus(peersConnection[conId])) {
        if (rtpSenders[conId] && rtpSenders[conId].track) {
          rtpSenders[conId].replaceTrack(track);
        } else {
          rtpSenders[conId] = peersConnection[conId].addTrack(track);
        }
      }
    }
  }

  function removeMediaSenders(rtpSenders) {
    for (let conId in peersConnectionIds) {
      if (rtpSenders[conId] && connectionStatus(peersConnection[conId])) {
        peersConnection[conId].removeTrack(rtpSenders[conId]);
        rtpSenders[conId] = null;
        console.log(`${peersConnection[conId]}'s video track is removed.`);
      }
    }
  }

  function removeVideoStream(rtpVidSenders) {
    if (videoCamTrack) {
      videoCamTrack.stop();
      videoCamTrack = null;
      localDiv.srcObject = null;
      removeMediaSenders(rtpVidSenders);
    }
    console.log("local video is removed.");
  }

  async function videoProcess(newVideoState) {
    if (newVideoState === videoStates.none) {
      document.getElementById("videoCamOnOff").innerHTML =
        '<span class="material-icons" style="width: 100%">videocam_off</span>';

      document.getElementById("screenShareOnOff").innerHTML =
        '<span class="material-icons">present_to_all</span><div>Present Now</div>';

      videoSt = newVideoState;
      removeVideoStream(rtpVidSenders);
      console.log("!!!setting onCameraToggle off!!!! ");
      onCameraToggle("off", myConnectionId);
      return;
    }
    if (newVideoState === videoStates.camera) {
      document.getElementById("videoCamOnOff").innerHTML =
        '<span class="material-icons" style="width: 100%">videocam_on</span>';
    }
    try {
      let vStream;
      if (newVideoState == videoStates.camera) {
        vStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
      } else if (newVideoState == videoStates.screenShare) {
        vStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
        vStream.oninactive = (e) => {
          remoteVidStream(rtpVidSenders);
          document.getElementById("screenShareOnOff").innerHTML =
            '<span class="material-icons">present_to_all</span><div> Present Now</div>';
        };
      } else if (newVideoState == videoStates.draw) {
        console.log("draw btn clicked!");
        vStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
        if (vStream) {
          webcamRunning = !webcamRunning;
        }
        if (!handLandmarker) {
          console.log(
            "====================== Initializing hand tracking ====================== "
          );
          await initializeHandTracking();
          console.log(
            "!!!!!!!!!!!!!!!!!!!!! Hand tracking initialized !!!!!!!!!!!!!!!!!!!!!!!!"
          );
        } else {
          console.log("Hand tracking already initialized.");
        }
        if (vStream) {
          vStream.oninactive = (e) => {
            remoteVidStream(rtpVidSenders);
          };
        }

        localDiv.addEventListener("loadeddata", updateCanvas);
        console.log(
          "after evernt listener loadeddata updateCanvas is loading!"
        );

        console.log("vStream", vStream);
      }
      if (vStream && vStream.getVideoTracks().length > 0) {
        videoCamTrack = vStream.getVideoTracks()[0];
        if (videoCamTrack) {
          localDiv.srcObject = new MediaStream([videoCamTrack]);
          console.log("localDiv.srcObject", localDiv.srcObject);
          updateMediaSenders(videoCamTrack, rtpVidSenders);
          console.log(
            "==================================this is the value of videoCamTrack",
            videoCamTrack
          );
        }
      }
    } catch (err) {
      console.error("Failed to get video process: ", err);
      return;
    }

    videoSt = newVideoState;
    if (newVideoState === videoStates.camera) {
      document.getElementById("videoCamOnOff").innerHTML =
        '<span class="material-icons" style="width: 100%">videocam_on</span>';
      document.getElementById("screenShareOnOff").innerHTML =
        '<span class="material-icons">present_to_all</span><div> Present Now</div>';
      document.getElementById("drawOnOff").innerHTML =
        '<span class="material-icons">edit_off</span>';
    } else if (newVideoState === videoStates.screenShare) {
      document.getElementById("screenShareOnOff").innerHTML =
        '<span class="material-icons text-success">present_to_all</span><div class="text-success">Stop Present Now</div>';
      document.getElementById("videoCamOnOff").innerHTML =
        '<span class="material-icons" style="width: 100%">videocam_off</span>';
      document.getElementById("drawOnOff").innerHTML =
        '<span class="material-icons">edit_off</span>';
    } else if (newVideoState === videoStates.draw) {
      document.getElementById("drawOnOff").innerHTML =
        '<span class="material-icons">edit</span>';
      document.getElementById("screenShareOnOff").innerHTML =
        '<span class="material-icons text-success">present_to_all</span><div class="text-success">Stop Present Now</div>';
      document.getElementById("videoCamOnOff").innerHTML =
        '<span class="material-icons" style="width: 100%">videocam_off</span>';
    }
  }

  let iceConfiguration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun1.l.google.com:19302",
      },
    ],
  };

  async function setConnection(connId) {
    if (typeof connId === "undefined") {
      console.error("Connection ID is undefined when calling setConnection");
      return;
    }
    console.log("Setting up connection for ID:", connId);
    let connection = new RTCPeerConnection(iceConfiguration);
    console.log("!!!!!!!!!!setting up RTCPeerConnection!!!!!!!", connection);

    connection.onnegotiationneeded = async function (event) {
      await setOffer(connId);
    };
    connection.onicecandidate = function (event) {
      if (event.candidate) {
        console.log(
          `ICE candidate generated for connection [${connId}]:`,
          event.candidate
        );
        serverProcess(
          JSON.stringify({ iceCandidate: event.candidate }),
          connId
        );
      }
    };

    connection.onconnectionstatechange = function (event) {
      console.log(
        `Connection state change [${connId}]: ${connection.connectionState}`
      );
    };
    connection.oniceconnectionstatechange = function (event) {
      console.log(
        `ICE connection state change [${connId}]: ${connection.iceConnectionState}`
      );
    };

    connection.ontrack = function (event) {
      console.log("Received track:", event.track, "for connection ID:", connId);
      if (!remoteVidStream[connId]) {
        remoteVidStream[connId] = new MediaStream();
      }
      if (!remoteAudStream[connId]) {
        remoteAudStream[connId] = new MediaStream();
      }
      if (event.track.kind === "video") {
        if (!remoteVidStream[connId]) {
          remoteVidStream[connId] = new MediaStream();
        }

        remoteVidStream[connId]
          .getVideoTracks()
          .forEach((t) => remoteVidStream[connId].removeTrack(t));
        remoteVidStream[connId].addTrack(event.track);
        // not sure abt the let
        let remoteVideoPlayer = document.getElementById("v_" + connId);
        if (remoteVideoPlayer) {
          remoteVideoPlayer.srcObject = remoteVidStream[connId];
          remoteVideoPlayer.load();
        } else {
          console.error("Video element not found for connection ID:", connId);
        }
      } else if (event.track.kind === "audio") {
        remoteAudStream[connId]
          .getAudioTracks()
          .forEach((t) => remoteAudStream[connId].removeTrack(t));
        remoteAudStream[connId].addTrack(event.track);
        // not sure abt the let
        let remoteAudioPlayer = document.getElementById("a_" + connId);
        remoteAudioPlayer.srcObject = null;
        remoteAudioPlayer.srcObject = remoteAudStream[connId];
        remoteAudioPlayer.load();
      }
    };

    peersConnectionIds[connId] = connId;
    console.log("in setConnection - peersConnectionIds:", peersConnectionIds);
    peersConnection[connId] = connection;
    console.log("in setConnection - peersConnection:", peersConnection);

    if (videoSt == videoStates.camera || videoSt == videoStates.screenShare) {
      if (videoCamTrack) {
        updateMediaSenders(videoCamTrack, rtpVidSenders);
      }
    }

    connection.onerror = function (event) {
      console.error(`Peer Connection error for connection [${connId}]:`, event);
    };
    connection.oniceconnectionstatechange = function (event) {
      console.log(
        `ICE connection state changed for connection [${connId}]: ${connection.iceConnectionState}`
      );
      if (
        connection.iceConnectionState === "failed" ||
        connection.iceConnectionState === "disconnected" ||
        connection.iceConnectionState === "closed"
      ) {
        console.error(
          `ICE connection state is ${connection.iceConnectionState} for connection [${connId}]`
        );
      }
    };

    return connection;
  }

  async function setOffer(connId) {
    console.log("------------Making an offer------------");
    let connection = peersConnection[connId];
    console.log("connection from offerer:", connection);
    const offer = await connection.createOffer();
    console.log(`Offer created for connection [${connId}]:`, offer);
    await connection.setLocalDescription(offer);
    console.log(`Set local description for connection [${connId}] with offer`);
    serverProcess(
      JSON.stringify({
        offer: connection.localDescription,
      }),
      connId
    );
  }

  async function SDPProcess(message, fromConnId) {
    console.log(
      `Received SDP message for connection [${fromConnId}]:`,
      message
    );
    if (typeof fromConnId === "undefined") {
      console.error("fromConnId is undefined in SDPProcess");
      return;
    }
    message = JSON.parse(message);
    if (message.answer) {
      console.log(
        `Setting remote description with answer for connection [${fromConnId}]`
      );
      await peersConnection[fromConnId].setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
      console.log(
        "Here's the offer, the is the overall peersConnection: ",
        peersConnection
      );
      console.log(
        "Here's the offer, the is the overall peersConnection[fromConnId]: ",
        peersConnection[fromConnId]
      );
    } else if (message.offer) {
      console.log(
        `Setting remote description with offer for connection [${fromConnId}]`
      );
      if (!peersConnection[fromConnId]) {
        await setConnection(fromConnId);
      }
      await peersConnection[fromConnId].setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );
      const answer = await peersConnection[fromConnId].createAnswer();
      await peersConnection[fromConnId].setLocalDescription(answer);
      serverProcess(
        JSON.stringify({
          answer: answer,
        }),
        fromConnId
      );
      console.log(
        "Here's an answerer, the is the overall peersConnection: ",
        peersConnection
      );
      console.log(
        "Here's an answerer, the is the overall peersConnection[fromConnId]: ",
        peersConnection[fromConnId]
      );
    } else if (message.iceCandidate) {
      console.log(
        `Adding ICE candidate for connection [${fromConnId}]`,
        message.iceCandidate
      );
      if (!peersConnection[fromConnId]) {
        await setConnection(fromConnId);
      }
      try {
        await peersConnection[fromConnId].addIceCandidate(message.iceCandidate);
      } catch (err) {
        console.error("Failed to get ICE: ", err);
      }
    }
  }

  async function closeConnectionCall(connId) {
    peersConnectionIds[connId] = null;
    if (peersConnection[connId]) {
      peersConnection[connId].close();
      peersConnection[connId] = null;
    }
    if (remoteAudStream[connId]) {
      remoteAudStream[connId].getTracks().forEach((t) => {
        if (t.stop) t.stop();
      });
      remoteAudStream[connId] = null;
    }
    if (remoteVidStream[connId]) {
      remoteVidStream[connId].getTracks().forEach((t) => {
        if (t.stop) t.stop();
      });
      remoteVidStream[connId] = null;
    }
    console.log("connection closed");
  }

  return {
    setNewConnection: async function (connId) {
      console.log("setNewConnection: ", connId);
      await setConnection(connId);
    },
    init: async function (SDPFunction, myConnId, onCameraToggle) {
      await _init(SDPFunction, myConnId, onCameraToggle);
    },
    processClientFunc: async function (data, fromConnId) {
      await SDPProcess(data, fromConnId);
    },
    closeConnectionCall: async function (connId) {
      await closeConnectionCall(connId);
    },
  };
})();

const MyApp = (function () {
  let socket;
  let username;

  function init(uid) {
    username = uid;
    const meetingContainer = document.getElementById("meetingContainer");
    if (meetingContainer) {
      meetingContainer.style.display = "block";
    }
    document.querySelector("#me h2").textContent = username + " (me)";
    document.title = username;
    eventProcessForSignalingServer();
    eventHandling();
  }

  function eventProcessForSignalingServer() {
    socket = io.connect();

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

    const breakoutroomBtn = document.getElementById("breakoutRoomOnOff");
    const urlParams = new URLSearchParams(window.location.search);
    const meetingId = urlParams.get("meetingID");
    breakoutroomBtn.addEventListener("click", (e) => {
      fetch("/api/breakoutroom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingId,
          numOfRoom: 2,
          setTime: 30,
        }),
      })
        .then((response) => {
          response = response.json();
          console.log(response);
        })

        .catch((err) => console.error("Failed to get breakroom info", err));
    });

    socket.on("connect", () => {
      if (socket.connected) {
        AppProcess.init(SDPFunction, socket.id, (status) =>
          onCameraToggle(status, socket.id)
        );
        if (username != "" && meetingId != "") {
          socket.emit("userconnect", {
            displayName: username,
            meetingId,
          });
        }
      }
    });

    socket.on("informOthersAboutMe", function (data) {
      addUser(data.otherUserId, data.connId), data.userNumber;
      console.log("informOthersAboutMe connId: ", data.connId);
      AppProcess.setNewConnection(data.connId);
    });

    socket.on("informMeAboutOtherUser", function (otherUsers) {
      const userNumberWithoutMe = otherUsers.length;
      const userNumber = userNumberWithoutMe + 1;
      if (otherUsers) {
        for (let i = 0; i < otherUsers.length; i++) {
          console.log("who are the others:", otherUsers[i]);
          addUser(
            otherUsers[i].username,
            otherUsers[i].connectionId,
            userNumber
          );
          AppProcess.setNewConnection(otherUsers[i].connectionId);
        }
      }
    });

    socket.on("informOtherAboutDisconnectedUser", function (data) {
      document.getElementById(`${data.connId}`).remove();
      const participantCount = document.querySelector(".participant-count");
      participantCount.textContent = data.uNumber;
      document.getElementById(`participant-${data.connId}`).remove();
      AppProcess.closeConnectionCall(data.connId);
    });

    socket.on("SDPProcess", async function (data) {
      console.log(
        `Received SDPProcess message, toConnId: ${data.toConnId}, fromConnId: ${socket.id}`
      );
      await AppProcess.processClientFunc(data.message, data.fromConnId);
    });

    socket.on("updateUserVideo", (data) => {
      console.log("client got the updateUserVideo event!!!!");
      const { connId, status } = data;
      const userVideoToRemoved = document.getElementById(`v_${connId}`);

      if (userVideoToRemoved && status === "off") {
        userVideoToRemoved.srcObject = null;
      }
    });

    socket.on("newSubtitle", (data) => {
      console.log("Received subtitle:", data.subtitle);
      const userDivId =
        data.speakerId === myConnectionId ? "me" : data.speakerId;
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
  }

  function eventHandling() {
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
  }

  function addUser(otherUserUsername, connId, userNumber) {
    const template = document.getElementById("other-template");
    let clonedDiv = template.cloneNode(true);

    clonedDiv.setAttribute("id", connId);
    clonedDiv.classList.add("other");
    clonedDiv.classList.remove("d-none");

    const h2 = clonedDiv.querySelector("h2");
    h2.textContent = otherUserUsername;

    const video = clonedDiv.querySelector("video");
    video.setAttribute("id", "v_" + connId);

    const audio = clonedDiv.querySelector("audio");
    audio.setAttribute("id", "a_" + connId);

    const divUsers = document.getElementById("div-users");
    divUsers.appendChild(clonedDiv);

    const participantTemplate = document.getElementById("participant-template");
    let clonedParticipantDiv = participantTemplate.cloneNode(true);
    clonedParticipantDiv.setAttribute("id", "participant-" + connId);
    clonedParticipantDiv.classList.remove("d-none");
    const participantImg = clonedParticipantDiv.querySelector(
      ".participant-img img"
    );
    participantImg.src = "./Assets/images/other.jpg";
    const participantName = clonedParticipantDiv.querySelector(
      ".participant-name"
    );
    participantName.textContent = otherUserUsername;
    const participantList = document.querySelector(".in-call-wrap-up");
    participantList.appendChild(clonedParticipantDiv);

    const participantCount = document.querySelector(".participant-count");
    participantCount.textContent = userNumber;
  }

  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed");
    const peopleHeading = document.querySelector(".people-heading");
    if (peopleHeading) {
      peopleHeading.addEventListener("click", () => {
        console.log("peopleHeading is clicked.");
        const chatShowWrap = document.querySelector(".chat-show-wrap");
        const inCallWrapUp = document.querySelector(".in-call-wrap-up");
        peopleHeading.classList.add("active");
        chatHeading.classList.remove("active");

        if (chatShowWrap) {
          chatShowWrap.classList.add("transition");
          setTimeout(() => {
            chatShowWrap.style.display = "none";
            chatShowWrap.classList.remove("d-flex");
          }, 300);
        }

        if (inCallWrapUp) {
          inCallWrapUp.classList.remove("transition");

          setTimeout(() => {
            inCallWrapUp.style.display = "block";
          }, 0);
        }
      });
    } else {
      console.error('The element with "people-heading" not found.');
    }

    const chatHeading = document.querySelector(".chat-heading");
    if (chatHeading) {
      chatHeading.addEventListener("click", () => {
        const chatShowWrap = document.querySelector(".chat-show-wrap");
        const inCallWrapUp = document.querySelector(".in-call-wrap-up");
        peopleHeading.classList.remove("active");
        chatHeading.classList.add("active");

        if (chatShowWrap) {
          chatShowWrap.classList.remove("transition");
          setTimeout(() => {
            chatShowWrap.style.display = "flex";
          }, 0);
        }

        if (inCallWrapUp) {
          inCallWrapUp.classList.add("transition");
          setTimeout(() => {
            inCallWrapUp.style.display = "none";
          }, 0);
        }
      });
    } else {
      console.error('The element with "chat-heading" not found.');
    }

    const meetingHeadingCross = document.querySelector(
      ".meeting-heading-cross"
    );
    const meetingDetailsWrap = document.querySelector(".g-right-details-wrap");
    if (meetingHeadingCross) {
      meetingHeadingCross.addEventListener("click", () => {
        meetingDetailsWrap.classList.add("transition");
        meetingDetailsWrap.classList.add("d-none");
      });
    } else {
      console.error('The element with "meeting-heading-cross" not found.');
    }
    const participantWrap = document.querySelector(
      ".top-left-participant-wrap"
    );

    if (participantWrap) {
      participantWrap.addEventListener("click", () => {
        peopleHeading.classList.add("active");
        chatHeading.classList.remove("active");
        meetingDetailsWrap.classList.remove("transition");
        meetingDetailsWrap.classList.remove("d-none");
        if (chatShowWrap) {
          chatShowWrap.classList.add("transition");
          setTimeout(() => {
            chatShowWrap.style.display = "none";
            chatShowWrap.classList.remove("d-flex");
          }, 300);
        }

        if (inCallWrapUp) {
          inCallWrapUp.classList.remove("transition");

          setTimeout(() => {
            inCallWrapUp.style.display = "block";
          }, 0);
        }
      });
    } else {
      console.error('The element with "top-left-participant-wrap" not found.');
    }

    const chatWrap = document.querySelector(".top-left-chat-wrap");

    if (chatWrap) {
      chatWrap.addEventListener("click", () => {
        meetingDetailsWrap.classList.remove("transition");
        meetingDetailsWrap.classList.remove("d-none");
        peopleHeading.classList.remove("active");
        chatHeading.classList.add("active");

        if (chatShowWrap) {
          chatShowWrap.classList.remove("transition");
          setTimeout(() => {
            chatShowWrap.style.display = "flex";
          }, 0);
        }

        if (inCallWrapUp) {
          inCallWrapUp.classList.add("transition");
          setTimeout(() => {
            inCallWrapUp.style.display = "none";
          }, 0);
        }
      });
    } else {
      console.error('The element with "top-left-participant-wrap" not found.');
    }
  });

  return {
    _init: function (uid, mid) {
      init(uid, mid);
    },
  };
})();
