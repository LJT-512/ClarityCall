export function addUser(otherUserUsername, connId, userNumber) {
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

  const outputCanvas = clonedDiv.querySelector(".output-canvas");
  outputCanvas.setAttribute("id", "mc_" + connId);

  const drawingCanvas = clonedDiv.querySelector(".drawing-canvas");
  drawingCanvas.setAttribute("id", "dc_" + connId);

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

  const participantCounts = document.querySelectorAll(".participant-count");
  participantCounts.forEach((countElement) => {
    countElement.textContent = userNumber;
  });
}

export function adjustUserBoxSize(userNumber) {
  const userBoxes = document.querySelectorAll(".userbox");
  const maxHeight = userNumber <= 2 ? "80vh" : "40vh";

  userBoxes.forEach((userBox) => {
    userBox.style.maxHeight = maxHeight;
  });
}

export function showMeetingToast(username, message) {
  const toast = document.getElementById("toast-notification");
  const toastName = document.getElementById("toast-username");
  const toastMsg = document.getElementById("toast-msg");

  toastName.textContent = username;
  toastMsg.textContent = message;

  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";
  toast.style.transition = "opacity 0.5s ease-in-out";

  setTimeout(() => {
    toast.style.opacity = "0";
  }, 5000);
}
