// Pomodoro Timer Variables
const minutesDisplay = document.getElementById("minutes");
const secondsDisplay = document.getElementById("seconds");
const startButton = document.getElementById("start");
const pauseButton = document.getElementById("pause");
const resetButton = document.getElementById("reset");
const customTimeInput = document.getElementById("custom-time");
const setTimerButton = document.getElementById("set-timer");

// Website Blocker Variables
const blockInput = document.getElementById("block-input");
const blockAddButton = document.getElementById("block-add");
const blockList = document.getElementById("block-list");

// To-Do List Variables
const noteInput = document.getElementById("note-input");
const addNoteButton = document.getElementById("add-note");
const noteList = document.getElementById("note-list");

// Feature List Variables
const featureButtons = document.querySelectorAll(".feature-button");
const featureSections = document.querySelectorAll(".feature-section");

// Show the selected feature section
featureButtons.forEach(button => {
  button.addEventListener("click", () => {
    const feature = button.getAttribute("data-feature");
    featureSections.forEach(section => {
      section.classList.add("hidden");
      section.classList.remove("visible");
    });
    document.getElementById(feature).classList.remove("hidden");
    document.getElementById(feature).classList.add("visible");
  });
});

/** --------------------------
    POMODORO TIMER FUNCTIONS
----------------------------- */
// Sync Timer State
function syncTimerState() {
  chrome.runtime.sendMessage({ type: "getTimerState" }, (state) => {
    // Handle case where popup closes before receiving a response
    if (chrome.runtime.lastError) {
      console.warn("Error syncing timer state:", chrome.runtime.lastError.message);
      return;
    }

    if (state) {
      const minutes = Math.floor(state.timeLeft / 60);
      const seconds = state.timeLeft % 60;
      minutesDisplay.textContent = minutes;
      secondsDisplay.textContent = seconds < 10 ? `0${seconds}` : seconds;

      startButton.disabled = state.isRunning;
      pauseButton.disabled = !state.isRunning;
    } else {
      // Default display
      minutesDisplay.textContent = 25;
      secondsDisplay.textContent = "00";
    }
  });
}

// Listen for updates from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "updateTimerState") {
    const { timeLeft, isRunning } = message.state;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    minutesDisplay.textContent = minutes;
    secondsDisplay.textContent = seconds < 10 ? `0${seconds}` : seconds;

    startButton.disabled = isRunning;
    pauseButton.disabled = !isRunning;
  }
});

// Timer Event Listeners
startButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "startTimer" }, () => {
    if (chrome.runtime.lastError) {
      console.warn("Error starting timer:", chrome.runtime.lastError.message);
    } else {
      syncTimerState();
    }
  });
});

pauseButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "pauseTimer" }, () => {
    if (chrome.runtime.lastError) {
      console.warn("Error pausing timer:", chrome.runtime.lastError.message);
    } else {
      syncTimerState();
    }
  });
});

resetButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "resetTimer" }, () => {
    if (chrome.runtime.lastError) {
      console.warn("Error resetting timer:", chrome.runtime.lastError.message);
    } else {
      syncTimerState();
    }
  });
});

setTimerButton.addEventListener("click", () => {
  const customTime = parseInt(customTimeInput.value, 10);
  if (!isNaN(customTime) && customTime > 0) {
    chrome.runtime.sendMessage({ type: "setCustomTimer", time: customTime * 60 }, () => {
      if (chrome.runtime.lastError) {
        console.warn("Error setting custom timer:", chrome.runtime.lastError.message);
      } else {
        syncTimerState();
        customTimeInput.value = "";
      }
    });
  } else {
    alert("Please enter a valid number of minutes!");
  }
});

/** -------------------------
    WEBSITE BLOCKER FUNCTIONS
---------------------------- */
// Load Blocked Websites
function loadBlockedSites() {
  chrome.storage.local.get("blockedSites", (data) => {
    const blockedSites = data.blockedSites || [];
    blockedSites.forEach((site) => addBlockedSiteToUI(site));
  });
}

// Add Blocked Site to UI
function addBlockedSiteToUI(site) {
  const li = document.createElement("li");
  li.textContent = site;

  const unblockButton = document.createElement("button");
  unblockButton.textContent = "Unblock";
  unblockButton.style.marginLeft = "10px";
  unblockButton.addEventListener("click", () => {
    removeBlockedSite(site);
    li.remove();
  });

  li.appendChild(unblockButton);
  blockList.appendChild(li);
}

// Add/Remove Blocked Sites
blockAddButton.addEventListener("click", () => {
  const site = blockInput.value.trim();
  if (site) {
    chrome.runtime.sendMessage({ type: "blockSite", site }, () => {
      addBlockedSiteToUI(site);
      blockInput.value = "";
    });
  }
});

function removeBlockedSite(site) {
  chrome.runtime.sendMessage({ type: "unblockSite", site });
}

/** --------------------------
    TO-DO LIST FUNCTIONS
----------------------------- */
// Load Notes
function loadNotes() {
  chrome.storage.local.get("notes", (data) => {
    const notes = data.notes || [];
    notes.forEach((note) => addNoteToUI(note));
  });
}

// Add Note to UI
function addNoteToUI(note) {
  const li = document.createElement("li");
  li.textContent = note;

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete";
  deleteButton.style.marginLeft = "10px";
  deleteButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "deleteNote", note });
    li.remove();
  });

  li.appendChild(deleteButton);
  noteList.appendChild(li);
}

// Add Note
addNoteButton.addEventListener("click", () => {
  const note = noteInput.value.trim();
  if (note) {
    chrome.runtime.sendMessage({ type: "addNote", note }, () => {
      addNoteToUI(note);
      noteInput.value = "";
    });
  }
});

// Initialize Popup
syncTimerState();
loadBlockedSites();
loadNotes();