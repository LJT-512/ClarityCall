import {
  eventProcess,
  videoSt,
  videoStates,
  remoteVidStream,
  videoCamTrack,
  remoteAudStream,
  updateMediaSenders,
  rtpVidSenders,
} from "./media.js";

export let peersConnectionIds = [];
export let peersConnection = [];
let serverProcess;
export let myConnectionId;
export let onCameraToggle;

export async function initRTCConnection(
  SDPFunction,
  socketId,
  cameraToggleCallback
) {
  serverProcess = SDPFunction;
  myConnectionId = socketId;
  onCameraToggle = cameraToggleCallback;
  await eventProcess();
}

let iceConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "stun:stun1.l.google.com:19302",
    },
    {
      urls: "turn:turn1.l.google.com:19305?transport=udp",
      username: "webrtc",
      credential: "secret",
    },
    {
      urls: "turn:turn1.l.google.com:19305?transport=tcp",
      username: "webrtc",
      credential: "secret",
    },
  ],
};

export async function setConnection(connId) {
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
      serverProcess(JSON.stringify({ iceCandidate: event.candidate }), connId);
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

export async function setOffer(connId) {
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

export async function SDPProcess(message, fromConnId) {
  console.log(`Received SDP message for connection [${fromConnId}]:`, message);
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

export async function closeConnectionCall(connId) {
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
