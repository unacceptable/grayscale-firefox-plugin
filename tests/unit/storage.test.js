/**
 * Unit Tests for Storage Management
 */

module.exports = function(runner) {
  // Mock browser storage API
  const mockStorage = {
    data: {},

    get(keys) {
      return Promise.resolve(
        typeof keys === 'string'
          ? { [keys]: this.data[keys] }
          : keys.reduce((acc, key) => {
              acc[key] = this.data[key];
              return acc;
            }, {})
      );
    },

    set(items) {
      Object.assign(this.data, items);
      return Promise.resolve();
    },

    clear() {
      this.data = {};
      return Promise.resolve();
    },

    remove(keys) {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => delete this.data[key]);
      return Promise.resolve();
    }
  };

  // Storage utility functions (simulating extension code)
  class StorageManager {
    constructor(storage = mockStorage) {
      this.storage = storage;
    }

    async getSettings() {
      const defaults = {
        enabled: false,
        mode: 'grayscale',
        intensity: 50,
        whitelist: [],
        timer: {
          workDuration: 25,
          breakDuration: 5,
          isRunning: false,
          currentSession: 'work',
          timeRemaining: 25 * 60
        },
        analytics: {
          totalSessions: 0,
          totalFocusTime: 0,
          weeklyData: {}
        }
      };

      const stored = await this.storage.get(Object.keys(defaults));
      return { ...defaults, ...stored };
    }

    async saveSetting(key, value) {
      await this.storage.set({ [key]: value });
    }

    async saveSettings(settings) {
      await this.storage.set(settings);
    }

    async addToWhitelist(domain) {
      const settings = await this.getSettings();
      if (!settings.whitelist.includes(domain)) {
        settings.whitelist.push(domain);
        await this.saveSetting('whitelist', settings.whitelist);
      }
    }

    async removeFromWhitelist(domain) {
      const settings = await this.getSettings();
      settings.whitelist = settings.whitelist.filter(d => d !== domain);
      await this.saveSetting('whitelist', settings.whitelist);
    }

    async clearAllData() {
      await this.storage.clear();
    }

    async exportData() {
      const settings = await this.getSettings();
      return JSON.stringify(settings, null, 2);
    }

    async importData(jsonData) {
      try {
        const data = JSON.parse(jsonData);
        await this.saveSettings(data);
        return true;
      } catch (error) {
        return false;
      }
    }
  }

  runner.suite('Storage Management', () => {
    let storageManager;

    // Setup before each test
    function setup() {
      mockStorage.data = {};
      storageManager = new StorageManager(mockStorage);
    }

    runner.test('Default settings initialization', async () => {
      setup();
      const settings = await storageManager.getSettings();

      runner.assertEqual(settings.enabled, false);
      runner.assertEqual(settings.mode, 'grayscale');
      runner.assertEqual(settings.intensity, 50);
      runner.assertTrue(Array.isArray(settings.whitelist));
      runner.assertEqual(settings.whitelist.length, 0);
      runner.assertEqual(settings.timer.workDuration, 25);
      runner.assertEqual(settings.timer.breakDuration, 5);
    });

    runner.test('Save and retrieve individual settings', async () => {
      setup();

      await storageManager.saveSetting('enabled', true);
      await storageManager.saveSetting('mode', 'sepia');
      await storageManager.saveSetting('intensity', 75);

      const settings = await storageManager.getSettings();
      runner.assertEqual(settings.enabled, true);
      runner.assertEqual(settings.mode, 'sepia');
      runner.assertEqual(settings.intensity, 75);
    });

    runner.test('Save and retrieve complete settings', async () => {
      setup();

      const newSettings = {
        enabled: true,
        mode: 'blur',
        intensity: 80,
        whitelist: ['example.com', '*.github.com']
      };

      await storageManager.saveSettings(newSettings);
      const retrieved = await storageManager.getSettings();

      runner.assertEqual(retrieved.enabled, true);
      runner.assertEqual(retrieved.mode, 'blur');
      runner.assertEqual(retrieved.intensity, 80);
      runner.assertEqual(retrieved.whitelist.length, 2);
      runner.assertContains(retrieved.whitelist, 'example.com');
      runner.assertContains(retrieved.whitelist, '*.github.com');
    });

    runner.test('Whitelist management', async () => {
      setup();

      // Add domains
      await storageManager.addToWhitelist('example.com');
      await storageManager.addToWhitelist('*.github.com');

      let settings = await storageManager.getSettings();
      runner.assertEqual(settings.whitelist.length, 2);
      runner.assertContains(settings.whitelist, 'example.com');
      runner.assertContains(settings.whitelist, '*.github.com');

      // Prevent duplicates
      await storageManager.addToWhitelist('example.com');
      settings = await storageManager.getSettings();
      runner.assertEqual(settings.whitelist.length, 2);

      // Remove domain
      await storageManager.removeFromWhitelist('example.com');
      settings = await storageManager.getSettings();
      runner.assertEqual(settings.whitelist.length, 1);
      runner.assertFalse(settings.whitelist.includes('example.com'));
      runner.assertTrue(settings.whitelist.includes('*.github.com'));
    });

    runner.test('Timer settings persistence', async () => {
      setup();

      const timerSettings = {
        workDuration: 45,
        breakDuration: 10,
        isRunning: true,
        currentSession: 'break',
        timeRemaining: 600
      };

      await storageManager.saveSetting('timer', timerSettings);
      const settings = await storageManager.getSettings();

      runner.assertEqual(settings.timer.workDuration, 45);
      runner.assertEqual(settings.timer.breakDuration, 10);
      runner.assertEqual(settings.timer.isRunning, true);
      runner.assertEqual(settings.timer.currentSession, 'break');
      runner.assertEqual(settings.timer.timeRemaining, 600);
    });

    runner.test('Analytics data management', async () => {
      setup();

      const analyticsData = {
        totalSessions: 15,
        totalFocusTime: 18000, // 5 hours in seconds
        weeklyData: {
          '2023-12-25': { sessions: 3, focusTime: 5400 },
          '2023-12-26': { sessions: 2, focusTime: 3600 }
        }
      };

      await storageManager.saveSetting('analytics', analyticsData);
      const settings = await storageManager.getSettings();

      runner.assertEqual(settings.analytics.totalSessions, 15);
      runner.assertEqual(settings.analytics.totalFocusTime, 18000);
      runner.assertEqual(settings.analytics.weeklyData['2023-12-25'].sessions, 3);
      runner.assertEqual(settings.analytics.weeklyData['2023-12-26'].focusTime, 3600);
    });

    runner.test('Data export and import', async () => {
      setup();

      // Set up some data
      await storageManager.saveSettings({
        enabled: true,
        mode: 'sepia',
        intensity: 65,
        whitelist: ['test.com', '*.example.org']
      });

      // Export data
      const exportedData = await storageManager.exportData();
      runner.assertTrue(typeof exportedData === 'string');
      runner.assertTrue(exportedData.includes('sepia'));
      runner.assertTrue(exportedData.includes('test.com'));

      // Clear and import
      await storageManager.clearAllData();
      let settings = await storageManager.getSettings();
      runner.assertEqual(settings.enabled, false); // Should be default

      const importSuccess = await storageManager.importData(exportedData);
      runner.assertTrue(importSuccess);

      settings = await storageManager.getSettings();
      runner.assertEqual(settings.enabled, true);
      runner.assertEqual(settings.mode, 'sepia');
      runner.assertEqual(settings.intensity, 65);
      runner.assertContains(settings.whitelist, 'test.com');
    });

    runner.test('Invalid import data handling', async () => {
      setup();

      const invalidJson = '{ invalid json data }';
      const importSuccess = await storageManager.importData(invalidJson);
      runner.assertFalse(importSuccess);

      // Settings should remain unchanged
      const settings = await storageManager.getSettings();
      runner.assertEqual(settings.enabled, false); // Default value
    });

    runner.test('Large dataset handling', async () => {
      setup();

      // Create large whitelist
      const largeWhitelist = [];
      for (let i = 0; i < 1000; i++) {
        largeWhitelist.push(`site${i}.com`);
      }

      // Create large analytics data
      const largeAnalytics = {
        totalSessions: 10000,
        totalFocusTime: 3600000,
        weeklyData: {}
      };

      for (let i = 0; i < 365; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        largeAnalytics.weeklyData[dateStr] = {
          sessions: Math.floor(Math.random() * 10),
          focusTime: Math.floor(Math.random() * 7200)
        };
      }

      const start = Date.now();
      await storageManager.saveSettings({
        whitelist: largeWhitelist,
        analytics: largeAnalytics
      });

      const settings = await storageManager.getSettings();
      const end = Date.now();

      runner.assertEqual(settings.whitelist.length, 1000);
      runner.assertEqual(Object.keys(settings.analytics.weeklyData).length, 365);
      runner.assertTrue(end - start < 1000, `Large dataset handling took ${end - start}ms`);
    });

    runner.test('Concurrent access handling', async () => {
      setup();

      // Simulate concurrent writes
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(storageManager.addToWhitelist(`concurrent${i}.com`));
      }

      await Promise.all(promises);

      const settings = await storageManager.getSettings();
      runner.assertEqual(settings.whitelist.length, 10);

      // Check all domains were added
      for (let i = 0; i < 10; i++) {
        runner.assertContains(settings.whitelist, `concurrent${i}.com`);
      }
    });
  });
};
