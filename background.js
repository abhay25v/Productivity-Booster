// Timer State
let timerState = {
    timeLeft: 25 * 60, // 25 minutes
    isRunning: false,
  };
  
  // Blocked Websites
  let blockedSites = [];
  
  // Notes
  let notes = [];
  
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
      case "getTimerState":
        sendResponse(timerState);
        sendResponse({ success: true });
        break;
  
      /** Website Blocker Functions */
      case "blockSite":
        blockSite(message.site);
        break;
      case "unblockSite":
        unblockSite(message.site);
        break;
  
      /** Notes Functions */
      case "addNote":
        addNote(message.note);
        break;
      case "deleteNote":
        deleteNote(message.note);
        break;
    }
    return true;
  });

  function notifyPopup() {
    chrome.runtime.sendMessage({ type: "updateTimerState", state: timerState });
  }
  
  // Timer Logic
  function startTimer() {
  if (timerState.isRunning) return;
  timerState.isRunning = true;
  chrome.alarms.create("pomodoroTimer", { delayInMinutes: timerState.timeLeft / 60 });
  notifyPopup();
  saveState();
}
  
function pauseTimer() {
    chrome.alarms.clear("pomodoroTimer");
    timerState.isRunning = false;
    notifyPopup();
    saveState();
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
  
//   chrome.runtime.onInstalled.addListener(() => {
    //    loadState(notifyPopup);
//   });
  
//   chrome.runtime.onStartup.addListener(() => {
//     loadState(notifyPopup);
//   });
  
  
  
  // Website Blocker Logic
  function blockSite(site) {
    if (!blockedSites.includes(site)) {
      blockedSites.push(site);
      updateBlockedRules();
      saveState();
    }
  }
  
  function unblockSite(site) {
    blockedSites = blockedSites.filter((s) => s !== site);
    updateBlockedRules();
    saveState();
  }
  
  function updateBlockedRules() {
    const rules = blockedSites.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: "block" },
      condition: { urlFilter: site },
    }));
  
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((rule) => rule.id),
      addRules: rules,
    });
  }
  
  // Notes Logic
  function addNote(note) {
    if (!notes.includes(note)) {
      notes.push(note);
      saveState();
    }
  }
  
  function deleteNote(note) {
    notes = notes.filter((n) => n !== note);
    saveState();
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
   
      updateBlockedRules();
    });
  });
  
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["timerState", "blockedSites", "notes"], (data) => {
      if (data.timerState) timerState = data.timerState;
      // if (data.timerState) timerState = loadState(notifyPopup);
      if (data.blockedSites) blockedSites = data.blockedSites;
      if (data.notes) notes = data.notes;
      
      updateBlockedRules();
    });
  });
  