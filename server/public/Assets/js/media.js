import {
  myConnectionId,
  peersConnectionIds,
  peersConnection,
  onCameraToggle,
} from "./RTCConnection.js";
import { showLoadingAnimation, hideLoadingAnimation } from "./uiHandler.js";
export let remoteVidStream = [];
export let remoteAudStream = [];
let localDiv;
let aStream;
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

localDiv = document.getElementById("localVideoPlayer");
mainCanvas = document.getElementById("me-output-canvas");
mainCtx = mainCanvas.getContext("2d");
drawingCanvas = document.getElementById("me-drawing-canvas");
drawingCtx = drawingCanvas.getContext("2d");

async function initializeHandTracking() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: runningMode,
    numHands: 2,
  });
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
  const fingers = fingersUp(landmarks);
  const indexFingerTip = landmarks[8];
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
  if (videoSt === videoStates.draw) {
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
      drawingCtx.clearRect(0, 0, drawingCanvas.width, mainCanvas.height);
      mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    }
  } else {
    drawingCtx.clearRect(0, 0, drawingCanvas.width, mainCanvas.height);
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    return;
  }
}

export async function eventProcess() {
  const micBtn = document.getElementById("micMuteUnmute");
  micBtn.addEventListener("click", async (e) => {
    if (!audio) {
      await loadAudio();
    }
    if (!audio) {
      alert("Audio permission has not granted.");
      return;
    }
    if (isAudioMute) {
      await loadAudio();
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
      audio.stop();
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
      hideLoadingAnimation();
    } else {
      showLoadingAnimation();
      await videoProcess(videoStates.draw);
      hideLoadingAnimation();
    }
  });
}

async function loadAudio() {
  try {
    aStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });
    audio = aStream.getAudioTracks()[0];
    audio.enabled = false;
  } catch (err) {
    console.error("Failed to load audio: ", err);
  }
}

function startRecording() {
  if (!isRecording) {
    recorder = new MediaRecorder(aStream, {
      mimeType: "audio/webm;codecs=opus",
    });

    audioChunks = [];
    recorder.start();
    isRecording = true;

    recorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    recorder.onstop = async () => {
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
    recorder = null;
  }
}

async function uploadAudioToServer() {
  let blob = new Blob(audioChunks, { type: "audio/webm" });
  let formData = new FormData();
  let fileName = `recorded[${myConnectionId}]-${Date.now()}.webm`;
  formData.append("audio", blob, fileName);

  try {
    let response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    let data = response.json();
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
}

async function videoProcess(newVideoState) {
  if (newVideoState === videoStates.none) {
    document.getElementById("videoCamOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">videocam_off</span>';

    document.getElementById("screenShareOnOff").innerHTML =
      '<span class="material-icons">cancel_presentation</span>';

    document.getElementById("drawOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">edit_off</span>';

    videoSt = newVideoState;
    removeVideoStream(rtpVidSenders);
    onCameraToggle("off", myConnectionId);
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
        removeVideoStream(rtpVidSenders);
        document.getElementById("screenShareOnOff").innerHTML =
          '<span class="material-icons">cancel_presentation</span>';
      };
    } else if (newVideoState == videoStates.draw) {
      vStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1920,
          height: 1080,
        },
        audio: false,
      });
      if (!handLandmarker) {
        // await hideLoadingAnimation();
        await initializeHandTracking();
      }
      if (vStream) {
        vStream.oninactive = (e) => {
          removeVideoStream(rtpVidSenders);
        };
      }

      localDiv.addEventListener("loadeddata", updateCanvas);
    }
    if (vStream && vStream.getVideoTracks().length > 0) {
      videoCamTrack = vStream.getVideoTracks()[0];
      if (videoCamTrack) {
        videoSt = newVideoState;
        localDiv.srcObject = new MediaStream([videoCamTrack]);
        updateMediaSenders(videoCamTrack, rtpVidSenders);
      }
    }
  } catch (err) {
    console.error("Failed to get video process: ", err);
    return;
  }

  if (newVideoState === videoStates.camera) {
    document.getElementById("videoCamOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">videocam_on</span>';
    document.getElementById("screenShareOnOff").innerHTML =
      '<span class="material-icons">cancel_presentation</span>';
    document.getElementById("drawOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">edit_off</span>';
  } else if (newVideoState === videoStates.screenShare) {
    document.getElementById("screenShareOnOff").innerHTML =
      '<span class="material-icons">present_to_all</span>';
    document.getElementById("videoCamOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">videocam_off</span>';
    document.getElementById("drawOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">edit_off</span>';
    localDiv.style.setProperty("transform", "none", "important");
    localDiv.style.setProperty("-webkit-transform", "none", "important");
    localDiv.style.setProperty("-moz-transform", "none", "important");
    socket.emit("shareScreen", myConnectionId);
  } else if (newVideoState === videoStates.draw) {
    document.getElementById("drawOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">edit_on</span>';
    document.getElementById("screenShareOnOff").innerHTML =
      '<span class="material-icons">cancel_presentation</span>';
    document.getElementById("videoCamOnOff").innerHTML =
      '<span class="material-icons" style="width: 100%">videocam_off</span>';
    localDiv.style.removeProperty("transform");
    localDiv.style.removeProperty("-webkit-transform");
    localDiv.style.removeProperty("-moz-transform");
  }
}
