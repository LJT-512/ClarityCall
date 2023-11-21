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
  };
  let videoSt = videoStates.none;
  let videoCamTrack;
  let rtpVidSenders = [];
  let recorder;
  let intervalId;

  async function _init(SDPFunction, myConnId, cameraToggleCallback) {
    serverProcess = SDPFunction;
    myConnectionId = myConnId;
    onCameraToggle = cameraToggleCallback;
    eventProcess();
    localDiv = document.getElementById("localVideoPlayer");
  }

  function eventProcess() {
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
  }

  async function loadAudio() {
    try {
      let aStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      audio = aStream.getAudioTracks()[0];
      audio.enabled = false;
      recorder = RecordRTC(aStream, {
        type: "audio",
        mimeType: "audio/webm;codecs=opus",
        bitsPerSecond: 128000,
      });
      startRecording();
    } catch (err) {
      console.error("Failed to load audio: ", err);
    }
  }

  function startRecording() {
    if (!recorder) {
      recorder = RecordRTC(aStream, {
        type: "audio",
        mimeType: "audio/webm;codecs=opus",
        bitsPerSecond: 128000,
      });
    }

    recorder.startRecording();
    console.log("Audio recording start!");

    intervalId = setInterval(() => {
      recorder.stopRecording(() => {
        uploadAudioToServer();
        recorder.reset();
        recorder.startRecording();
      });
    }, 5000);
  }

  function stopRecording() {
    if (recorder) {
      clearInterval(intervalId);
      recorder.stopRecording(() => {
        console.log("Stopping audio recording...");
        uploadAudioToServer();
        console.log("Recording audio stopped");
      });
    }
  }

  function uploadAudioToServer() {
    let blob = recorder.getBlob();
    let formData = new FormData();
    formData.append("audio", blob, `recorded_segment_${Date.now()}.webm`);
    fetch("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("upload to server successful:", data);
      })
      .catch((error) => {
        console.error("upload failed:", "error");
      });
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
      }
      if (vStream && vStream.getVideoTracks().length > 0) {
        videoCamTrack = vStream.getVideoTracks()[0];
        if (videoCamTrack) {
          localDiv.srcObject = new MediaStream([videoCamTrack]);
          updateMediaSenders(videoCamTrack, rtpVidSenders);
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
    } else if (newVideoState === videoStates.screenShare) {
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
  let userId;
  let meetingId;

  function init(uid, mid) {
    userId = uid;
    meetingId = mid;
    const meetingContainer = document.getElementById("meetingContainer");
    if (meetingContainer) {
      meetingContainer.style.display = "block";
    }
    document.querySelector("#me h2").textContent = userId + " (me)";
    document.title = userId;
    eventProcessForSignalingServer();
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
        if (userId != "" && meetingId != "") {
          socket.emit("userconnect", {
            displayName: userId,
            meetingId,
          });
        }
      }
    });

    socket.on("informOthersAboutMe", function (data) {
      addUser(data.otherUserId, data.connId);
      console.log("informOthersAboutMe connId: ", data.connId);
      AppProcess.setNewConnection(data.connId);
    });

    socket.on("informMeAboutOtherUser", function (otherUsers) {
      if (otherUsers) {
        for (let i = 0; i < otherUsers.length; i++) {
          console.log("who are the others:", otherUsers[i]);
          addUser(otherUsers[i].userId, otherUsers[i].connectionId);
          AppProcess.setNewConnection(otherUsers[i].connectionId);
        }
      }
    });

    socket.on("informOtherAboutDisconnectedUser", function (data) {
      document.getElementById(`${data.connId}`).remove();
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
      const subtitleDiv = document.getElementById("subtitle");

      if (data.subtitle) {
        subtitleDiv.innerHTML = `<p>${data.subtitle}</p>`;
      }
    });

    socket.on("informAboutBreakRooms", (data) => {
      console.log("informAboutBreakRooms is running!!!!!");
      window.location.href = `/?meetingID=${data.roomId}`;
    });

    socket.on("informBackToOriginalMeeting", (data) => {
      console.log("got informBackToOriginalMeeting");
      alert("Breakout room is about to end");
      window.location.href = `/?meetingID=${data.meetingId}`;
    });
  }

  function addUser(otherUserId, connId) {
    const template = document.getElementById("other-template");
    let clonedDiv = template.cloneNode(true);

    clonedDiv.setAttribute("id", connId);
    clonedDiv.classList.add("other");

    const h2 = clonedDiv.querySelector("h2");
    h2.textContent = otherUserId;

    const video = clonedDiv.querySelector("video");
    video.setAttribute("id", "v_" + connId);

    const audio = clonedDiv.querySelector("audio");
    audio.setAttribute("id", "a_" + connId);

    clonedDiv.style.display = "block";
    const divUsers = document.getElementById("div-users");
    divUsers.appendChild(clonedDiv);
  }

  return {
    _init: function (uid, mid) {
      init(uid, mid);
    },
  };
})();
