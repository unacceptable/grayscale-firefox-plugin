// Enhanced background script with timer, context menus, and analytics
let timerState = {
  active: false,
  timeLeft: 1500, // 25 minutes in seconds
  isBreak: false,
  intervalId: null
};

browser.runtime.onInstalled.addListener(() => {
  // Initialize storage with default state
  browser.storage.local.set({
    grayscaleEnabled: false,
    visualMode: 'grayscale',
    intensity: 100,
    whitelist: [],
    workDuration: 25,
    breakDuration: 5,
    focusStats: {},
    timerState: timerState
  });

  // Create context menus
  createContextMenus();
});

// Handle browser action click (if popup fails to load)
browser.browserAction.onClicked.addListener(async (tab) => {
  // Toggle grayscale state
  const result = await browser.storage.local.get(['grayscaleEnabled', 'visualMode', 'intensity']);
  const newState = !result.grayscaleEnabled;

  await browser.storage.local.set({
    grayscaleEnabled: newState
  });

  // Update all tabs
  await updateAllTabs({
    action: 'toggleGrayscale',
    enabled: newState,
    mode: result.visualMode || 'grayscale',
    intensity: result.intensity || 100
  });

  // Update browser action icon/title
  updateBrowserAction(newState, result.visualMode);
});

// Listen for keyboard shortcuts
browser.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-grayscale':
      const result = await browser.storage.local.get(['grayscaleEnabled', 'visualMode', 'intensity']);
      const newState = !result.grayscaleEnabled;

      await browser.storage.local.set({ grayscaleEnabled: newState });
      await updateAllTabs({
        action: 'toggleGrayscale',
        enabled: newState,
        mode: result.visualMode || 'grayscale',
        intensity: result.intensity || 100
      });

      updateBrowserAction(newState, result.visualMode);

      // Show notification
      browser.notifications.create({
        type: 'basic',
        iconUrl: 'src/assets/icons/icon-48.png',
        title: 'Grayscale Focus',
        message: `Visual focus ${newState ? 'enabled' : 'disabled'}`
      });
      break;

    case 'start-timer':
      handleTimerCommand('start');
      break;
  }
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'toggle-site':
      await toggleSiteWhitelist(tab.url);
      break;
    case 'toggle-mode':
      await toggleVisualMode();
      break;
    case 'start-timer':
      handleTimerCommand('start');
      break;
  }
});

// Handle messages from popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  switch (message.action) {
    case 'startTimer':
      startTimer(message.workDuration, message.breakDuration);
      break;
    case 'pauseTimer':
      pauseTimer();
      break;
    case 'resetTimer':
      resetTimer();
      break;
  }
});

// Listen for storage changes to update icon
browser.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.grayscaleEnabled) {
    const visualMode = changes.visualMode?.newValue || 'grayscale';
    updateBrowserAction(changes.grayscaleEnabled.newValue, visualMode);
  }
});

// Timer functions
function startTimer(workDuration = 25, breakDuration = 5) {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }

  timerState.active = true;
  timerState.timeLeft = workDuration * 60;
  timerState.isBreak = false;

  timerState.intervalId = setInterval(async () => {
    timerState.timeLeft--;

    // Send update to popup if open
    try {
      browser.runtime.sendMessage({
        action: 'timerUpdate',
        timeLeft: timerState.timeLeft,
        active: timerState.active,
        isBreak: timerState.isBreak
      });
    } catch (e) {
      // Popup might be closed
    }

    if (timerState.timeLeft <= 0) {
      // Timer finished
      clearInterval(timerState.intervalId);
      timerState.active = false;

      if (!timerState.isBreak) {
        // Work session finished, start break
        browser.notifications.create({
          type: 'basic',
          iconUrl: 'src/assets/icons/icon-48.png',
          title: 'Focus Session Complete!',
          message: `Great work! Time for a ${breakDuration} minute break.`
        });

        // Start break timer
        timerState.isBreak = true;
        timerState.timeLeft = breakDuration * 60;
        timerState.active = true;
        startTimer(workDuration, breakDuration);
      } else {
        // Break finished
        browser.notifications.create({
          type: 'basic',
          iconUrl: 'src/assets/icons/icon-48.png',
          title: 'Break Complete!',
          message: 'Ready for another focus session?'
        });
      }

      // Update stats
      await updateFocusStats(!timerState.isBreak);
    }

    // Save state
    await browser.storage.local.set({ timerState });
  }, 1000);
}

function pauseTimer() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
  timerState.active = false;
  browser.storage.local.set({ timerState });
}

function resetTimer() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
  timerState.active = false;
  timerState.timeLeft = 1500; // Reset to 25 minutes
  timerState.isBreak = false;
  browser.storage.local.set({ timerState });
}

// Context menu creation
function createContextMenus() {
  browser.contextMenus.create({
    id: 'toggle-site',
    title: 'Toggle site whitelist',
    contexts: ['page']
  });

  browser.contextMenus.create({
    id: 'toggle-mode',
    title: 'Switch visual mode',
    contexts: ['page']
  });

  browser.contextMenus.create({
    id: 'start-timer',
    title: 'Start focus timer',
    contexts: ['page']
  });
}

// Utility functions
async function updateAllTabs(message) {
  try {
    const tabs = await browser.tabs.query({});
    const promises = tabs.map(tab =>
      browser.tabs.sendMessage(tab.id, message).catch(() => {
        // Ignore errors for tabs that can't receive messages
      })
    );
    await Promise.all(promises);
  } catch (error) {
    console.error('Error updating tabs:', error);
  }
}

async function toggleSiteWhitelist(url) {
  const hostname = new URL(url).hostname;
  const result = await browser.storage.local.get(['whitelist']);
  const whitelist = result.whitelist || [];

  const index = whitelist.indexOf(hostname);
  if (index > -1) {
    whitelist.splice(index, 1);
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'src/assets/icons/icon-48.png',
      title: 'Site Removed from Whitelist',
      message: `${hostname} will now be affected by visual focus`
    });
  } else {
    whitelist.push(hostname);
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'src/assets/icons/icon-48.png',
      title: 'Site Added to Whitelist',
      message: `${hostname} will be exempt from visual focus`
    });
  }

  await browser.storage.local.set({ whitelist });
}

async function toggleVisualMode() {
  const result = await browser.storage.local.get(['visualMode', 'grayscaleEnabled']);
  const modes = ['grayscale', 'sepia', 'blur', 'contrast', 'desaturate'];
  const currentIndex = modes.indexOf(result.visualMode || 'grayscale');
  const nextMode = modes[(currentIndex + 1) % modes.length];

  await browser.storage.local.set({ visualMode: nextMode });

  if (result.grayscaleEnabled) {
    await updateAllTabs({
      action: 'updateVisualMode',
      mode: nextMode,
      intensity: 100
    });
  }

  browser.notifications.create({
    type: 'basic',
    iconUrl: 'src/assets/icons/icon-48.png',
    title: 'Visual Mode Changed',
    message: `Switched to ${nextMode} mode`
  });
}

async function handleTimerCommand(command) {
  const result = await browser.storage.local.get(['workDuration']);
  const workDuration = result.workDuration || 25;

  if (command === 'start') {
    startTimer(workDuration, 5);
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'src/assets/icons/icon-48.png',
      title: 'Focus Timer Started',
      message: `${workDuration} minute focus session started`
    });
  }
}

async function updateFocusStats(wasWorkSession) {
  const result = await browser.storage.local.get(['focusStats']);
  const stats = result.focusStats || {};
  const today = new Date().toDateString();

  if (!stats[today]) {
    stats[today] = { totalTime: 0, sessions: 0 };
  }

  if (wasWorkSession) {
    const workDuration = (await browser.storage.local.get(['workDuration'])).workDuration || 25;
    stats[today].totalTime += workDuration * 60 * 1000; // Convert to milliseconds
    stats[today].sessions += 1;
  }

  await browser.storage.local.set({ focusStats: stats });
}

function updateBrowserAction(enabled, visualMode = 'grayscale') {
  const title = enabled ? `Grayscale Focus (ON - ${visualMode})` : 'Grayscale Focus (OFF)';
  browser.browserAction.setTitle({ title });

  browser.browserAction.setIcon({
    path: {
      "16": "src/assets/icons/icon-16.png",
      "32": "src/assets/icons/icon-32.png",
      "48": "src/assets/icons/icon-48.png",
      "128": "src/assets/icons/icon-128.png"
    }
  }).catch((error) => {
    console.log('Icon update failed:', error);
  });
}
