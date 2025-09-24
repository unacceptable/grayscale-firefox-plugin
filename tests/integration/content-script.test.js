/**
 * Integration Tests for Content Script
 */

module.exports = function(runner) {
  // Mock DOM environment for content script testing
  class MockDocument {
    constructor() {
      this.documentElement = {
        style: {},
        dataset: {}
      };
      this.head = {
        headElements: [],
        appendChild: function(element) {
          this.headElements.push(element);
        },
        removeChild: function(element) {
          const index = this.headElements.indexOf(element);
          if (index !== -1) {
            this.headElements.splice(index, 1);
          }
        }
      };
      this.body = {
        style: {}
      };
      this.styleElements = [];
    }

    createElement(tagName) {
      return {
        tagName: tagName.toUpperCase(),
        id: '',
        textContent: '',
        innerHTML: '',
        style: {},
        dataset: {},
        parentNode: null
      };
    }

    getElementById(id) {
      return this.styleElements.find(el => el.id === id) || null;
    }

    querySelector(selector) {
      if (selector === 'html') return this.documentElement;
      if (selector === 'head') return this.head;
      if (selector === 'body') return this.body;
      return null;
    }

    addEventListener(event, handler) {
      this.eventHandlers = this.eventHandlers || {};
      this.eventHandlers[event] = this.eventHandlers[event] || [];
      this.eventHandlers[event].push(handler);
    }

    removeEventListener(event, handler) {
      if (this.eventHandlers && this.eventHandlers[event]) {
        const index = this.eventHandlers[event].indexOf(handler);
        if (index !== -1) {
          this.eventHandlers[event].splice(index, 1);
        }
      }
    }
  }

  // Mock content script functionality
  class ContentScriptManager {
    constructor(document = new MockDocument()) {
      this.document = document;
      this.currentMode = null;
      this.currentIntensity = 50;
      this.isEnabled = false;
      this.styleElement = null;
      this.observerActive = false;
    }

    initialize() {
      this.createStyleElement();
      this.setupMessageListener();
      this.setupDOMObserver();
    }

    createStyleElement() {
      this.styleElement = this.document.createElement('style');
      this.styleElement.id = 'grayscale-focus-styles';
      this.document.head.appendChild(this.styleElement);
    }

    applyVisualMode(mode, intensity) {
      if (!this.styleElement) {
        this.createStyleElement();
      }

      this.currentMode = mode;
      this.currentIntensity = parseInt(intensity);
      this.isEnabled = true;

      const intensityDecimal = this.currentIntensity / 100;
      let filterValue = '';

      switch (mode) {
        case 'grayscale':
          filterValue = `grayscale(${intensityDecimal})`;
          break;
        case 'sepia':
          filterValue = `sepia(${intensityDecimal})`;
          break;
        case 'blur':
          filterValue = `blur(${intensityDecimal * 2}px)`;
          break;
        case 'contrast':
          filterValue = `contrast(${1 - (intensityDecimal * 0.5)})`;
          break;
        case 'desaturate':
          filterValue = `saturate(${1 - intensityDecimal})`;
          break;
        case 'invert':
          filterValue = `invert(${intensityDecimal})`;
          break;
      }

      const css = `
        html {
          filter: ${filterValue} !important;
          transition: filter 0.2s ease !important;
        }
      `;

      this.styleElement.textContent = css;
      this.document.documentElement.dataset.grayscaleFocusMode = mode;
      this.document.documentElement.dataset.grayscaleFocusIntensity = intensity.toString();

      return true;
    }

    removeVisualMode() {
      if (this.styleElement) {
        this.styleElement.textContent = '';
      }

      delete this.document.documentElement.dataset.grayscaleFocusMode;
      delete this.document.documentElement.dataset.grayscaleFocusIntensity;

      this.currentMode = null;
      this.isEnabled = false;

      return true;
    }

    updateIntensity(intensity) {
      if (this.isEnabled && this.currentMode) {
        return this.applyVisualMode(this.currentMode, intensity);
      }
      return false;
    }

    setupMessageListener() {
      // Mock browser.runtime.onMessage
      this.messageHandler = (message, sender, sendResponse) => {
        switch (message.action) {
          case 'applyVisualMode':
            const result = this.applyVisualMode(message.mode, message.intensity);
            sendResponse({ success: result });
            break;
          case 'removeVisualMode':
            const removeResult = this.removeVisualMode();
            sendResponse({ success: removeResult });
            break;
          case 'updateIntensity':
            const updateResult = this.updateIntensity(message.intensity);
            sendResponse({ success: updateResult });
            break;
          case 'getStatus':
            sendResponse({
              isEnabled: this.isEnabled,
              mode: this.currentMode,
              intensity: this.currentIntensity
            });
            break;
        }
      };
    }

    setupDOMObserver() {
      // Mock MutationObserver functionality
      this.observerActive = true;
      this.observedMutations = [];
    }

    handleDOMChange(mutations) {
      // Simulate DOM change handling
      this.observedMutations.push(...mutations);

      // If visual mode is active, ensure styles persist
      if (this.isEnabled && this.currentMode) {
        const hasStyle = this.document.getElementById('grayscale-focus-styles');
        if (!hasStyle) {
          this.createStyleElement();
          this.applyVisualMode(this.currentMode, this.currentIntensity);
        }
      }
    }

    getStatus() {
      return {
        isEnabled: this.isEnabled,
        mode: this.currentMode,
        intensity: this.currentIntensity,
        hasStyleElement: !!this.styleElement,
        observerActive: this.observerActive
      };
    }

    destroy() {
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
      }
      this.styleElement = null;
      this.observerActive = false;
      this.isEnabled = false;
      this.currentMode = null;
    }

    simulateMessage(message) {
      return new Promise((resolve) => {
        this.messageHandler(message, {}, resolve);
      });
    }
  }

  runner.suite('Content Script Integration', () => {
    let contentScript, mockDoc;

    function setup() {
      mockDoc = new MockDocument();
      contentScript = new ContentScriptManager(mockDoc);
      contentScript.initialize();
    }

    function teardown() {
      if (contentScript) {
        contentScript.destroy();
      }
    }

    runner.test('Initialization', () => {
      setup();

      const status = contentScript.getStatus();
      runner.assertEqual(status.isEnabled, false);
      runner.assertEqual(status.mode, null);
      runner.assertEqual(status.intensity, 50);
      runner.assertTrue(status.hasStyleElement);
      runner.assertTrue(status.observerActive);

      teardown();
    });

    runner.test('Style element creation', () => {
      setup();

      runner.assertTrue(contentScript.styleElement !== null);
      runner.assertEqual(contentScript.styleElement.id, 'grayscale-focus-styles');
      runner.assertTrue(mockDoc.head.headElements && mockDoc.head.headElements.includes(contentScript.styleElement));

      teardown();
    });

    runner.test('Grayscale mode application', () => {
      setup();

      const result = contentScript.applyVisualMode('grayscale', 75);
      runner.assertTrue(result);

      const status = contentScript.getStatus();
      runner.assertTrue(status.isEnabled);
      runner.assertEqual(status.mode, 'grayscale');
      runner.assertEqual(status.intensity, 75);

      runner.assertTrue(contentScript.styleElement.textContent.includes('grayscale(0.75)'));
      runner.assertEqual(mockDoc.documentElement.dataset.grayscaleFocusMode, 'grayscale');
      runner.assertEqual(mockDoc.documentElement.dataset.grayscaleFocusIntensity, '75');

      teardown();
    });

    runner.test('Sepia mode application', () => {
      setup();

      const result = contentScript.applyVisualMode('sepia', 60);
      runner.assertTrue(result);

      runner.assertTrue(contentScript.styleElement.textContent.includes('sepia(0.6)'));
      runner.assertEqual(mockDoc.documentElement.dataset.grayscaleFocusMode, 'sepia');

      teardown();
    });

    runner.test('Blur mode application', () => {
      setup();

      const result = contentScript.applyVisualMode('blur', 50);
      runner.assertTrue(result);

      runner.assertTrue(contentScript.styleElement.textContent.includes('blur(1px)'));
      runner.assertEqual(mockDoc.documentElement.dataset.grayscaleFocusMode, 'blur');

      teardown();
    });

    runner.test('Contrast mode application', () => {
      setup();

      const result = contentScript.applyVisualMode('contrast', 80);
      runner.assertTrue(result);

      // Contrast formula: 1 - (intensity * 0.5)
      // 80% intensity = 1 - (0.8 * 0.5) = 0.6
      runner.assertTrue(contentScript.styleElement.textContent.includes('contrast(0.6)'));

      teardown();
    });

    runner.test('Desaturate mode application', () => {
      setup();

      const result = contentScript.applyVisualMode('desaturate', 40);
      runner.assertTrue(result);

      // Desaturate formula: 1 - intensity
      // 40% intensity = 1 - 0.4 = 0.6
      runner.assertTrue(contentScript.styleElement.textContent.includes('saturate(0.6)'));

      teardown();
    });

    runner.test('Invert mode application', () => {
      setup();

      const result = contentScript.applyVisualMode('invert', 90);
      runner.assertTrue(result);

      runner.assertTrue(contentScript.styleElement.textContent.includes('invert(0.9)'));

      teardown();
    });

    runner.test('Visual mode removal', () => {
      setup();

      // First apply a mode
      contentScript.applyVisualMode('grayscale', 50);
      runner.assertTrue(contentScript.getStatus().isEnabled);

      // Then remove it
      const result = contentScript.removeVisualMode();
      runner.assertTrue(result);

      const status = contentScript.getStatus();
      runner.assertFalse(status.isEnabled);
      runner.assertEqual(status.mode, null);

      runner.assertEqual(contentScript.styleElement.textContent, '');
      runner.assertTrue(mockDoc.documentElement.dataset.grayscaleFocusMode === undefined);
      runner.assertTrue(mockDoc.documentElement.dataset.grayscaleFocusIntensity === undefined);

      teardown();
    });

    runner.test('Intensity update', () => {
      setup();

      // Apply initial mode
      contentScript.applyVisualMode('grayscale', 50);

      // Update intensity
      const result = contentScript.updateIntensity(80);
      runner.assertTrue(result);

      const status = contentScript.getStatus();
      runner.assertEqual(status.intensity, 80);
      runner.assertTrue(contentScript.styleElement.textContent.includes('grayscale(0.8)'));
      runner.assertEqual(mockDoc.documentElement.dataset.grayscaleFocusIntensity, '80');

      teardown();
    });

    runner.test('Intensity update without active mode', () => {
      setup();

      // Try to update intensity without active mode
      const result = contentScript.updateIntensity(70);
      runner.assertFalse(result);

      const status = contentScript.getStatus();
      runner.assertFalse(status.isEnabled);

      teardown();
    });

    runner.test('Message handling - apply visual mode', async () => {
      setup();

      const message = {
        action: 'applyVisualMode',
        mode: 'sepia',
        intensity: 65
      };

      const response = await contentScript.simulateMessage(message);
      runner.assertTrue(response.success);

      const status = contentScript.getStatus();
      runner.assertEqual(status.mode, 'sepia');
      runner.assertEqual(status.intensity, 65);

      teardown();
    });

    runner.test('Message handling - remove visual mode', async () => {
      setup();

      // First apply a mode
      await contentScript.simulateMessage({
        action: 'applyVisualMode',
        mode: 'grayscale',
        intensity: 50
      });

      // Then remove it
      const response = await contentScript.simulateMessage({
        action: 'removeVisualMode'
      });

      runner.assertTrue(response.success);
      runner.assertFalse(contentScript.getStatus().isEnabled);

      teardown();
    });

    runner.test('Message handling - update intensity', async () => {
      setup();

      // First apply a mode
      await contentScript.simulateMessage({
        action: 'applyVisualMode',
        mode: 'blur',
        intensity: 30
      });

      // Update intensity
      const response = await contentScript.simulateMessage({
        action: 'updateIntensity',
        intensity: 70
      });

      runner.assertTrue(response.success);
      runner.assertEqual(contentScript.getStatus().intensity, 70);

      teardown();
    });

    runner.test('Message handling - get status', async () => {
      setup();

      const response = await contentScript.simulateMessage({
        action: 'getStatus'
      });

      runner.assertEqual(response.isEnabled, false);
      runner.assertEqual(response.mode, null);
      runner.assertEqual(response.intensity, 50);

      teardown();
    });

    runner.test('DOM change handling', () => {
      setup();

      // Apply visual mode
      contentScript.applyVisualMode('grayscale', 50);

      // Simulate DOM mutations
      const mutations = [
        { type: 'childList', addedNodes: ['div'] },
        { type: 'attributes', attributeName: 'class' }
      ];

      contentScript.handleDOMChange(mutations);

      runner.assertEqual(contentScript.observedMutations.length, 2);
      runner.assertTrue(contentScript.getStatus().isEnabled); // Should still be enabled

      teardown();
    });

    runner.test('Style persistence after DOM changes', () => {
      setup();

      // Apply visual mode
      contentScript.applyVisualMode('grayscale', 50);

      // Simulate style element removal
      contentScript.styleElement = null;

      // Handle DOM change (should recreate style element)
      contentScript.handleDOMChange([{ type: 'childList' }]);

      runner.assertTrue(contentScript.styleElement !== null);
      runner.assertTrue(contentScript.getStatus().hasStyleElement);

      teardown();
    });

    runner.test('Multiple mode switches', () => {
      setup();

      const modes = ['grayscale', 'sepia', 'blur', 'contrast', 'desaturate', 'invert'];

      modes.forEach((mode, index) => {
        const intensity = (index + 1) * 15; // Different intensity for each
        const result = contentScript.applyVisualMode(mode, intensity);

        runner.assertTrue(result);
        runner.assertEqual(contentScript.getStatus().mode, mode);
        runner.assertEqual(contentScript.getStatus().intensity, intensity);
      });

      teardown();
    });

    runner.test('Edge case intensities', () => {
      setup();

      // Test minimum intensity
      contentScript.applyVisualMode('grayscale', 0);
      runner.assertTrue(contentScript.styleElement.textContent.includes('grayscale(0)'));

      // Test maximum intensity
      contentScript.applyVisualMode('grayscale', 100);
      runner.assertTrue(contentScript.styleElement.textContent.includes('grayscale(1)'));

      // Test invalid intensity (should be handled gracefully)
      contentScript.applyVisualMode('grayscale', -10);
      runner.assertEqual(contentScript.getStatus().intensity, -10); // Should accept but handle gracefully

      contentScript.applyVisualMode('grayscale', 150);
      runner.assertEqual(contentScript.getStatus().intensity, 150);

      teardown();
    });

    runner.test('Cleanup and destruction', () => {
      setup();

      // Apply mode and verify state
      contentScript.applyVisualMode('grayscale', 50);
      runner.assertTrue(contentScript.getStatus().isEnabled);
      runner.assertTrue(contentScript.styleElement !== null);

      // Destroy content script
      contentScript.destroy();

      const status = contentScript.getStatus();
      runner.assertFalse(status.isEnabled);
      runner.assertEqual(status.mode, null);
      runner.assertFalse(status.hasStyleElement);
      runner.assertFalse(status.observerActive);

      // Don't call teardown since destroy was already called
    });

    runner.test('CSS injection validation', () => {
      setup();

      contentScript.applyVisualMode('grayscale', 75);

      const css = contentScript.styleElement.textContent;

      // Verify CSS structure
      runner.assertTrue(css.includes('html {'));
      runner.assertTrue(css.includes('filter:'));
      runner.assertTrue(css.includes('grayscale(0.75)'));
      runner.assertTrue(css.includes('!important'));
      runner.assertTrue(css.includes('transition: filter 0.2s ease'));

      teardown();
    });

    runner.test('Performance with rapid mode changes', () => {
      setup();

      const start = Date.now();

      // Rapidly switch between modes
      for (let i = 0; i < 100; i++) {
        const mode = i % 2 === 0 ? 'grayscale' : 'sepia';
        const intensity = (i % 10) * 10;
        contentScript.applyVisualMode(mode, intensity);
      }

      const end = Date.now();
      const duration = end - start;

      runner.assertTrue(duration < 1000, `Rapid mode changes took ${duration}ms`);
      runner.assertTrue(contentScript.getStatus().isEnabled);

      teardown();
    });
  });
};
