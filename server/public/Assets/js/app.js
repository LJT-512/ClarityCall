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

// const peopleHeading = document.querySelector(".people-heading");
// if (peopleHeading) {
//   peopleHeading.addEventListener("click", () => {
//     console.log("peopleHeading is clicked.");
//     const chatShowWrap = document.querySelector(".chat-show-wrap");
//     const inCallWrapUp = document.querySelector(".in-call-wrap-up");
//     peopleHeading.classList.add("active");
//     chatHeading.classList.remove("active");

//     if (chatShowWrap) {
//       chatShowWrap.classList.add("transition");
//       setTimeout(() => {
//         chatShowWrap.style.display = "none";
//         chatShowWrap.classList.remove("d-flex");
//       }, 300);
//     }

//     if (inCallWrapUp) {
//       inCallWrapUp.classList.remove("transition");

//       setTimeout(() => {
//         inCallWrapUp.style.display = "block";
//       }, 0);
//     }
//   });
// } else {
//   console.error('The element with "people-heading" not found.');
// }

// const chatHeading = document.querySelector(".chat-heading");
// if (chatHeading) {
//   chatHeading.addEventListener("click", () => {
//     const chatShowWrap = document.querySelector(".chat-show-wrap");
//     const inCallWrapUp = document.querySelector(".in-call-wrap-up");
//     peopleHeading.classList.remove("active");
//     chatHeading.classList.add("active");

//     if (chatShowWrap) {
//       chatShowWrap.classList.remove("transition");
//       setTimeout(() => {
//         chatShowWrap.style.display = "flex";
//       }, 0);
//     }

//     if (inCallWrapUp) {
//       inCallWrapUp.classList.add("transition");
//       setTimeout(() => {
//         inCallWrapUp.style.display = "none";
//       }, 0);
//     }
//   });
// } else {
//   console.error('The element with "chat-heading" not found.');
// }

// const meetingHeadingCross = document.querySelector(".meeting-heading-cross");
// const meetingDetailsWrap = document.querySelector(".g-right-details-wrap");
// if (meetingHeadingCross) {
//   meetingHeadingCross.addEventListener("click", () => {
//     meetingDetailsWrap.classList.add("transition");
//     meetingDetailsWrap.classList.add("d-none");
//   });
// } else {
//   console.error('The element with "meeting-heading-cross" not found.');
// }
// const participantWrap = document.querySelector(".top-left-participant-wrap");

// if (participantWrap) {
//   participantWrap.addEventListener("click", () => {
//     peopleHeading.classList.add("active");
//     chatHeading.classList.remove("active");
//     meetingDetailsWrap.classList.remove("transition");
//     meetingDetailsWrap.classList.remove("d-none");
//     if (chatShowWrap) {
//       chatShowWrap.classList.add("transition");
//       setTimeout(() => {
//         chatShowWrap.style.display = "none";
//         chatShowWrap.classList.remove("d-flex");
//       }, 300);
//     }

//     if (inCallWrapUp) {
//       inCallWrapUp.classList.remove("transition");

//       setTimeout(() => {
//         inCallWrapUp.style.display = "block";
//       }, 0);
//     }
//   });
// } else {
//   console.error('The element with "top-left-participant-wrap" not found.');
// }

// const chatWrap = document.querySelector(".top-left-chat-wrap");

// if (chatWrap) {
//   chatWrap.addEventListener("click", () => {
//     meetingDetailsWrap.classList.remove("transition");
//     meetingDetailsWrap.classList.remove("d-none");
//     peopleHeading.classList.remove("active");
//     chatHeading.classList.add("active");

//     if (chatShowWrap) {
//       chatShowWrap.classList.remove("transition");
//       setTimeout(() => {
//         chatShowWrap.style.display = "flex";
//       }, 0);
//     }

//     if (inCallWrapUp) {
//       inCallWrapUp.classList.add("transition");
//       setTimeout(() => {
//         inCallWrapUp.style.display = "none";
//       }, 0);
//     }
//   });
// } else {
//   console.error('The element with "top-left-participant-wrap" not found.');
// }

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
