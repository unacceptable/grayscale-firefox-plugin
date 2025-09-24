/**
 * Unit Tests for Analytics System
 */

module.exports = function(runner) {
  // Mock analytics system
  class AnalyticsManager {
    constructor() {
      this.data = {
        totalSessions: 0,
        totalFocusTime: 0,
        weeklyData: {},
        dailyGoal: 4, // sessions per day
        streak: 0,
        longestStreak: 0,
        lastSessionDate: null
      };
    }

    recordSession(sessionType, duration) {
      const today = this.getDateString(new Date());

      // Ensure duration is non-negative
      duration = Math.max(0, duration);

      // Update totals
      this.data.totalSessions++;

      if (sessionType === 'work') {
        this.data.totalFocusTime += duration;
      }

      // Update daily data
      if (!this.data.weeklyData[today]) {
        this.data.weeklyData[today] = {
          sessions: 0,
          focusTime: 0,
          workSessions: 0,
          breakSessions: 0
        };
      }

      const dayData = this.data.weeklyData[today];
      dayData.sessions++;

      if (sessionType === 'work') {
        dayData.focusTime += duration;
        dayData.workSessions++;
      } else {
        dayData.breakSessions++;
      }

      // Update streak
      this.updateStreak(today);

      this.data.lastSessionDate = today;
    }

    updateStreak(today) {
      const yesterday = this.getDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

      if (!this.data.lastSessionDate) {
        // First session ever
        this.data.streak = 1;
      } else if (this.data.lastSessionDate === yesterday) {
        // Continue streak from yesterday
        this.data.streak++;
      } else if (this.data.lastSessionDate === today) {
        // Already recorded today, don't change streak
        return;
      } else {
        // Gap in sessions, reset streak
        this.data.streak = 1;
      }

      this.data.longestStreak = Math.max(this.data.longestStreak, this.data.streak);
    }

    getWeeklyStats(date = new Date()) {
      const weekStart = this.getWeekStart(date);
      const weekData = [];

      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        const dateStr = this.getDateString(day);

        weekData.push({
          date: dateStr,
          dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
          ...(this.data.weeklyData[dateStr] || {
            sessions: 0,
            focusTime: 0,
            workSessions: 0,
            breakSessions: 0
          })
        });
      }

      return weekData;
    }

    getMonthlyStats(date = new Date()) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthData = [];

      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        const dateStr = this.getDateString(dayDate);

        monthData.push({
          date: dateStr,
          day: day,
          ...(this.data.weeklyData[dateStr] || {
            sessions: 0,
            focusTime: 0,
            workSessions: 0,
            breakSessions: 0
          })
        });
      }

      return monthData;
    }

    getTodayStats() {
      const today = this.getDateString(new Date());
      return this.data.weeklyData[today] || {
        sessions: 0,
        focusTime: 0,
        workSessions: 0,
        breakSessions: 0
      };
    }

    getOverallStats() {
      const totalDays = Object.keys(this.data.weeklyData).length;
      const avgSessionsPerDay = totalDays > 0 ? this.data.totalSessions / totalDays : 0;
      const avgFocusTimePerDay = totalDays > 0 ? this.data.totalFocusTime / totalDays : 0;

      return {
        totalSessions: this.data.totalSessions,
        totalFocusTime: this.data.totalFocusTime,
        totalDays: totalDays,
        avgSessionsPerDay: Math.round(avgSessionsPerDay * 10) / 10,
        avgFocusTimePerDay: Math.round(avgFocusTimePerDay),
        streak: this.data.streak,
        longestStreak: this.data.longestStreak,
        dailyGoal: this.data.dailyGoal
      };
    }

    isGoalMet(date = new Date()) {
      const dateStr = this.getDateString(date);
      const dayData = this.data.weeklyData[dateStr];
      return dayData ? dayData.workSessions >= this.data.dailyGoal : false;
    }

    setDailyGoal(sessions) {
      this.data.dailyGoal = Math.max(1, sessions);
    }

    formatDuration(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }

    getDateString(date) {
      return date.toISOString().split('T')[0];
    }

    getWeekStart(date) {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      return new Date(d.setDate(diff));
    }

    clearOldData(daysToKeep = 90) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffStr = this.getDateString(cutoffDate);

      Object.keys(this.data.weeklyData).forEach(dateStr => {
        if (dateStr < cutoffStr) {
          delete this.data.weeklyData[dateStr];
        }
      });
    }

    exportData() {
      return JSON.stringify(this.data, null, 2);
    }

    importData(jsonData) {
      try {
        const imported = JSON.parse(jsonData);
        this.data = { ...this.data, ...imported };
        return true;
      } catch (error) {
        return false;
      }
    }

    reset() {
      this.data = {
        totalSessions: 0,
        totalFocusTime: 0,
        weeklyData: {},
        dailyGoal: 4,
        streak: 0,
        longestStreak: 0,
        lastSessionDate: null
      };
    }
  }

  runner.suite('Analytics System', () => {
    let analytics;

    function setup() {
      analytics = new AnalyticsManager();
    }

    runner.test('Initial state', () => {
      setup();

      const stats = analytics.getOverallStats();
      runner.assertEqual(stats.totalSessions, 0);
      runner.assertEqual(stats.totalFocusTime, 0);
      runner.assertEqual(stats.totalDays, 0);
      runner.assertEqual(stats.streak, 0);
      runner.assertEqual(stats.longestStreak, 0);
      runner.assertEqual(stats.dailyGoal, 4);
    });

    runner.test('Session recording', () => {
      setup();

      // Record work session
      analytics.recordSession('work', 1500); // 25 minutes

      let stats = analytics.getOverallStats();
      runner.assertEqual(stats.totalSessions, 1);
      runner.assertEqual(stats.totalFocusTime, 1500);

      // Record break session
      analytics.recordSession('break', 300); // 5 minutes

      stats = analytics.getOverallStats();
      runner.assertEqual(stats.totalSessions, 2);
      runner.assertEqual(stats.totalFocusTime, 1500); // Should not include break time
    });

    runner.test('Daily data tracking', () => {
      setup();

      // Record multiple sessions in one day
      analytics.recordSession('work', 1500);
      analytics.recordSession('break', 300);
      analytics.recordSession('work', 1500);

      const todayStats = analytics.getTodayStats();
      runner.assertEqual(todayStats.sessions, 3);
      runner.assertEqual(todayStats.focusTime, 3000);
      runner.assertEqual(todayStats.workSessions, 2);
      runner.assertEqual(todayStats.breakSessions, 1);
    });

    runner.test('Weekly statistics', () => {
      setup();

      const today = new Date();

      // Record sessions for different days
      analytics.recordSession('work', 1500);

      // Mock yesterday's data
      const yesterday = analytics.getDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
      analytics.data.weeklyData[yesterday] = {
        sessions: 2,
        focusTime: 3000,
        workSessions: 2,
        breakSessions: 0
      };

      const weeklyStats = analytics.getWeeklyStats();
      runner.assertEqual(weeklyStats.length, 7);

      // Find today and yesterday in the weekly data
      const todayData = weeklyStats.find(day => day.date === analytics.getDateString(today));
      const yesterdayData = weeklyStats.find(day => day.date === yesterday);

      runner.assertEqual(todayData.sessions, 1);
      runner.assertEqual(yesterdayData.sessions, 2);
    });

    runner.test('Monthly statistics', () => {
      setup();

      const today = new Date();
      analytics.recordSession('work', 1500);

      const monthlyStats = analytics.getMonthlyStats();
      runner.assertTrue(monthlyStats.length >= 28 && monthlyStats.length <= 31);

      const todayData = monthlyStats.find(day => day.date === analytics.getDateString(today));
      runner.assertEqual(todayData.sessions, 1);
    });

    runner.test('Streak calculation', () => {
      setup();

      const today = new Date();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      // Record session for two days ago
      analytics.data.lastSessionDate = analytics.getDateString(twoDaysAgo);
      analytics.data.weeklyData[analytics.getDateString(twoDaysAgo)] = { sessions: 1, focusTime: 1500, workSessions: 1, breakSessions: 0 };

      // Record session for yesterday
      analytics.recordSession('work', 1500);
      analytics.data.lastSessionDate = analytics.getDateString(yesterday);

      // Record session for today
      analytics.recordSession('work', 1500);

      const stats = analytics.getOverallStats();
      runner.assertTrue(stats.streak > 0);
      runner.assertTrue(stats.longestStreak >= stats.streak);
    });

    runner.test('Daily goal tracking', () => {
      setup();

      // Default goal is 4 sessions
      runner.assertFalse(analytics.isGoalMet());

      // Record work sessions to meet goal
      for (let i = 0; i < 4; i++) {
        analytics.recordSession('work', 1500);
      }

      runner.assertTrue(analytics.isGoalMet());

      // Change goal
      analytics.setDailyGoal(6);
      runner.assertFalse(analytics.isGoalMet());

      analytics.recordSession('work', 1500);
      analytics.recordSession('work', 1500);
      runner.assertTrue(analytics.isGoalMet());
    });

    runner.test('Duration formatting', () => {
      setup();

      runner.assertEqual(analytics.formatDuration(0), '0m');
      runner.assertEqual(analytics.formatDuration(300), '5m');
      runner.assertEqual(analytics.formatDuration(1500), '25m');
      runner.assertEqual(analytics.formatDuration(3600), '1h 0m');
      runner.assertEqual(analytics.formatDuration(3900), '1h 5m');
      runner.assertEqual(analytics.formatDuration(7200), '2h 0m');
    });

    runner.test('Average calculations', () => {
      setup();

      // Add data for 3 days
      const dates = [];
      for (let i = 0; i < 3; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = analytics.getDateString(date);
        dates.push(dateStr);

        analytics.data.weeklyData[dateStr] = {
          sessions: 4,
          focusTime: 6000, // 100 minutes
          workSessions: 4,
          breakSessions: 0
        };
      }

      analytics.data.totalSessions = 12;
      analytics.data.totalFocusTime = 18000; // 300 minutes

      const stats = analytics.getOverallStats();
      runner.assertEqual(stats.avgSessionsPerDay, 4);
      runner.assertEqual(stats.avgFocusTimePerDay, 6000);
    });

    runner.test('Data cleanup', () => {
      setup();

      // Add old data
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      const oldDateStr = analytics.getDateString(oldDate);

      analytics.data.weeklyData[oldDateStr] = {
        sessions: 2,
        focusTime: 3000,
        workSessions: 2,
        breakSessions: 0
      };

      // Add recent data
      analytics.recordSession('work', 1500);

      runner.assertTrue(analytics.data.weeklyData[oldDateStr] !== undefined);

      // Clean old data (keep 90 days)
      analytics.clearOldData(90);

      runner.assertTrue(analytics.data.weeklyData[oldDateStr] === undefined);

      const todayStats = analytics.getTodayStats();
      runner.assertEqual(todayStats.sessions, 1); // Recent data should remain
    });

    runner.test('Data export and import', () => {
      setup();

      // Add some data
      analytics.recordSession('work', 1500);
      analytics.setDailyGoal(6);

      const exportedData = analytics.exportData();
      runner.assertTrue(typeof exportedData === 'string');
      runner.assertTrue(exportedData.includes('totalSessions'));

      // Reset and import
      analytics.reset();
      runner.assertEqual(analytics.getOverallStats().totalSessions, 0);

      const importSuccess = analytics.importData(exportedData);
      runner.assertTrue(importSuccess);

      const stats = analytics.getOverallStats();
      runner.assertEqual(stats.totalSessions, 1);
      runner.assertEqual(stats.dailyGoal, 6);
    });

    runner.test('Invalid import data', () => {
      setup();

      analytics.recordSession('work', 1500);
      const originalSessions = analytics.getOverallStats().totalSessions;

      const importSuccess = analytics.importData('invalid json');
      runner.assertFalse(importSuccess);

      // Data should remain unchanged
      runner.assertEqual(analytics.getOverallStats().totalSessions, originalSessions);
    });

    runner.test('Edge cases', () => {
      setup();

      // Zero duration session
      analytics.recordSession('work', 0);
      runner.assertEqual(analytics.getOverallStats().totalFocusTime, 0);

      // Negative duration (should be handled gracefully)
      analytics.recordSession('work', -100);
      const stats = analytics.getOverallStats();
      runner.assertTrue(stats.totalFocusTime >= 0);

      // Invalid goal setting
      analytics.setDailyGoal(0);
      runner.assertEqual(analytics.getOverallStats().dailyGoal, 1); // Should be minimum 1

      analytics.setDailyGoal(-5);
      runner.assertEqual(analytics.getOverallStats().dailyGoal, 1); // Should be minimum 1
    });

    runner.test('Large dataset performance', () => {
      setup();

      // Add 365 days of data
      const start = Date.now();

      for (let i = 0; i < 365; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = analytics.getDateString(date);

        analytics.data.weeklyData[dateStr] = {
          sessions: Math.floor(Math.random() * 8) + 1,
          focusTime: Math.floor(Math.random() * 7200) + 1800,
          workSessions: Math.floor(Math.random() * 6) + 1,
          breakSessions: Math.floor(Math.random() * 6) + 1
        };
      }

      // Test operations on large dataset
      const weeklyStats = analytics.getWeeklyStats();
      const monthlyStats = analytics.getMonthlyStats();
      const overallStats = analytics.getOverallStats();

      const end = Date.now();

      runner.assertEqual(weeklyStats.length, 7);
      runner.assertTrue(monthlyStats.length >= 28);
      runner.assertTrue(overallStats.totalDays > 0);
      runner.assertTrue(end - start < 1000, `Large dataset operations took ${end - start}ms`);
    });
  });
};
