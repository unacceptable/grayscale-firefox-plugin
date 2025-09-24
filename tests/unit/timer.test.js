/**
 * Unit Tests for Timer Functionality
 */

module.exports = function(runner) {
  // Mock timer implementation
  class PomodoroTimer {
    constructor() {
      this.workDuration = 25 * 60; // 25 minutes in seconds
      this.breakDuration = 5 * 60; // 5 minutes in seconds
      this.timeRemaining = this.workDuration;
      this.isRunning = false;
      this.currentSession = 'work'; // 'work' or 'break'
      this.intervalId = null;
      this.callbacks = {
        tick: [],
        sessionComplete: [],
        sessionStart: []
      };
    }

    setDurations(workMinutes, breakMinutes) {
      this.workDuration = workMinutes * 60;
      this.breakDuration = breakMinutes * 60;

      // Update current time remaining if not running
      if (!this.isRunning) {
        this.timeRemaining = this.currentSession === 'work'
          ? this.workDuration
          : this.breakDuration;
      }
    }

    start() {
      if (this.isRunning) return false;

      this.isRunning = true;
      this.emit('sessionStart', this.currentSession);

      this.intervalId = setInterval(() => {
        this.timeRemaining--;
        this.emit('tick', this.timeRemaining);

        if (this.timeRemaining <= 0) {
          this.completeSession();
        }
      }, 1000);

      return true;
    }

    pause() {
      if (!this.isRunning) return false;

      this.isRunning = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      return true;
    }

    reset() {
      this.pause();
      this.timeRemaining = this.currentSession === 'work'
        ? this.workDuration
        : this.breakDuration;
      this.emit('tick', this.timeRemaining);
    }

    completeSession() {
      this.pause();
      this.emit('sessionComplete', this.currentSession);

      // Switch to next session
      if (this.currentSession === 'work') {
        this.currentSession = 'break';
        this.timeRemaining = this.breakDuration;
      } else {
        this.currentSession = 'work';
        this.timeRemaining = this.workDuration;
      }

      this.emit('tick', this.timeRemaining);
    }

    skipSession() {
      this.completeSession();
    }

    getStatus() {
      return {
        isRunning: this.isRunning,
        currentSession: this.currentSession,
        timeRemaining: this.timeRemaining,
        totalDuration: this.currentSession === 'work' ? this.workDuration : this.breakDuration,
        progress: 1 - (this.timeRemaining / (this.currentSession === 'work' ? this.workDuration : this.breakDuration))
      };
    }

    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    on(event, callback) {
      if (this.callbacks[event]) {
        this.callbacks[event].push(callback);
      }
    }

    off(event, callback) {
      if (this.callbacks[event]) {
        const index = this.callbacks[event].indexOf(callback);
        if (index !== -1) {
          this.callbacks[event].splice(index, 1);
        }
      }
    }

    emit(event, data) {
      if (this.callbacks[event]) {
        this.callbacks[event].forEach(callback => callback(data));
      }
    }

    destroy() {
      this.pause();
      this.callbacks = { tick: [], sessionComplete: [], sessionStart: [] };
    }
  }

  runner.suite('Pomodoro Timer', () => {
    let timer;

    function setup() {
      timer = new PomodoroTimer();
    }

    function teardown() {
      if (timer) {
        timer.destroy();
      }
    }

    runner.test('Initial state', () => {
      setup();

      const status = timer.getStatus();
      runner.assertEqual(status.isRunning, false);
      runner.assertEqual(status.currentSession, 'work');
      runner.assertEqual(status.timeRemaining, 25 * 60);
      runner.assertEqual(status.totalDuration, 25 * 60);
      runner.assertEqual(status.progress, 0);

      teardown();
    });

    runner.test('Custom duration setting', () => {
      setup();

      timer.setDurations(45, 15);

      const status = timer.getStatus();
      runner.assertEqual(status.timeRemaining, 45 * 60);
      runner.assertEqual(status.totalDuration, 45 * 60);

      teardown();
    });

    runner.test('Timer start and pause', () => {
      setup();

      // Start timer
      const startResult = timer.start();
      runner.assertTrue(startResult);
      runner.assertEqual(timer.getStatus().isRunning, true);

      // Can't start when already running
      const secondStart = timer.start();
      runner.assertFalse(secondStart);

      // Pause timer
      const pauseResult = timer.pause();
      runner.assertTrue(pauseResult);
      runner.assertEqual(timer.getStatus().isRunning, false);

      // Can't pause when not running
      const secondPause = timer.pause();
      runner.assertFalse(secondPause);

      teardown();
    });

    runner.test('Timer reset', () => {
      setup();

      timer.timeRemaining = 100; // Simulate some time passed
      timer.reset();

      const status = timer.getStatus();
      runner.assertEqual(status.timeRemaining, 25 * 60);
      runner.assertEqual(status.isRunning, false);

      teardown();
    });

    runner.test('Session completion and switching', () => {
      setup();

      let sessionCompleteCount = 0;
      let completedSession = null;

      timer.on('sessionComplete', (session) => {
        sessionCompleteCount++;
        completedSession = session;
      });

      // Complete work session
      runner.assertEqual(timer.currentSession, 'work');
      timer.completeSession();

      runner.assertEqual(sessionCompleteCount, 1);
      runner.assertEqual(completedSession, 'work');
      runner.assertEqual(timer.currentSession, 'break');
      runner.assertEqual(timer.timeRemaining, 5 * 60);
      runner.assertEqual(timer.isRunning, false);

      // Complete break session
      timer.completeSession();

      runner.assertEqual(sessionCompleteCount, 2);
      runner.assertEqual(completedSession, 'break');
      runner.assertEqual(timer.currentSession, 'work');
      runner.assertEqual(timer.timeRemaining, 25 * 60);

      teardown();
    });

    runner.test('Time formatting', () => {
      setup();

      runner.assertEqual(timer.formatTime(0), '00:00');
      runner.assertEqual(timer.formatTime(59), '00:59');
      runner.assertEqual(timer.formatTime(60), '01:00');
      runner.assertEqual(timer.formatTime(125), '02:05');
      runner.assertEqual(timer.formatTime(3661), '61:01');

      teardown();
    });

    runner.test('Progress calculation', () => {
      setup();

      // Full time remaining = 0% progress
      timer.timeRemaining = 25 * 60;
      runner.assertEqual(timer.getStatus().progress, 0);

      // Half time remaining = 50% progress
      timer.timeRemaining = 12.5 * 60;
      const halfProgress = timer.getStatus().progress;
      runner.assertTrue(Math.abs(halfProgress - 0.5) < 0.01);

      // No time remaining = 100% progress
      timer.timeRemaining = 0;
      runner.assertEqual(timer.getStatus().progress, 1);

      teardown();
    });

    runner.test('Event callbacks', () => {
      setup();

      let tickCount = 0;
      let startCount = 0;
      let lastTickValue = -1;
      let lastStartSession = null;

      timer.on('tick', (time) => {
        tickCount++;
        lastTickValue = time;
      });

      timer.on('sessionStart', (session) => {
        startCount++;
        lastStartSession = session;
      });

      // Reset should trigger tick
      timer.reset();
      runner.assertEqual(tickCount, 1);
      runner.assertEqual(lastTickValue, 25 * 60);

      // Start should trigger sessionStart
      timer.start();
      runner.assertEqual(startCount, 1);
      runner.assertEqual(lastStartSession, 'work');

      // Complete session should trigger tick
      timer.completeSession();
      runner.assertTrue(tickCount > 1);
      runner.assertEqual(lastTickValue, 5 * 60); // Break duration

      teardown();
    });

    runner.test('Callback removal', () => {
      setup();

      let callbackCount = 0;
      const callback = () => callbackCount++;

      timer.on('tick', callback);
      timer.reset(); // Should trigger callback
      runner.assertEqual(callbackCount, 1);

      timer.off('tick', callback);
      timer.reset(); // Should not trigger callback
      runner.assertEqual(callbackCount, 1);

      teardown();
    });

    runner.test('Multiple callbacks for same event', () => {
      setup();

      let callback1Count = 0;
      let callback2Count = 0;

      timer.on('tick', () => callback1Count++);
      timer.on('tick', () => callback2Count++);

      timer.reset();

      runner.assertEqual(callback1Count, 1);
      runner.assertEqual(callback2Count, 1);

      teardown();
    });

    runner.test('Skip session functionality', () => {
      setup();

      let sessionCompleteCount = 0;
      timer.on('sessionComplete', () => sessionCompleteCount++);

      runner.assertEqual(timer.currentSession, 'work');
      timer.skipSession();

      runner.assertEqual(sessionCompleteCount, 1);
      runner.assertEqual(timer.currentSession, 'break');
      runner.assertEqual(timer.isRunning, false);

      teardown();
    });

    runner.test('Timer state persistence', () => {
      setup();

      timer.setDurations(30, 10);
      timer.timeRemaining = 900; // 15 minutes
      timer.currentSession = 'break';

      const status = timer.getStatus();
      runner.assertEqual(status.timeRemaining, 900);
      runner.assertEqual(status.currentSession, 'break');
      runner.assertEqual(status.totalDuration, 10 * 60); // Break duration

      teardown();
    });

    runner.test('Edge cases', () => {
      setup();

      // Zero duration
      timer.setDurations(0, 0);
      runner.assertEqual(timer.timeRemaining, 0);

      // Negative time remaining
      timer.timeRemaining = -10;
      const negativeProgress = timer.getStatus().progress;
      runner.assertTrue(negativeProgress > 1);

      // Very large duration
      timer.setDurations(999, 999);
      runner.assertEqual(timer.timeRemaining, 999 * 60);

      teardown();
    });

    runner.test('Memory cleanup', () => {
      setup();

      // Add callbacks
      const callback1 = () => {};
      const callback2 = () => {};

      timer.on('tick', callback1);
      timer.on('sessionComplete', callback2);

      runner.assertEqual(timer.callbacks.tick.length, 1);
      runner.assertEqual(timer.callbacks.sessionComplete.length, 1);

      // Destroy should clean up
      timer.destroy();

      runner.assertEqual(timer.callbacks.tick.length, 0);
      runner.assertEqual(timer.callbacks.sessionComplete.length, 0);
      runner.assertEqual(timer.isRunning, false);

      // teardown not needed since destroy was called
    });
  });
};
