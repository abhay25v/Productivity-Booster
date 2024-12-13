// Timer State
let timerState = {
  timeLeft: 25 * 60, // 25 minutes
  isRunning: false,
  intervalId: null,
};

// Blocked Websites
let blockedSites = [];

// Retrieve blocked sites from storage on startup
chrome.storage.local.get("blockedSites", (result) => {
  if (chrome.runtime.lastError) {
    console.warn("Error retrieving blocked sites:", chrome.runtime.lastError.message);
  } else {
    blockedSites = result.blockedSites || [];
    updateBlockingRules();
  }
});

// Notes
let notes = [];

// Load the saved state when the extension starts
chrome.runtime.onStartup.addListener(() => {
  loadState();
  loadBlockedSites();
  loadNotes();
});

// Load the saved state when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  loadState();
  loadBlockedSites();
  loadNotes();
});

function loadState() {
  chrome.storage.local.get("timerState", (data) => {
    if (data.timerState) {
      timerState = data.timerState;
      // Validate timeLeft
      if (isNaN(timerState.timeLeft) || timerState.timeLeft < 0) {
        timerState.timeLeft = 25 * 60; // Reset to default 25 minutes
      }
      if (timerState.isRunning) {
        startTimer();
      }
    } else {
      saveState(); // Save the default state if no state is found
    }
  });
}

function saveState() {
  chrome.storage.local.set({ timerState: timerState }, () => {
    console.log("Timer state saved.");
  });
}

function loadBlockedSites() {
  chrome.storage.local.get("blockedSites", (data) => {
    if (data.blockedSites) {
      blockedSites = data.blockedSites;
      updateBlockingRules();
    }
  });
}

function saveBlockedSites() {
  chrome.storage.local.set({ blockedSites }, () => {
    if (chrome.runtime.lastError) {
      console.warn("Error saving blocked sites:", chrome.runtime.lastError.message);
    } else {
      console.log("Blocked sites saved successfully.");
    }
  });
}

function loadNotes() {
  chrome.storage.local.get("notes", (data) => {
    if (data.notes) {
      notes = data.notes;
    }
  });
}

function saveNotes() {
  chrome.storage.local.set({ notes: notes }, () => {
    console.log("Notes saved.");
  });
}

function notifyPopup() {
  chrome.runtime.sendMessage({ type: "updateTimerState", state: timerState });
}

// Timer Logic
function startTimer() {
  if (timerState.isRunning) return;
  timerState.isRunning = true;
  timerState.intervalId = setInterval(() => {
    if (timerState.timeLeft > 0) {
      timerState.timeLeft--;
      notifyPopup();
      saveState();
    } else {
      clearInterval(timerState.intervalId);
      timerState.isRunning = false;
      chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icon128.png",
        title: "Pomodoro Timer",
        message: "Time's up! Take a break or start another session."
      });
      resetTimer();
    }
  }, 1000);
  notifyPopup();
  saveState();
}

function pauseTimer() {
  if (timerState.isRunning) {
    clearInterval(timerState.intervalId);
    timerState.isRunning = false;
    notifyPopup();
    saveState();
  }
}

function resetTimer() {
  pauseTimer();
  timerState.timeLeft = 25 * 60;
  notifyPopup();
  saveState();
}

function setCustomTimer(time) {
  pauseTimer();
  timerState.timeLeft = time;
  notifyPopup();
  saveState();
}

// Handle Messages from Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    /** Timer Functions */
    case "startTimer":
      startTimer();
      sendResponse({ success: true });
      break;
    case "pauseTimer":
      pauseTimer();
      sendResponse({ success: true });
      break;
    case "resetTimer":
      resetTimer();
      sendResponse({ success: true });
      break;
    case "setCustomTimer":
      setCustomTimer(message.time);
      sendResponse({ success: true });
      break;
    /** Blocked Sites Functions */
    case "blockSite":
      // blockedSites.push(message.site);
      blockSite(message.site);
      sendResponse({ success: true });
      break;
    case "unblockSite":
      // blockedSites = blockedSites.filter(site => site !== message.site);
      unblockSite(message.site);
      sendResponse({ success: true });
      break;
    /** Notes Functions */
    case "addNote":
      notes.push(message.note);
      saveNotes();
      sendResponse({ success: true });
      break;
    case "deleteNote":
      notes = notes.filter(note => note !== message.note);
      saveNotes();
      sendResponse({ success: true });
      break;
    case "getTimerState":
      sendResponse(timerState);
      break;
    case "getBlockedSites":
      sendResponse(blockedSites);
      break;
    case "getNotes":
      sendResponse(notes);
      break;
    default:
      sendResponse({ success: false });
      break;
  }
  return true;
});

// Website Blocker Logic
function blockSite(site) {
  const formattedSite = formatSite(site);
  if (!blockedSites.includes(formattedSite)) {
    blockedSites.push(formattedSite);
    saveBlockedSites();
    updateBlockingRules();
  }
}

function unblockSite(site) {
  const formattedSite = formatSite(site);
  blockedSites = blockedSites.filter((s) => s !== formattedSite);
  saveBlockedSites();
  updateBlockingRules();
}

// Format Site URL
function formatSite(site) {
  site = site.trim().replace(/\/$/, ""); // Remove trailing slashes
  if (!site.startsWith("http://") && !site.startsWith("https://")) {
    site = `*://${site}/*`; // Add wildcard protocol and path
  } else {
    site = site.replace(/^https?:\/\//, "*://"); // Replace protocol with wildcard
    if (!site.endsWith("/*")) {
      site += "/*"; // Add path wildcard
    }
  }
  return site;
}

// Update Blocking Rules
function updateBlockingRules() {
  const rules = blockedSites.map((site, index) => ({
    id: index + 1, // Rule ID must be unique
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: site }
  }));

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: blockedSites.map((_, index) => index + 1),
    addRules: rules
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn("Error updating blocking rules:", chrome.runtime.lastError.message);
    } else {
      console.log("Blocking rules updated.");
    }
  });
}

function blockRequest(details) {
  console.log(`Blocking request to: ${details.url}`);
  return { cancel: true };
}



// Notes Logic
function addNote(note) {
  if (!notes.includes(note)) {
    notes.push(note);
    saveNotes();
  }
}

function deleteNote(note) {
  notes = notes.filter(n => n !== note);
  saveNotes();
}

// Handle Timer Alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoroTimer") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "assets/icon128.png",
      title: "Pomodoro Timer",
      message: "Time's up! Take a break or start another session.",
    });
    resetTimer();
  }
});

function loadState(callback) {
  chrome.storage.local.get("timerState", (data) => {
    if (data.timerState) {
      timerState = data.timerState;
    }
    if (callback) callback(timerState);
  });
}
// Save State
function saveState() {
  chrome.storage.local.set({ timerState, blockedSites, notes });
}

// Load State on Startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(["timerState", "blockedSites", "notes"], (data) => {
    if (data.timerState) timerState = data.timerState;
    // if (data.timerState) loadState(notifyPopup);
    if (data.blockedSites) blockedSites = data.blockedSites;
    if (data.notes) notes = data.notes;

    updateBlockingRules();
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["timerState", "blockedSites", "notes"], (data) => {
    if (data.timerState) timerState = data.timerState;
    // if (data.timerState) timerState = loadState(notifyPopup);
    if (data.blockedSites) blockedSites = data.blockedSites;
    if (data.notes) notes = data.notes;

    updateBlockingRules();
  });
});
