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
