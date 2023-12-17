document.addEventListener("DOMContentLoaded", async function () {
  document.querySelectorAll(".new-meeting").forEach((button) => {
    button.addEventListener("click", () => {
      const eight_d_value =
        Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;
      const meetingUrl = window.location.origin + "?meetingId=" + eight_d_value;
      window.location.replace(meetingUrl);
    });
  });

  await checkUserAuthentication();
  fetchAggregatedInfo();
  fetchMeetingLogs();
});

function checkUserAuthentication() {
  const signInNavItem = document.querySelector(".nav-item.sign-in");
  const userBlock = document.querySelector(".user-block");
  const usernameDiv = document.querySelector(".username.user-info");

  fetch("/api/user/info", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.username) {
        signInNavItem.style.display = "none";
        userBlock.style.display = "flex";
        usernameDiv.textContent = data.username;
      } else {
        signInNavItem.style.display = "flex";
        userBlock.style.display = "none";
      }
    })
    .catch((error) => {
      console.error("Error fetching user info:", error);
      signInNavItem.style.display = "flex";
      userBlock.style.display = "none";
    });
}

function fetchAggregatedInfo() {
  const container = document.querySelector(".container");
  const noDataDiv = document.querySelector(".no-data");

  fetch("/api/meetings/aggregated", { credentials: "include" })
    .then((response) => response.json())
    .then((data) => {
      if (
        data.avgMeetingLengthPerWeekDay.length == 0 &&
        data.avgMeetingStatsPerMonth.length == 0 &&
        data.mostFrequentContacts.length == 0
      ) {
        noDataDiv.style.display = "block";
        container.style.display = "none";
        return;
      }
      renderAvgMeetingLength(data.avgMeetingLengthPerWeekDay);
      renderAvgMeetingStats(data.avgMeetingStatsPerMonth);
      renderMostFrequentContacts(data.mostFrequentContacts);
    })
    .catch((err) => console.error("Error fetching aggregated info:", err));
}

function fetchMeetingLogs() {
  fetch("/api/meetings/logs", { credentials: "include" })
    .then((response) => response.json())
    .then((data) => {
      renderMeetingLogs(data.meetingLogs);
    })
    .catch((err) => console.error("Error fetching aggregated info:", err));
}

function renderAvgMeetingLength(apiData) {
  const labels = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const data = new Array(7).fill(0);

  apiData.forEach((item) => {
    const dayIndex = parseInt(item.day_of_week, 10);
    const averageLength = parseFloat(item.average_length_minutes);
    data[dayIndex] = averageLength;
  });

  const ctx = document.getElementById("meetingChart");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Average Meeting Length (minutes)",
          data: data,
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Average Length (minutes)",
          },
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  });
}

const colors = ["#e8ddb5", "#b2c9ab", "#92b6b1", "#788aa3", "#666a86"];
let counter = 0;

function getRandomColorFromList() {
  if (counter > 4) {
    counter = 0;
  }
  const color = colors[counter];
  counter++;
  return color;
}

function renderAvgMeetingStats(apiData) {
  const tableBody = document
    .getElementById("avg-meeting-stats-table")
    .getElementsByTagName("tbody")[0];
  tableBody.innerHTML = "";
  apiData.forEach((monthData) => {
    const row = tableBody.insertRow();

    const monthCell = row.insertCell(0);
    const avgLengthCell = row.insertCell(1);
    const avgNumberCell = row.insertCell(2);
    const avgLengthPerMeetingCell = row.insertCell(3);

    monthCell.textContent = monthData.month;
    avgLengthCell.textContent = parseFloat(
      monthData.average_length_minutes
    ).toFixed(2);
    avgNumberCell.textContent = monthData.total_meetings;
    avgLengthPerMeetingCell.textContent = parseFloat(
      avgLengthCell.textContent / avgNumberCell.textContent
    ).toFixed(2);
  });
}

function renderMostFrequentContacts(apiData) {
  const container = d3.select("#most-meetings-contacts-chart");
  const width = container.node().getBoundingClientRect().width;
  const height = width;

  d3.select("#most-meetings-contacts-chart").select("svg").remove();

  const svg = d3
    .select("#most-meetings-contacts-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(apiData, (d) => d.meeting_count)])
    .range([0, 50]);

  const simulation = d3
    .forceSimulation(apiData)
    .force("x", d3.forceX(width / 2).strength(0.05))
    .force("y", d3.forceY(height / 2).strength(0.05))
    .force(
      "collide",
      d3.forceCollide((d) => radiusScale(d.meeting_count))
    )
    .stop();

  simulation.tick(300);

  const bubbleGroups = svg
    .selectAll(".bubble-group")
    .data(apiData)
    .enter()
    .append("g")
    .attr("class", "bubble-group")
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

  bubbleGroups
    .append("circle")
    .attr("class", "bubble")
    .attr("r", (d) => radiusScale(d.meeting_count))
    .style("fill", getRandomColorFromList);

  bubbleGroups
    .append("text")
    .attr("class", "label")
    .attr("dy", "0em")
    .text((d) => d.name)
    .style("text-anchor", "middle");

  bubbleGroups
    .append("text")
    .attr("class", "label")
    .attr("dy", "1.2em")
    .text((d) => `${d.meeting_count}`)
    .style("text-anchor", "middle");
}

function renderMeetingLogs(meetingLogs) {
  const tableBody = document
    .getElementById("meetingDetailsTable")
    .querySelector("tbody");
  meetingLogs.forEach((log) => {
    const row = tableBody.insertRow();

    let startTime = new Date(log.startAt)
      .toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", "");
    let endTime;

    if (log.endAt) {
      endTime = new Date(log.endAt)
        .toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(",", "");
    } else {
      endTime = "N/A";
    }

    const participantsText = Array.isArray(log.participants)
      ? log.participants.join(", ")
      : "No participants";

    row.insertCell(0).textContent = log.meetingId;
    row.insertCell(1).textContent = startTime;
    row.insertCell(2).textContent = endTime;
    row.insertCell(3).textContent = log.duration;
    row.insertCell(4).textContent = participantsText;
    row.insertCell(5);
    row.insertCell(6);

    if (row.cells[5] && row.cells[6]) {
      const transcriptButton = createButton(
        "Transcript",
        "transcript-button",
        log.subtitleLink
      );
      row.cells[5].appendChild(transcriptButton);
      const summaryButton = createButton(
        "Summary",
        "summary-button",
        log.summaryLink
      );
      row.cells[6].appendChild(summaryButton);
    } else {
      console.error("Cells are not created properly");
    }
  });
}

function createButton(text, className, link) {
  const button = document.createElement("button");
  button.className = className;
  button.textContent = text;
  button.dataset.link = link;
  button.classList.add = "btn-outline-secondary";
  button.addEventListener("click", buttonClickHandler);
  return button;
}

function buttonClickHandler(event) {
  const apiUrl = event.target.dataset.link;
  const dataType = event.target.classList.contains("transcript-button")
    ? "transcript"
    : "summary";
  console.log("apiUrl", apiUrl);

  fetch(apiUrl, { credentials: "include" })
    .then((response) => response.json())
    .then((data) => {
      console.log("data after triggering button", data);
      openModal(data, dataType);
    })
    .catch((err) => console.error("Error fetching data:", err));
}

function openModal(data, dataType) {
  const modalBackgroud = document.querySelector(".modal-background");
  const modalContent = document.querySelector(".modal-content");
  const modalTitle = document.getElementById("modal-title");
  modalContent.innerHTML = "";

  if (dataType === "transcript") {
    modalTitle.textContent = "Transcription";
    if (data.meetingSubtitles.length == 0) {
      let noSubtitleDiv = document.createElement("div");
      noSubtitleDiv.textContent =
        "There's no transcription available for this meeting.";
      modalContent.appendChild(noSubtitleDiv);
    } else {
      data.meetingSubtitles.forEach((sub) => {
        let subtitleDiv = document.createElement("div");
        subtitleDiv.classList.add("subtitle");

        let time = new Date(sub.time)
          .toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          .replace(",", "");

        let usernameSpan = document.createElement("span");
        usernameSpan.classList.add("username");
        usernameSpan.textContent = sub.username;
        subtitleDiv.appendChild(usernameSpan);

        let timeSpan = document.createElement("span");
        timeSpan.classList.add("time");
        timeSpan.textContent = ` ${time}: `;

        subtitleDiv.appendChild(timeSpan);
        subtitleDiv.append(sub.subtitle);
        modalContent.appendChild(subtitleDiv);
        modalContent.appendChild(subtitleDiv);
      });
    }
  } else if (dataType === "summary") {
    modalTitle.textContent = "Summary";
    let summaryDiv = document.createElement("div");
    summaryDiv.classList.add("summary");
    summaryDiv.textContent = data.meetingSummary;
    modalContent.appendChild(summaryDiv);
  }

  modalBackgroud.style.display = "flex";
}

function closeModal() {
  document.querySelector(".modal-background").style.display = "none";
}
