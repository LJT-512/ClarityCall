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
    console.log("username:", username);
    if (!username) throw new Error("Username not found");

    const meetingContainer = document.getElementById("meetingContainer");
    if (meetingContainer) meetingContainer.style.display = "block";
    document.querySelector("#me h2").textContent = username + " (me)";
    document.title = username;
    eventProcessForSignalingServer(socket, username, meetingId);
    eventHandling(username);
  } catch (err) {
    console.error(err);
  }
}

let socket;
let username;
socket = io.connect();
window.socket = socket;

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM fully loaded and parsed");
  await initApp();

  setupUIInteractions();
});

function setupUIInteractions() {
  setupHeadingToggle(
    ".people-heading",
    ".chat-show-wrap",
    ".in-call-wrap-up",
    "active"
  );
  setupHeadingToggle(
    ".chat-heading",
    ".in-call-wrap-up",
    ".chat-show-wrap",
    "active"
  );
  setupClickEvent(
    ".meeting-heading-cross",
    ".g-right-details-wrap",
    "add",
    "transition",
    "d-none"
  );
  setupClickEvent(
    ".top-left-participant-wrap",
    ".g-right-details-wrap",
    "remove",
    "transition",
    "d-none"
  );
  setupClickEvent(
    ".top-left-chat-wrap",
    ".g-right-details-wrap",
    "remove",
    "transition",
    "d-none"
  );
}

function setupHeadingToggle(
  clickSelector,
  hideSelector,
  showSelector,
  activeClass
) {
  const clickElement = document.querySelector(clickSelector);
  const hideElement = document.querySelector(hideSelector);
  const showElement = document.querySelector(showSelector);

  if (clickElement && hideElement && showElement) {
    clickElement.addEventListener("click", () => {
      toggleElements(hideElement, showElement, activeClass);
    });
  }
}

function toggleElements(hideElement, showElement, activeClass) {
  hideElement.classList.add("transition");
  setTimeout(() => {
    hideElement.style.display = "none";
    showElement.style.display = "block";
  }, 300);
  showElement.classList.remove("transition");
  showElement.classList.add(activeClass);
}

function setupClickEvent(clickSelector, targetSelector, action, ...classes) {
  const clickElement = document.querySelector(clickSelector);
  const targetElement = document.querySelector(targetSelector);

  if (clickElement && targetElement) {
    clickElement.addEventListener("click", () => {
      if (action === "add") {
        classes.forEach((cls) => targetElement.classList.add(cls));
      } else if (action === "remove") {
        classes.forEach((cls) => targetElement.classList.remove(cls));
      }
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
