const AppProcess = (function () {
  let peersConnectionIds = [];
  let peersConnection = [];
  let remoteVidStream = [];
  let remoteAudStream = [];
  let localDiv;
  let serverProcess;
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

  async function _init(SDPFunction, myConnId) {
    serverProcess = SDPFunction;
    myConnectionId = myConnId;
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
        icon.textContent = "mic";
        updateMediaSenders(audio, rtpAudSenders);
      } else {
        audio.enabled = false;
        icon.textContent = "mic_off";
        removeMediaSenders(rtpAudSenders);
      }
      isAudioMute = !isAudioMute;
    });
    const videoBtn = document.getElementById("videoCamOnOff");
    videoBtn.addEventListener("click", async (e) => {
      if (videoSt == videoStates.camera) {
        await videoProcess(videoStates.none);
      } else {
        await videoProcess(videoStates.camera);
      }
    });
    const screenShareBtn = document.getElementById("screenShareOnOff");
    screenShareBtn.addEventListener("click", async (e) => {
      if (videoSt == videoStates.screenShare) {
        await videoProcess(videoStates.none);
      } else {
        await videoProcess(videoStates.screenShare);
      }
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

  async function videoProcess(newVideoState) {
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
      if (event.track.kind == "video") {
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
      } else if (event.track.kind == "audio") {
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
    peersConnection[connId] = connection;

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

  return {
    setNewConnection: async function (connId) {
      console.log("setNewConnection: ", connId);
      await setConnection(connId);
    },
    init: async function (SDPFunction, myConnId) {
      await _init(SDPFunction, myConnId);
    },
    processClientFunc: async function (data, fromConnId) {
      await SDPProcess(data, fromConnId);
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
      socket.emit("SDPProcess", {
        message: data,
        toConnId: toConnId,
      });
    };

    socket.on("connect", () => {
      if (socket.connected) {
        AppProcess.init(SDPFunction, socket.id);
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
          console.log(otherUsers[i]);
          addUser(otherUsers[i].userId, otherUsers[i].connectionId);
          AppProcess.setNewConnection(otherUsers[i].connectionId);
        }
      }
    });
    socket.on("SDPProcess", async function (data) {
      console.log(
        `Received SDPProcess message, toConnId: ${data.toConnId}, fromConnId: ${socket.id}`
      );
      await AppProcess.processClientFunc(data.message, data.fromConnId);
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
