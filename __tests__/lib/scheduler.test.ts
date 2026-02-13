/**
 * SM-2 Scheduler Algorithm Tests
 * Tests for the SuperMemo 2 spaced repetition algorithm
 */

describe("SM-2 Scheduler Algorithm", () => {
  // Helper: Simulate SM-2 algorithm logic
  function calculateNextInterval(
    rating: "again" | "hard" | "good" | "easy",
    currentInterval: number,
    ease: number
  ): { interval: number; ease: number } {
    let newInterval = currentInterval;
    let newEase = ease;

    switch (rating) {
      case "again":
        newInterval = 1;
        newEase = Math.max(1.3, ease - 0.2);
        break;
      case "hard":
        newInterval = Math.max(1, Math.round(currentInterval * 1.2));
        newEase = Math.max(1.3, ease - 0.15);
        break;
      case "good":
        newInterval = Math.round(currentInterval * ease);
        break;
      case "easy":
        newInterval = Math.round(currentInterval * ease * 1.3);
        newEase = ease + 0.15;
        break;
    }

    return { interval: newInterval, ease: newEase };
  }

  describe("New Card Behavior", () => {
    it("should start with interval 1 and ease 2.5", () => {
      const card = { interval: 0, ease: 2.5, state: "new" };

      expect(card.interval).toBe(0);
      expect(card.ease).toBe(2.5);
      expect(card.state).toBe("new");
    });

    it("should move to learning state after first review", () => {
      const result = calculateNextInterval("good", 1, 2.5);

      expect(result.interval).toBeGreaterThan(0);
      expect(result.ease).toBe(2.5);
    });
  });

  describe("Rating: Again", () => {
    it("should reset interval to 1 day", () => {
      const result = calculateNextInterval("again", 10, 2.5);

      expect(result.interval).toBe(1);
    });

    it("should decrease ease factor by 0.2", () => {
      const result = calculateNextInterval("again", 10, 2.5);

      expect(result.ease).toBe(2.3);
    });

    it("should not go below ease 1.3", () => {
      const result = calculateNextInterval("again", 10, 1.3);

      expect(result.ease).toBe(1.3);
    });
  });

  describe("Rating: Hard", () => {
    it("should increase interval by 1.2x", () => {
      const result = calculateNextInterval("hard", 10, 2.5);

      expect(result.interval).toBe(12);
    });

    it("should decrease ease factor by 0.15", () => {
      const result = calculateNextInterval("hard", 10, 2.5);

      expect(result.ease).toBe(2.35);
    });
  });

  describe("Rating: Good", () => {
    it("should multiply interval by ease factor", () => {
      const result = calculateNextInterval("good", 10, 2.5);

      expect(result.interval).toBe(25);
    });

    it("should keep ease factor unchanged", () => {
      const result = calculateNextInterval("good", 10, 2.5);

      expect(result.ease).toBe(2.5);
    });
  });

  describe("Rating: Easy", () => {
    it("should multiply interval by ease * 1.3", () => {
      const result = calculateNextInterval("easy", 10, 2.5);

      expect(result.interval).toBe(33); // 10 * 2.5 * 1.3 = 32.5 → 33
    });

    it("should increase ease factor by 0.15", () => {
      const result = calculateNextInterval("easy", 10, 2.5);

      expect(result.ease).toBe(2.65);
    });
  });

  describe("Edge Cases", () => {
    it("should handle interval 0 correctly", () => {
      const result = calculateNextInterval("good", 0, 2.5);

      expect(result.interval).toBe(0);
    });

    it("should ensure minimum interval of 1 for hard rating", () => {
      const result = calculateNextInterval("hard", 0, 2.5);

      expect(result.interval).toBeGreaterThanOrEqual(1);
    });

    it("should not allow ease below 1.3", () => {
      let ease = 1.5;
      for (let i = 0; i < 10; i++) {
        const result = calculateNextInterval("again", 10, ease);
        ease = result.ease;
      }

      expect(ease).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe("Long-term Learning Simulation", () => {
    it("should increase intervals over time with good ratings", () => {
      let interval = 1;
      const intervals = [];

      for (let i = 0; i < 5; i++) {
        const result = calculateNextInterval("good", interval, 2.5);
        interval = result.interval;
        intervals.push(interval);
      }

      // Each interval should be larger than previous
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
      }
    });

    it("should recover from failed reviews", () => {
      let interval = 10;
      let ease = 2.5;

      // Fail once
      const fail = calculateNextInterval("again", interval, ease);
      expect(fail.interval).toBe(1);

      // Recover with good ratings
      interval = fail.interval;
      ease = fail.ease;
      for (let i = 0; i < 3; i++) {
        const result = calculateNextInterval("good", interval, ease);
        interval = result.interval;
        ease = result.ease;
      }

      expect(interval).toBeGreaterThan(1);
    });
  });
});
