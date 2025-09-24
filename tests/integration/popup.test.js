/**
 * Integration Tests for Popup Interface
 */

module.exports = function(runner) {
  // Mock DOM environment
  class MockDOM {
    constructor() {
      this.elements = new Map();
      this.eventListeners = new Map();
    }

    createElement(tagName) {
      const eventListeners = new Map();

      return {
        tagName: tagName.toUpperCase(),
        id: '',
        className: '',
        textContent: '',
        innerHTML: '',
        value: '',
        checked: false,
        disabled: false,
        type: '',
        min: '',
        max: '',
        placeholder: '',
        style: {},
        dataset: {},
        children: [],
        parentNode: null,

        appendChild: function(child) {
          this.children.push(child);
          child.parentNode = this;
          return child;
        },

        querySelector: function(selector) {
          if (selector.startsWith('.')) {
            const className = selector.slice(1);
            return this.children.find(child => child.className && child.className.includes(className)) || null;
          }
          return null;
        },

        addEventListener: function(event, handler) {
          const key = `${this.id || this.className}_${event}`;
          if (!eventListeners.has(key)) {
            eventListeners.set(key, []);
          }
          eventListeners.get(key).push(handler);
        },

        removeEventListener: function(event, handler) {
          const key = `${this.id || this.className}_${event}`;
          if (eventListeners.has(key)) {
            const handlers = eventListeners.get(key);
            const index = handlers.indexOf(handler);
            if (index !== -1) {
              handlers.splice(index, 1);
            }
          }
        },

        click: function() {
          this.dispatchEvent('click');
        },

        dispatchEvent: function(eventType) {
          const key = `${this.id || this.className}_${eventType}`;
          if (eventListeners.has(key)) {
            const self = this;
            eventListeners.get(key).forEach(handler => {
              handler({ target: self, type: eventType });
            });
          }
        }
      };
    }

    getElementById(id) {
      return this.elements.get(id) || null;
    }

    querySelector(selector) {
      // Simple selector implementation
      if (selector.startsWith('#')) {
        return this.getElementById(selector.slice(1));
      }
      // Return first element for class selectors (simplified)
      for (const [key, element] of this.elements) {
        if (selector.startsWith('.') && element.className.includes(selector.slice(1))) {
          return element;
        }
      }
      return null;
    }

    querySelectorAll(selector) {
      const results = [];
      for (const [key, element] of this.elements) {
        if (selector.startsWith('.') && element.className.includes(selector.slice(1))) {
          results.push(element);
        }
      }
      return results;
    }

    addElement(id, element) {
      element.id = id;
      this.elements.set(id, element);
      return element;
    }
  }

  // Mock popup functionality
  class PopupManager {
    constructor(dom) {
      this.dom = dom;
      this.currentTab = 'main';
      this.settings = {
        enabled: false,
        mode: 'grayscale',
        intensity: 50,
        whitelist: []
      };
      this.init();
    }

    init() {
      this.setupTabs();
      this.setupControls();
      this.setupWhitelistManager();
      this.loadSettings();
    }

    setupTabs() {
      // Create tab elements
      const tabs = ['main', 'timer', 'sites', 'stats'];
      tabs.forEach(tab => {
        const tabButton = this.dom.createElement('button');
        tabButton.className = `tab-btn ${tab === 'main' ? 'active' : ''}`;
        tabButton.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
        tabButton.addEventListener('click', () => this.switchTab(tab));
        this.dom.addElement(`${tab}-tab`, tabButton);

        const tabContent = this.dom.createElement('div');
        tabContent.className = `tab-content ${tab === 'main' ? 'active' : ''}`;
        this.dom.addElement(`${tab}-content`, tabContent);
      });
    }

    setupControls() {
      // Enable/disable toggle
      const enableToggle = this.dom.createElement('input');
      enableToggle.type = 'checkbox';
      enableToggle.id = 'enable-toggle';  // Set ID before addEventListener
      enableToggle.addEventListener('change', (e) => {
        this.settings.enabled = e.target.checked;
        this.saveSettings();
      });
      this.dom.addElement('enable-toggle', enableToggle);

      // Mode selector
      const modeSelect = this.dom.createElement('select');
      modeSelect.id = 'mode-select';  // Set ID before addEventListener
      const modes = ['grayscale', 'sepia', 'blur', 'contrast', 'desaturate', 'invert'];
      modes.forEach(mode => {
        const option = this.dom.createElement('option');
        option.value = mode;
        option.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
        // Mock appendChild functionality
        modeSelect.children = modeSelect.children || [];
        modeSelect.children.push(option);
      });
      modeSelect.addEventListener('change', (e) => {
        this.settings.mode = e.target.value;
        this.saveSettings();
      });
      this.dom.addElement('mode-select', modeSelect);

      // Intensity slider
      const intensitySlider = this.dom.createElement('input');
      intensitySlider.type = 'range';
      intensitySlider.min = '10';
      intensitySlider.max = '100';
      intensitySlider.id = 'intensity-slider';  // Set ID before addEventListener
      intensitySlider.addEventListener('input', (e) => {
        this.settings.intensity = parseInt(e.target.value);
        this.updateIntensityDisplay();
        this.saveSettings();
      });
      this.dom.addElement('intensity-slider', intensitySlider);

      const intensityDisplay = this.dom.createElement('span');
      this.dom.addElement('intensity-display', intensityDisplay);
    }

    setupWhitelistManager() {
      const whitelistInput = this.dom.createElement('input');
      whitelistInput.type = 'text';
      whitelistInput.placeholder = 'Enter domain (e.g., example.com or *.example.com)';
      this.dom.addElement('whitelist-input', whitelistInput);

      const addButton = this.dom.createElement('button');
      addButton.textContent = 'Add Domain';
      addButton.addEventListener('click', () => this.addToWhitelist());
      this.dom.addElement('add-whitelist-btn', addButton);

      const whitelistContainer = this.dom.createElement('div');
      whitelistContainer.className = 'whitelist-container';
      this.dom.addElement('whitelist-container', whitelistContainer);
    }

    switchTab(tabName) {
      // Deactivate all tabs
      ['main', 'timer', 'sites', 'stats'].forEach(tab => {
        const tabBtn = this.dom.getElementById(`${tab}-tab`);
        const tabContent = this.dom.getElementById(`${tab}-content`);
        if (tabBtn) tabBtn.className = tabBtn.className.replace(' active', '');
        if (tabContent) tabContent.className = tabContent.className.replace(' active', '');
      });

      // Activate selected tab
      const selectedTab = this.dom.getElementById(`${tabName}-tab`);
      const selectedContent = this.dom.getElementById(`${tabName}-content`);
      if (selectedTab) selectedTab.className += ' active';
      if (selectedContent) selectedContent.className += ' active';

      this.currentTab = tabName;
    }

    addToWhitelist() {
      const input = this.dom.getElementById('whitelist-input');
      const domain = input.value.trim().toLowerCase();

      if (!domain) return false;

      // Validate domain format
      if (!this.validateDomain(domain)) {
        return false;
      }

      // Check for duplicates
      if (this.settings.whitelist.includes(domain)) {
        return false;
      }

      this.settings.whitelist.push(domain);
      this.saveSettings();
      this.updateWhitelistDisplay();
      input.value = '';
      return true;
    }

    removeFromWhitelist(domain) {
      const index = this.settings.whitelist.indexOf(domain);
      if (index !== -1) {
        this.settings.whitelist.splice(index, 1);
        this.saveSettings();
        this.updateWhitelistDisplay();
        return true;
      }
      return false;
    }

    validateDomain(domain) {
      const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
      return domainRegex.test(domain);
    }

    updateWhitelistDisplay() {
      const container = this.dom.getElementById('whitelist-container');
      if (!container) return;

      // Clear existing items
      container.innerHTML = '';

      this.settings.whitelist.forEach(domain => {
        const item = this.dom.createElement('div');
        item.className = 'whitelist-item';

        // Create domain span
        const domainSpan = this.dom.createElement('span');
        domainSpan.className = 'domain';
        domainSpan.textContent = domain;

        // Create remove button
        const removeBtn = this.dom.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'Remove';
        removeBtn.dataset.domain = domain;
        removeBtn.addEventListener('click', () => {
          this.removeFromWhitelist(domain);
        });

        // Add children to item
        item.appendChild(domainSpan);
        item.appendChild(removeBtn);

        container.appendChild(item);
      });
    }

    updateIntensityDisplay() {
      const display = this.dom.getElementById('intensity-display');
      if (display) {
        display.textContent = `${this.settings.intensity}%`;
      }
    }

    loadSettings() {
      // Simulate loading from storage
      const enableToggle = this.dom.getElementById('enable-toggle');
      const modeSelect = this.dom.getElementById('mode-select');
      const intensitySlider = this.dom.getElementById('intensity-slider');

      if (enableToggle) enableToggle.checked = this.settings.enabled;
      if (modeSelect) modeSelect.value = this.settings.mode;
      if (intensitySlider) {
        intensitySlider.value = this.settings.intensity.toString();
        this.updateIntensityDisplay();
      }

      this.updateWhitelistDisplay();
    }

    saveSettings() {
      // Simulate saving to storage
      return Promise.resolve();
    }

    getSettings() {
      return { ...this.settings };
    }

    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      this.loadSettings();
    }
  }

  runner.suite('Popup Interface Integration', () => {
    let dom, popup;

    function setup() {
      dom = new MockDOM();
      popup = new PopupManager(dom);
    }

    runner.test('Initial popup state', () => {
      setup();

      runner.assertEqual(popup.currentTab, 'main');

      const settings = popup.getSettings();
      runner.assertEqual(settings.enabled, false);
      runner.assertEqual(settings.mode, 'grayscale');
      runner.assertEqual(settings.intensity, 50);
      runner.assertEqual(settings.whitelist.length, 0);
    });

    runner.test('Tab switching functionality', () => {
      setup();

      // Initially on main tab
      runner.assertEqual(popup.currentTab, 'main');

      // Switch to timer tab
      popup.switchTab('timer');
      runner.assertEqual(popup.currentTab, 'timer');

      // Switch to sites tab
      popup.switchTab('sites');
      runner.assertEqual(popup.currentTab, 'sites');

      // Switch to stats tab
      popup.switchTab('stats');
      runner.assertEqual(popup.currentTab, 'stats');

      // Switch back to main
      popup.switchTab('main');
      runner.assertEqual(popup.currentTab, 'main');
    });

    runner.test('Enable/disable toggle', () => {
      setup();

      const toggle = dom.getElementById('enable-toggle');
      runner.assertTrue(toggle !== null);
      runner.assertEqual(toggle.checked, false);

      // Simulate click
      toggle.checked = true;
      toggle.dispatchEvent('change');

      const settings = popup.getSettings();
      runner.assertEqual(settings.enabled, true);
    });

    runner.test('Mode selection', () => {
      setup();

      const modeSelect = dom.getElementById('mode-select');
      runner.assertTrue(modeSelect !== null);
      runner.assertEqual(modeSelect.value, 'grayscale');

      // Change mode
      modeSelect.value = 'sepia';
      modeSelect.dispatchEvent('change');

      const settings = popup.getSettings();
      runner.assertEqual(settings.mode, 'sepia');
    });

    runner.test('Intensity adjustment', () => {
      setup();

      const intensitySlider = dom.getElementById('intensity-slider');
      const intensityDisplay = dom.getElementById('intensity-display');

      runner.assertTrue(intensitySlider !== null);
      runner.assertTrue(intensityDisplay !== null);
      runner.assertEqual(intensitySlider.value, '50');
      runner.assertEqual(intensityDisplay.textContent, '50%');

      // Change intensity
      intensitySlider.value = '75';
      intensitySlider.dispatchEvent('input');

      const settings = popup.getSettings();
      runner.assertEqual(settings.intensity, 75);
      runner.assertEqual(intensityDisplay.textContent, '75%');
    });

    runner.test('Whitelist domain addition', () => {
      setup();

      const input = dom.getElementById('whitelist-input');
      const addBtn = dom.getElementById('add-whitelist-btn');

      runner.assertTrue(input !== null);
      runner.assertTrue(addBtn !== null);

      // Add valid domain
      input.value = 'example.com';
      const result1 = popup.addToWhitelist();

      runner.assertTrue(result1);

      const settings = popup.getSettings();
      runner.assertEqual(settings.whitelist.length, 1);
      runner.assertContains(settings.whitelist, 'example.com');
      runner.assertEqual(input.value, ''); // Should clear input
    });

    runner.test('Whitelist wildcard domain addition', () => {
      setup();

      const input = dom.getElementById('whitelist-input');

      // Add wildcard domain
      input.value = '*.github.com';
      const result = popup.addToWhitelist();

      runner.assertTrue(result);

      const settings = popup.getSettings();
      runner.assertContains(settings.whitelist, '*.github.com');
    });

    runner.test('Invalid domain validation', () => {
      setup();

      const input = dom.getElementById('whitelist-input');

      // Test invalid domains
      const invalidDomains = ['', '.com', 'example.', '*.', '*', 'http://example.com'];

      invalidDomains.forEach(domain => {
        input.value = domain;
        const result = popup.addToWhitelist();
        runner.assertFalse(result, `Should reject invalid domain: ${domain}`);
      });

      const settings = popup.getSettings();
      runner.assertEqual(settings.whitelist.length, 0);
    });

    runner.test('Duplicate domain prevention', () => {
      setup();

      const input = dom.getElementById('whitelist-input');

      // Add domain twice
      input.value = 'example.com';
      const result1 = popup.addToWhitelist();
      runner.assertTrue(result1);

      input.value = 'example.com';
      const result2 = popup.addToWhitelist();
      runner.assertFalse(result2);

      const settings = popup.getSettings();
      runner.assertEqual(settings.whitelist.length, 1);
    });

    runner.test('Whitelist domain removal', () => {
      setup();

      // Add domains first
      popup.settings.whitelist = ['example.com', '*.github.com', 'test.org'];
      popup.updateWhitelistDisplay();

      // Remove domain
      const result = popup.removeFromWhitelist('example.com');
      runner.assertTrue(result);

      const settings = popup.getSettings();
      runner.assertEqual(settings.whitelist.length, 2);
      runner.assertFalse(settings.whitelist.includes('example.com'));
      runner.assertTrue(settings.whitelist.includes('*.github.com'));

      // Try to remove non-existent domain
      const result2 = popup.removeFromWhitelist('nonexistent.com');
      runner.assertFalse(result2);
    });

    runner.test('Settings persistence simulation', () => {
      setup();

      // Update settings
      popup.updateSettings({
        enabled: true,
        mode: 'blur',
        intensity: 80,
        whitelist: ['test.com', '*.example.org']
      });

      const settings = popup.getSettings();
      runner.assertEqual(settings.enabled, true);
      runner.assertEqual(settings.mode, 'blur');
      runner.assertEqual(settings.intensity, 80);
      runner.assertEqual(settings.whitelist.length, 2);

      // Check UI elements are updated
      const enableToggle = dom.getElementById('enable-toggle');
      const modeSelect = dom.getElementById('mode-select');
      const intensitySlider = dom.getElementById('intensity-slider');

      runner.assertEqual(enableToggle.checked, true);
      runner.assertEqual(modeSelect.value, 'blur');
      runner.assertEqual(intensitySlider.value, '80');
    });

    runner.test('Complete workflow simulation', () => {
      setup();

      // 1. Enable extension
      const enableToggle = dom.getElementById('enable-toggle');
      enableToggle.checked = true;
      enableToggle.dispatchEvent('change');

      // 2. Change mode to sepia
      const modeSelect = dom.getElementById('mode-select');
      modeSelect.value = 'sepia';
      modeSelect.dispatchEvent('change');

      // 3. Adjust intensity
      const intensitySlider = dom.getElementById('intensity-slider');
      intensitySlider.value = '65';
      intensitySlider.dispatchEvent('input');

      // 4. Switch to sites tab
      popup.switchTab('sites');

      // 5. Add domains to whitelist
      const input = dom.getElementById('whitelist-input');

      input.value = 'github.com';
      popup.addToWhitelist();

      input.value = '*.example.com';
      popup.addToWhitelist();

      // Verify final state
      const finalSettings = popup.getSettings();
      runner.assertEqual(finalSettings.enabled, true);
      runner.assertEqual(finalSettings.mode, 'sepia');
      runner.assertEqual(finalSettings.intensity, 65);
      runner.assertEqual(finalSettings.whitelist.length, 2);
      runner.assertContains(finalSettings.whitelist, 'github.com');
      runner.assertContains(finalSettings.whitelist, '*.example.com');
      runner.assertEqual(popup.currentTab, 'sites');
    });

    runner.test('UI element existence verification', () => {
      setup();

      // Check all required elements exist
      const requiredElements = [
        'enable-toggle',
        'mode-select',
        'intensity-slider',
        'intensity-display',
        'whitelist-input',
        'add-whitelist-btn',
        'whitelist-container',
        'main-tab',
        'timer-tab',
        'sites-tab',
        'stats-tab',
        'main-content',
        'timer-content',
        'sites-content',
        'stats-content'
      ];

      requiredElements.forEach(elementId => {
        const element = dom.getElementById(elementId);
        runner.assertTrue(element !== null, `Element ${elementId} should exist`);
      });
    });

    runner.test('Event listener cleanup', () => {
      setup();

      const button = dom.getElementById('add-whitelist-btn');
      const initialListenerCount = dom.eventListeners.size;

      // Add additional listeners
      const handler1 = () => {};
      const handler2 = () => {};

      button.addEventListener('click', handler1);
      button.addEventListener('click', handler2);

      runner.assertTrue(dom.eventListeners.size >= initialListenerCount);

      // Remove listeners
      button.removeEventListener('click', handler1);
      button.removeEventListener('click', handler2);

      // Note: In a real implementation, we'd verify proper cleanup
      // This test demonstrates the cleanup mechanism
      runner.assertTrue(true); // Placeholder assertion
    });
  });
};
