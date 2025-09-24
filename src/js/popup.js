// Enhanced popup script with advanced features

// Wildcard matching function for whitelist patterns
function matchesWhitelistPattern(hostname, pattern) {
  // Direct match
  if (hostname === pattern) {
    return true;
  }

  // Wildcard pattern matching
  if (pattern.startsWith('*.')) {
    const domain = pattern.slice(2); // Remove "*."
    // Match exact domain or any subdomain
    return hostname === domain || hostname.endsWith('.' + domain);
  }

  return false;
}

// Check if hostname matches any pattern in whitelist
function isWhitelisted(hostname, whitelist) {
  return whitelist.some(pattern => matchesWhitelistPattern(hostname, pattern));
}

// Validate whitelist pattern format
function isValidWhitelistPattern(pattern) {
  if (!pattern || typeof pattern !== 'string') {
    return false;
  }

  pattern = pattern.trim();

  // Empty pattern
  if (!pattern) {
    return false;
  }

  // Wildcard pattern
  if (pattern.startsWith('*.')) {
    const domain = pattern.slice(2);
    // Basic domain validation (at least one dot, no spaces, valid characters)
    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain);
  }

  // Regular hostname validation
  return /^[a-zA-Z0-9.-]+$/.test(pattern) && pattern.includes('.');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize all components
  await initializePopup();
});

async function initializePopup() {
  // Set version from manifest
  const manifest = browser.runtime.getManifest();
  const versionElement = document.getElementById('version');
  if (versionElement && manifest.version) {
    versionElement.textContent = `v${manifest.version}`;
  }

  // Load current settings
  const settings = await browser.storage.local.get([
    'grayscaleEnabled', 'visualMode', 'intensity', 'whitelist',
    'workDuration', 'breakDuration', 'focusStats', 'timerState'
  ]);

  // Set defaults
  const currentSettings = {
    grayscaleEnabled: settings.grayscaleEnabled || false,
    visualMode: settings.visualMode || 'grayscale',
    intensity: settings.intensity || 100,
    whitelist: settings.whitelist || [],
    workDuration: settings.workDuration || 25,
    breakDuration: settings.breakDuration || 5,
    focusStats: settings.focusStats || {},
    timerState: settings.timerState || { active: false, timeLeft: 1500 }
  };

  // Check if current site is whitelisted
  let currentSiteWhitelisted = false;
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      const hostname = new URL(tabs[0].url).hostname;
      currentSiteWhitelisted = isWhitelisted(hostname, currentSettings.whitelist);
      console.log('Popup Debug - Current site whitelisted:', currentSiteWhitelisted, 'for', hostname);
    }
  } catch (error) {
    console.error('Could not check current site whitelist status:', error);
  }

  // Initialize UI components
  setupTabs();
  setupToggle(currentSettings, currentSiteWhitelisted);
  setupVisualModes(currentSettings, currentSiteWhitelisted);
  setupIntensitySlider(currentSettings, currentSiteWhitelisted);
  setupTimer(currentSettings);
  setupWhitelist(currentSettings);
  setupStats(currentSettings);
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');

      // Update tab states
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      tab.classList.add('active');
      document.querySelector(`[data-content="${targetTab}"]`).classList.add('active');
    });
  });
}

async function setupToggle(settings, isWhitelisted = false) {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const status = document.getElementById('status');

  if (isWhitelisted) {
    toggleSwitch.classList.add('disabled');
    toggleSwitch.style.opacity = '0.5';
    toggleSwitch.style.cursor = 'not-allowed';
    status.textContent = 'Site is whitelisted';
    status.classList.remove('enabled');
    status.style.color = '#6c757d';
    return; // Don't add event listener for whitelisted sites
  }

  updateToggleUI(settings.grayscaleEnabled);

  toggleSwitch.addEventListener('click', async () => {
    const newState = !settings.grayscaleEnabled;
    settings.grayscaleEnabled = newState;

    // Save to storage
    await browser.storage.local.set({ grayscaleEnabled: newState });

    // Update UI
    updateToggleUI(newState);

    // Send message to all tabs
    await updateAllTabs({
      action: 'toggleGrayscale',
      enabled: newState,
      mode: settings.visualMode,
      intensity: settings.intensity
    });

    // Track focus session start/end
    if (newState) {
      await startFocusSession();
    } else {
      await endFocusSession();
    }
  });

  function updateToggleUI(enabled) {
    if (enabled) {
      toggleSwitch.classList.add('active');
      status.textContent = `Enabled - ${settings.visualMode}`;
      status.classList.add('enabled');
    } else {
      toggleSwitch.classList.remove('active');
      status.textContent = 'Disabled';
      status.classList.remove('enabled');
    }
  }
}

function setupVisualModes(settings, isWhitelisted = false) {
  const modeButtons = document.querySelectorAll('.mode-button');

  if (isWhitelisted) {
    modeButtons.forEach(btn => {
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.disabled = true;
    });
    return; // Don't add event listeners for whitelisted sites
  }

  // Set initial active mode
  modeButtons.forEach(btn => {
    if (btn.getAttribute('data-mode') === settings.visualMode) {
      btn.classList.add('active');
    }

    btn.addEventListener('click', async () => {
      const mode = btn.getAttribute('data-mode');
      settings.visualMode = mode;

      // Update UI
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Save setting
      await browser.storage.local.set({ visualMode: mode });

      // Apply to current tabs if enabled
      if (settings.grayscaleEnabled) {
        await updateAllTabs({
          action: 'updateVisualMode',
          mode: mode,
          intensity: settings.intensity
        });
      }

      // Update status
      document.getElementById('status').textContent =
        settings.grayscaleEnabled ? `Enabled - ${mode}` : 'Disabled';
    });
  });
}

function setupIntensitySlider(settings, isWhitelisted = false) {
  const slider = document.getElementById('intensitySlider');
  const valueDisplay = document.getElementById('intensityValue');

  if (isWhitelisted) {
    slider.disabled = true;
    slider.style.opacity = '0.5';
    slider.style.cursor = 'not-allowed';
    return; // Don't add event listeners for whitelisted sites
  }

  slider.value = settings.intensity;
  valueDisplay.textContent = settings.intensity + '%';

  slider.addEventListener('input', async (e) => {
    const intensity = parseInt(e.target.value);
    settings.intensity = intensity;
    valueDisplay.textContent = intensity + '%';

    // Save setting
    await browser.storage.local.set({ intensity: intensity });

    // Apply to current tabs if enabled
    if (settings.grayscaleEnabled) {
      await updateAllTabs({
        action: 'updateIntensity',
        intensity: intensity,
        mode: settings.visualMode
      });
    }
  });
}

function setupTimer(settings) {
  const timerDisplay = document.getElementById('timerDisplay');
  const startBtn = document.getElementById('startTimer');
  const pauseBtn = document.getElementById('pauseTimer');
  const resetBtn = document.getElementById('resetTimer');
  const workInput = document.getElementById('workDuration');
  const breakInput = document.getElementById('breakDuration');

  let timerInterval;
  let currentTimeLeft = settings.timerState.timeLeft || (settings.workDuration * 60);
  let isBreakTime = false;

  // Initialize UI
  workInput.value = settings.workDuration;
  breakInput.value = settings.breakDuration;
  updateTimerDisplay(currentTimeLeft);

  // Duration inputs
  workInput.addEventListener('change', async (e) => {
    const duration = parseInt(e.target.value);
    if (duration >= 1 && duration <= 120) {
      settings.workDuration = duration;
      await browser.storage.local.set({ workDuration: duration });
      if (!settings.timerState.active && !isBreakTime) {
        currentTimeLeft = duration * 60;
        updateTimerDisplay(currentTimeLeft);
      }
    }
  });

  breakInput.addEventListener('change', async (e) => {
    const duration = parseInt(e.target.value);
    if (duration >= 1 && duration <= 30) {
      settings.breakDuration = duration;
      await browser.storage.local.set({ breakDuration: duration });
    }
  });

  // Timer controls
  startBtn.addEventListener('click', () => startTimer());
  pauseBtn.addEventListener('click', () => pauseTimer());
  resetBtn.addEventListener('click', () => resetTimer());

  function startTimer() {
    if (!timerInterval) {
      timerInterval = setInterval(() => {
        currentTimeLeft--;
        updateTimerDisplay(currentTimeLeft);

        if (currentTimeLeft <= 0) {
          timerComplete();
        }
      }, 1000);

      settings.timerState.active = true;
      updateTimerControls(true);

      // Save timer state
      browser.storage.local.set({
        timerState: {
          active: true,
          timeLeft: currentTimeLeft,
          isBreakTime: isBreakTime
        }
      });

      // Auto-enable grayscale during work sessions
      if (!isBreakTime && !settings.grayscaleEnabled) {
        document.getElementById('toggleSwitch').click();
      }
    }
  }

  function pauseTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      settings.timerState.active = false;
      updateTimerControls(false);

      // Save paused state
      browser.storage.local.set({
        timerState: {
          active: false,
          timeLeft: currentTimeLeft,
          isBreakTime: isBreakTime
        }
      });
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    currentTimeLeft = settings.workDuration * 60;
    isBreakTime = false;
    settings.timerState.active = false;
    updateTimerDisplay(currentTimeLeft);
    updateTimerControls(false);
    timerDisplay.style.color = '#4a90e2';

    // Save reset state
    browser.storage.local.set({
      timerState: {
        active: false,
        timeLeft: currentTimeLeft,
        isBreakTime: false
      }
    });
  }

  function timerComplete() {
    clearInterval(timerInterval);
    timerInterval = null;
    settings.timerState.active = false;

    if (!isBreakTime) {
      // Work session complete - start break
      isBreakTime = true;
      currentTimeLeft = settings.breakDuration * 60;
      timerDisplay.style.color = '#28a745';
      showNotification('Work session complete! Time for a break.');

      // Disable grayscale during break
      if (settings.grayscaleEnabled) {
        document.getElementById('toggleSwitch').click();
      }
    } else {
      // Break complete - ready for next work session
      isBreakTime = false;
      currentTimeLeft = settings.workDuration * 60;
      timerDisplay.style.color = '#4a90e2';
      showNotification('Break complete! Ready for another focus session?');
    }

    updateTimerDisplay(currentTimeLeft);
    updateTimerControls(false);

    // Save completed state
    browser.storage.local.set({
      timerState: {
        active: false,
        timeLeft: currentTimeLeft,
        isBreakTime: isBreakTime
      }
    });
  }

  function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function updateTimerControls(isRunning) {
    if (isRunning) {
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-block';
    } else {
      startBtn.style.display = 'inline-block';
      pauseBtn.style.display = 'none';
    }
  }
}

async function setupWhitelist(settings) {
  const container = document.getElementById('whitelistContainer');
  const addBtn = document.getElementById('addSite');
  const newSiteInput = document.getElementById('newSite');

  // Get current tab for quick add functionality
  let currentSite = '';
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      currentSite = new URL(tabs[0].url).hostname;
      newSiteInput.placeholder = `e.g., ${currentSite} or *.atlassian.net`;
    }
  } catch (error) {
    console.error('Could not get current tab:', error);
    newSiteInput.placeholder = 'e.g., example.com or *.example.com';
  }

  renderWhitelist();

  // Add wildcard pattern suggestions
  const addWildcardBtn = document.createElement('button');
  addWildcardBtn.textContent = '+ Add Wildcard Pattern';
  addWildcardBtn.className = 'btn-secondary';
  addWildcardBtn.style.cssText = 'margin-top: 8px; font-size: 12px; padding: 4px 8px;';
  addWildcardBtn.addEventListener('click', () => {
    if (currentSite) {
      const parts = currentSite.split('.');
      if (parts.length >= 2) {
        const wildcard = '*.' + parts.slice(-2).join('.');
        newSiteInput.value = wildcard;
        newSiteInput.focus();
        renderWhitelist();
      }
    }
  });

  if (currentSite) {
    const inputGroup = newSiteInput.parentElement;
    inputGroup.appendChild(addWildcardBtn);
  }

  // Add site button click
  addBtn.addEventListener('click', async () => {
    const siteToAdd = newSiteInput.value.trim() || currentSite;

    if (!siteToAdd) {
      return;
    }

    // Validate pattern
    if (!isValidWhitelistPattern(siteToAdd)) {
      alert('Invalid pattern. Use a domain like "example.com" or wildcard like "*.example.com"');
      return;
    }

    // Check for duplicates (exact match)
    if (settings.whitelist.includes(siteToAdd)) {
      return;
    }

    // Check for conflicts with existing patterns
    const hasConflict = settings.whitelist.some(existing => {
      return matchesWhitelistPattern(siteToAdd, existing) ||
             matchesWhitelistPattern(existing, siteToAdd);
    });

    if (hasConflict) {
      alert('This pattern conflicts with an existing whitelist entry.');
      return;
    }

    settings.whitelist.push(siteToAdd);
    await browser.storage.local.set({ whitelist: settings.whitelist });
    newSiteInput.value = ''; // Clear input
    renderWhitelist();

    // Notify content scripts about whitelist change
    await updateAllTabs({ action: 'checkWhitelist' });
  });

  // Enter key support for input field
  newSiteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addBtn.click();
    }
  });

  // Update button state when typing
  newSiteInput.addEventListener('input', () => {
    renderWhitelist();
  });

  function renderWhitelist() {
    container.innerHTML = '';

    if (settings.whitelist.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: #6c757d; padding: 20px;">
          <div>No whitelisted sites</div>
          <div style="font-size: 12px; margin-top: 8px;">
            Add domains (e.g., example.com)<br>
            or wildcards (e.g., *.example.com)
          </div>
        </div>
      `;
    } else {
      settings.whitelist.forEach(site => {
        const item = document.createElement('div');
        item.className = 'whitelist-item';

        // Add visual indicator for wildcard patterns
        const isWildcard = site.startsWith('*.');
        const displayText = site;
        const icon = isWildcard ? '🌐' : '🔗';

        item.innerHTML = `
          <span style="display: flex; align-items: center; gap: 8px;">
            <span>${icon}</span>
            <span>${displayText}</span>
            ${isWildcard ? '<small style="color: #6c757d;">(wildcard)</small>' : ''}
          </span>
          <button class="remove-site" data-site="${site}">×</button>
        `;
        container.appendChild(item);
      });

      // Add event listeners for remove buttons
      container.querySelectorAll('.remove-site').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const site = e.target.getAttribute('data-site');
            settings.whitelist = settings.whitelist.filter(s => s !== site);
            await browser.storage.local.set({ whitelist: settings.whitelist });
            renderWhitelist();

            // Notify content scripts about whitelist change
            await updateAllTabs({ action: 'checkWhitelist' });
          });
        });
    }

    // Update add button state
    const inputValue = newSiteInput.value.trim();
    const siteToCheck = inputValue || currentSite;

    if (siteToCheck) {
      // Check if current input/site matches any existing pattern
      const isAlreadyWhitelisted = settings.whitelist.some(pattern =>
        pattern === siteToCheck ||
        matchesWhitelistPattern(siteToCheck, pattern)
      );

      if (isAlreadyWhitelisted) {
        addBtn.textContent = '✓ Already covered';
        addBtn.disabled = true;
      } else if (inputValue) {
        const isValid = isValidWhitelistPattern(inputValue);
        addBtn.textContent = isValid ? 'Add Pattern' : 'Invalid Pattern';
        addBtn.disabled = !isValid;
      } else if (currentSite) {
        addBtn.textContent = `Add ${currentSite}`;
        addBtn.disabled = false;
      } else {
        addBtn.textContent = 'Add Site';
        addBtn.disabled = true;
      }
    } else {
      addBtn.textContent = 'Add Site';
      addBtn.disabled = true;
    }
  }
}

function setupStats(settings) {
  const todayTimeEl = document.getElementById('todayTime');
  const weeklyTimeEl = document.getElementById('weeklyTime');
  const totalSessionsEl = document.getElementById('totalSessions');
  const weeklyChartEl = document.getElementById('weeklyChart');

  const today = new Date().toDateString();
  const todayStats = settings.focusStats[today] || { totalTime: 0, sessions: 0 };

  // Calculate weekly total and sessions
  const weeklyTotal = calculateWeeklyTotal(settings.focusStats);
  const totalSessions = Object.values(settings.focusStats).reduce((sum, day) => sum + (day.sessions || 0), 0);

  // Update UI
  if (todayTimeEl) todayTimeEl.textContent = formatTime(todayStats.totalTime);
  if (weeklyTimeEl) weeklyTimeEl.textContent = formatTime(weeklyTotal);
  if (totalSessionsEl) totalSessionsEl.textContent = totalSessions;

  // Render weekly chart
  if (weeklyChartEl) {
    renderWeeklyChart(settings.focusStats, weeklyChartEl);
  }
}

function calculateWeeklyTotal(stats) {
  const now = new Date();
  let total = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toDateString();
    if (stats[dateString]) {
      total += stats[dateString].totalTime;
    }
  }

  return total;
}

function renderWeeklyChart(stats, container) {
  const now = new Date();
  let chartHtml = '';

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toDateString();
    const dayName = date.toLocaleDateString('en', { weekday: 'short' });
    const minutes = Math.floor((stats[dateString]?.totalTime || 0) / 60);
    const height = Math.min(Math.max(minutes / 10, 2), 50); // Scale for visualization

    chartHtml += `
      <div class="chart-bar">
        <div class="bar" style="height: ${height}px;" title="${minutes} minutes"></div>
        <span class="day-label">${dayName}</span>
      </div>
    `;
  }

  container.innerHTML = chartHtml;
}

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

async function startFocusSession() {
  const now = Date.now();
  await browser.storage.local.set({ focusSessionStart: now });
}

async function endFocusSession() {
  const result = await browser.storage.local.get(['focusSessionStart', 'focusStats']);
  const sessionStart = result.focusSessionStart;

  if (sessionStart) {
    const sessionDuration = Math.floor((Date.now() - sessionStart) / 1000);
    const today = new Date().toDateString();

    const stats = result.focusStats || {};
    if (!stats[today]) {
      stats[today] = { totalTime: 0, sitesVisited: 0 };
    }

    stats[today].totalTime += sessionDuration;
    stats[today].sitesVisited += 1;

    await browser.storage.local.set({
      focusStats: stats,
      focusSessionStart: null
    });

    // Update display if elements exist
    const todayTimeEl = document.getElementById('todayTime');
    const totalSessionsEl = document.getElementById('totalSessions');

    if (todayTimeEl) todayTimeEl.textContent = formatTime(stats[today].totalTime);
    if (totalSessionsEl) {
      const totalSessions = Object.values(stats).reduce((sum, day) => sum + (day.sessions || 0), 0);
      totalSessionsEl.textContent = totalSessions;
    }
  }
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function showNotification(message) {
  try {
    browser.notifications.create({
      type: 'basic',
      iconUrl: '../assets/icons/icon-48.png',
      title: 'Grayscale Focus',
      message: message
    });
  } catch (error) {
    // Fallback to console if notifications aren't available
    console.log('Notification:', message);
  }
}

// Listen for storage changes
browser.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Handle external changes (e.g., from keyboard shortcuts)
    if (changes.grayscaleEnabled) {
      const toggle = document.getElementById('toggleSwitch');
      const status = document.getElementById('status');
      const enabled = changes.grayscaleEnabled.newValue;

      if (enabled) {
        toggle.classList.add('active');
        status.classList.add('enabled');
      } else {
        toggle.classList.remove('active');
        status.classList.remove('enabled');
      }
    }
  }
});
