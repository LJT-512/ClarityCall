import {
  eventProcessForSignalingServer,
  eventHandling,
} from "./socketEvents.js";

async function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const meetingId = urlParams.get("meetingID");

  if (!meetingId) {
    alert("Meeting id missing");
    window.location.href = "/action.html";
    return;
  }

  try {
    const response = await fetch("/api/user/info");

    if (!response.ok) throw new Error("Authentication required");

    const data = await response.json();
    const username = data.username;
    const userId = data.userId;
    console.log(
      "username:",
      username,
      "userId:",
      userId,
      "socketId",
      socket.id
    );
    if (!username) throw new Error("Username not found");

    const meetingContainer = document.getElementById("meetingContainer");
    if (meetingContainer) meetingContainer.style.display = "block";
    document.querySelector("#me h2").textContent = username + " (me)";
    document.title = username;

    console.log("Emitting userconnect after validation!");
    socket.emit("userconnect", {
      displayName: username,
      userId: userId,
      meetingId,
    });

    eventProcessForSignalingServer(socket, username, meetingId, userId);
    eventHandling(username, userId);
  } catch (err) {
    console.error(err);
  }
}

let socket;

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM fully loaded and parsed");
  socket = io.connect();
  window.socket = socket;
  await initApp();
  setupUIInteractions();
});

function setupUIInteractions() {
  setupHeadingToggle(
    ".people-heading",
    ".chat-show-wrap, .subtitles-show-wrap",
    ".in-call-wrap-up",
    "active",
    "Participants"
  );
  setupHeadingToggle(
    ".chat-heading",
    ".in-call-wrap-up, .subtitles-show-wrap",
    ".chat-show-wrap",
    "active",
    "Chat"
  );
  setupHeadingToggle(
    ".subtitles-heading",
    ".chat-show-wrap, .in-call-wrap-up",
    ".subtitles-show-wrap",
    "active",
    "Subtitles"
  );
  const meetingHeadingCross = document.querySelector(".meeting-heading-cross");
  const rightWrap = document.querySelector(".g-right-details-wrap");
  if (meetingHeadingCross && rightWrap) {
    meetingHeadingCross.addEventListener("click", () => {
      rightWrap.classList.add("d-none");
    });
  }
}

function setupHeadingToggle(
  clickSelector,
  hideSelector,
  showSelector,
  activeClass,
  headingText
) {
  const clickElement = document.querySelector(clickSelector);
  const hideElements = document.querySelectorAll(hideSelector);
  const showElements = document.querySelectorAll(showSelector);
  const rightWrap = document.querySelector(".g-right-details-wrap");
  const meetingHeadingElement = document.querySelector(".meeting-heading");

  if (clickElement && hideElements && showElements) {
    clickElement.addEventListener("click", () => {
      rightWrap.classList.remove("d-none");
      meetingHeadingElement.textContent = headingText;

      hideElements.forEach((element) => {
        element.style.setProperty("display", "none", "important");
        element.classList.remove("transition", activeClass);
      });

      showElements.forEach((showElement) => {
        window.getComputedStyle(showElement).opacity;
        showElement.style.display = "block";
        showElement.classList.add(activeClass);
      });
    });
  }
}

const breakoutroomBtn = document.getElementById("breakoutRoomOnOff");
const breakoutroomModal = document.getElementById("breakoutRoomModal");
const errorMessageDiv = document.getElementById("breakoutRoomErrorMessage");
const urlParams = new URLSearchParams(window.location.search);
const meetingId = urlParams.get("meetingID");
const span = document.getElementsByClassName("close")[0];
breakoutroomBtn.addEventListener("click", () => {
  if (meetingId.length === 8) {
    breakoutroomModal.style.display = "block";
    breakoutroomBtn.innerHTML = `<span class="material-icons" style="width: 100%">grid_on</span>`;
  } else {
    alert("You are already in a breakout room.");
    breakoutroomBtn.innerHTML = `<span class="material-icons" style="width: 100%">grid_off</span>`;
  }
});
span.addEventListener("click", () => {
  breakoutroomModal.style.display = "none";
});
window.onclick = function (e) {
  if (e.target == breakoutroomModal) {
    breakoutroomModal.style.display = "none";
  }
};
document.getElementById("breakoutRoomForm").onsubmit = function (e) {
  e.preventDefault();
  const numOfRoom = document.getElementById("numOfRooms").value;
  const setTime = document.getElementById("timeSetting").value;

  fetch("/api/breakoutroom", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meetingId,
      numOfRoom: parseInt(numOfRoom, 10),
      setTime: parseInt(setTime, 10),
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw response;
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
      breakoutroomModal.style.display = "none";
      errorMessageDiv.style.display = "none";
    })
    .catch((err) => {
      err.json().then((body) => {
        errorMessageDiv.textContent = body.message;
        errorMessageDiv.style.display = "block";
        setTimeout(() => {
          errorMessageDiv.style.display = "none";
        }, 2000);
      });
    });
};

const endCallBtn = document.querySelector(".end-call-wrap");
const leaveCallModal = document.querySelector(".top-box-show");
const cancelCallModel = document.querySelector(".call-cancel-action");
const meetingDetailsBtn = document.querySelector(".meeting-details-button");
endCallBtn.addEventListener("click", () => {
  leaveCallModal.style.display = "block";
});
cancelCallModel.addEventListener("click", () => {
  leaveCallModal.style.display = "none";
});
meetingDetailsBtn.addEventListener("click", () => {
  const detailsElement = document.querySelector(".g-details");
  console.log("meetingDetailsBtn is clicked");
  if (detailsElement.style.display === "block") {
    detailsElement.style.display = "none";
    meetingDetailsBtn.innerHTML = `<div class="display-center curosr-pointer meeting-details-button">
    Meeting Details<span class="material-icons">keyboard_arrow_down</span></div>`;
  } else {
    detailsElement.style.display = "block";
    meetingDetailsBtn.innerHTML = `<div class="display-center curosr-pointer meeting-details-button">
    Meeting Details<span class="material-icons">keyboard_arrow_up</span></div>`;
  }
});
