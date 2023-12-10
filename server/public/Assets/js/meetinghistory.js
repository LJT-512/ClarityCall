document.addEventListener("DOMContentLoaded", function () {
  fetchAggregatedInfo();
  fetchMeetingLogs();
});

function fetchAggregatedInfo() {
  fetch("/api/meetings/aggregated", { credentials: "include" })
    .then((response) => response.json())
    .then((data) => {
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
  const ctx = document
    .getElementById("most-meetings-contacts-chart")
    .getContext("2d");

  const baseDistance = 20;
  const angleStep = (2 * Math.PI) / apiData.length;

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const data = {
    datasets: [
      {
        label: "Most Frequent Contacts",
        data: apiData.map((contact, index) => {
          const angle = index * angleStep;
          const x = baseDistance * Math.cos(angle) + 50;
          const y = baseDistance * Math.sin(angle) + 50;

          return {
            x: x,
            y: y,
            r: Math.sqrt(contact.meeting_count) * 20,
            name: contact.name,
          };
        }),
        backgroundColor: apiData.map(() => getRandomColor()),
      },
    ],
  };

  new Chart(ctx, {
    type: "bubble",
    data: data,
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return Math.round(context.raw.r / 20);
            },
            title: function (context) {
              return context[0].raw.name;
            },
          },
        },
      },
      scales: {
        x: {
          display: false,
          min: 0,
          max: 100,
        },
        y: {
          display: false,
          min: 0,
          max: 100,
        },
      },
    },
  });
}

function renderMeetingLogs(meetingLogs) {
  const tableBody = document
    .getElementById("meetingDetailsTable")
    .querySelector("tbody");
  meetingLogs.forEach((log) => {
    const row = tableBody.insertRow();
    const participantsText = Array.isArray(log.participants)
      ? log.participants.join(", ")
      : "No participants";
    row.insertCell(0).textContent = log.meetingId;
    row.insertCell(1).textContent = log.startAt;
    row.insertCell(2).textContent = log.endAt;
    row.insertCell(3).textContent = log.duration;
    row.insertCell(4).textContent = participantsText;
    row.insertCell(5).textContent = log.subtitleLink;
    row.insertCell(6).textContent = log.summaryLink;
  });
}
