import {
  myConnectionId,
  peersConnectionIds,
  peersConnection,
  onCameraToggle,
} from "./RTCConnection.js";
export let remoteVidStream = [];
export let remoteAudStream = [];
let localDiv;
let audio;
let isAudioMute = true;
let rtpAudSenders = [];
export let videoStates = {
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
export let videoSt = videoStates.none;
export let videoCamTrack;
export let rtpVidSenders = [];
let recorder;
let audioChunks = [];
let isRecording = false;
let intervalId;
let mainCanvas;
let mainCtx;
let drawingCanvas;
let drawingCtx;
let mode = "drawing";
let lastVideoTime = -1;
let detectionResults = undefined;

localDiv = document.getElementById("localVideoPlayer");
mainCanvas = document.getElementById("me-output-canvas");
mainCtx = mainCanvas.getContext("2d");
drawingCanvas = document.getElementById("me-drawing-canvas");
drawingCtx = drawingCanvas.getContext("2d");

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

function fingersUp(landmarks) {
  let fingers = [];
  const tipIds = [4, 8, 12, 16, 20];
  if (landmarks[tipIds[0]].x > landmarks[tipIds[0] - 1].x) {
    fingers.push(1);
  } else {
    fingers.push(0);
  }

  for (let i = 1; i < tipIds.length; i++) {
    if (landmarks[tipIds[i]].y < landmarks[tipIds[i] - 2].y) {
      fingers.push(1);
    } else {
      fingers.push(0);
    }
  }

  return fingers;
}

function processHandLandmarks(landmarks) {
  console.log("processHandLandmarks is being called");
  const fingers = fingersUp(landmarks);
  const indexFingerTip = landmarks[8];
  const middleFingerTip = landmarks[12];
  console.log("indexFingerTip", indexFingerTip);
  const currentX = indexFingerTip.x * drawingCanvas.width;
  const currentY = indexFingerTip.y * drawingCanvas.height;

  if (fingers[1] === 1 && fingers[2] === 1) {
    mode = "erasing";
  } else if (fingers[1] === 1) {
    mode = "drawing";
  } else {
    mode = "none";
  }

  if (indexFingerTip) {
    if (!isDrawing) {
      isDrawing = true;
      previousPosition = { x: currentX, y: currentY };
    } else {
      if (previousPosition.x !== -1 && previousPosition.y !== -1) {
        console.log("Current mode is .....", mode);
        drawPath(
          previousPosition.x,
          previousPosition.y,
          currentX,
          currentY,
          mode
        );
      }
      previousPosition = { x: currentX, y: currentY };
    }
  } else {
    isDrawing = false;
    previousPosition = { x: -1, y: -1 };
  }
}

export function drawPath(startX, startY, endX, endY, mode) {
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

  socket.emit("drawCanvas", {
    startX,
    startY,
    endX,
    endY,
    mode,
    myConnectionId,
  });
}

async function updateCanvas() {
  console.log("updateCanvas is running!");

  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await handLandmarker.setOptions({ runningMode: "VIDEO" });
  }

  if (
    localDiv.readyState >= 2 &&
    localDiv.videoWidth > 0 &&
    localDiv.videoHeight > 0 &&
    lastVideoTime != localDiv.currentTime
  ) {
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
  } else {
    console.log("videoCamTrack", videoCamTrack);

    drawingCtx.clearRect(0, 0, drawingCanvas.width, mainCanvas.height);
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  }
}

export async function eventProcess() {
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

export async function updateMediaSenders(track, rtpSenders) {
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
    console.log(`!!!!!!!!!!!!!${conId} in ${peersConnectionIds}!!!!!!!!!!!`);
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

    document.getElementById("drawOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">edit_off</span>';

    videoSt = newVideoState;
    removeVideoStream(rtpVidSenders);
    console.log("!!!setting onCameraToggle off!!!! ");
    onCameraToggle("off", myConnectionId);
    console.log("turning off drawing camera!!!!!!!!!!!", myConnectionId);
    socket.emit("drawerTurnsOffCanvas", { myConnectionId });
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
          removeVideoStream(rtpVidSenders);
        };
      }

      localDiv.addEventListener("loadeddata", updateCanvas);
      console.log("after evernt listener loadeddata updateCanvas is loading!");
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
      '<span class="material-icons" style="width: 100%">edit_off</span>';
  } else if (newVideoState === videoStates.screenShare) {
    document.getElementById("screenShareOnOff").innerHTML =
      '<span class="material-icons text-success">present_to_all</span><div class="text-success">Stop Present Now</div>';
    document.getElementById("videoCamOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">videocam_off</span>';
    document.getElementById("drawOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">edit_off</span>';
  } else if (newVideoState === videoStates.draw) {
    console.log("should change ");
    document.getElementById("drawOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">edit_on</span>';
    document.getElementById("screenShareOnOff").innerHTML =
      '<span class="material-icons">present_to_all</span><div> Present Now</div>';
    document.getElementById("videoCamOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">videocam_off</span>';
  }
}
