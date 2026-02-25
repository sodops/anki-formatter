"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

interface Card {
  id: string;
  term: string;
  definition: string;
  tags?: string[];
}

interface AssignmentInfo {
  id: string;
  title: string;
  xp_reward: number;
  deadline: string | null;
  decks: { deck_name: string; card_count: number }[];
}

interface SessionResults {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

type Phase = "loading" | "ready" | "studying" | "summary";

export default function AssignmentStudyPage({ params }: { params: { id: string } }) {
  const assignmentId = params.id;
  const { user, loading: authLoading } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading");
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<SessionResults>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [startTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const flipRef = useRef<HTMLDivElement>(null);

  // Fetch assignment data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/study`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load");
      }
      const data = await res.json();
      setAssignment(data.assignment);
      setCards(data.cards || []);

      if (data.cards?.length > 0) {
        setPhase("ready");
      } else {
        setError("No cards found in this assignment.");
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user, fetchData]);

  // Start study session
  const startSession = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setSessionCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults({ again: 0, hard: 0, good: 0, easy: 0 });
    setMasteredCards(new Set());
    setPhase("studying");
  };

  // Show answer
  const showAnswer = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  // Rate card
  const rateCard = (quality: "again" | "hard" | "good" | "easy") => {
    const card = sessionCards[currentIndex];

    setResults(prev => ({ ...prev, [quality]: prev[quality] + 1 }));

    // Track mastered (good/easy = mastered)
    if (quality === "good" || quality === "easy") {
      setMasteredCards(prev => new Set(prev).add(card.id));
    }

    // Re-queue "again" cards
    if (quality === "again") {
      const reinsertOffset = Math.min(3 + Math.floor(Math.random() * 5), sessionCards.length - currentIndex);
      const newCards = [...sessionCards];
      newCards.splice(currentIndex + reinsertOffset, 0, { ...card });
      setSessionCards(newCards);
    }

    // Re-queue "hard" cards further ahead
    if (quality === "hard") {
      const reinsertOffset = Math.min(5 + Math.floor(Math.random() * 7), sessionCards.length - currentIndex);
      const newCards = [...sessionCards];
      newCards.splice(currentIndex + reinsertOffset, 0, { ...card });
      setSessionCards(newCards);
    }

    // Move to next or end
    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      finishSession(quality);
    }
  };

  // Submit results
  const finishSession = async (lastRating?: "again" | "hard" | "good" | "easy") => {
    // Include the last card's rating that hasn't been applied to state yet
    const finalResults = lastRating
      ? { ...results, [lastRating]: results[lastRating] + 1 }
      : results;

    // Also track if last card was mastered
    const lastCardId = lastRating && sessionCards[currentIndex] ? sessionCards[currentIndex].id : null;
    const finalMastered = new Set(masteredCards);
    if (lastRating && (lastRating === "good" || lastRating === "easy") && lastCardId) {
      finalMastered.add(lastCardId);
    }

    // Update results state BEFORE switching to summary so summary uses correct values
    setResults(finalResults);
    setMasteredCards(finalMastered);
    setPhase("summary");

    const totalReviews = finalResults.again + finalResults.hard + finalResults.good + finalResults.easy;
    const goodEasy = finalResults.good + finalResults.easy;
    const accuracy = totalReviews > 0 ? Math.round((goodEasy / totalReviews) * 100) : 0;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    setSubmitting(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/study`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards_studied: new Set(sessionCards.map(c => c.id)).size,
          cards_mastered: finalMastered.size,
          accuracy,
          total_reviews: totalReviews,
          time_spent_seconds: timeSpent,
          ratings: finalResults,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session_xp) {
          setXpAwarded(prev => prev + data.session_xp);
        }
      }
    } catch {
      // silently fail, results tracked locally
    } finally {
      setSubmitting(false);
    }
  };

  // Complete assignment (student manually marks as done)
  const completeAssignment = async () => {
    if (completing || completed) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete");
      setCompleted(true);
      setXpAwarded(data.xp_awarded || 0);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCompleting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== "studying") return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!isFlipped) showAnswer();
      } else if (e.code === "Digit1" && isFlipped) {
        e.preventDefault();
        rateCard("again");
      } else if (e.code === "Digit2" && isFlipped) {
        e.preventDefault();
        rateCard("hard");
      } else if (e.code === "Digit3" && isFlipped) {
        e.preventDefault();
        rateCard("good");
      } else if (e.code === "Digit4" && isFlipped) {
        e.preventDefault();
        rateCard("easy");
      } else if (e.code === "Escape") {
        e.preventDefault();
        finishSession();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, isFlipped, currentIndex, sessionCards]);

  // Loading
  if (authLoading || phase === "loading") {
    return (
      <div className="as-loading">
        <div className="as-spinner" />
        <p>Loading assignment...</p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="as-loading">
        <div className="as-error-icon"><ion-icon name="alert-circle-outline" style={{ fontSize: 48 }}></ion-icon></div>
        <h2>Error</h2>
        <p>{error}</p>
        <Link href="/student" className="as-btn as-btn-primary">← Back</Link>
      </div>
    );
  }

  // Ready - pre-session screen
  if (phase === "ready" && assignment) {
    return (
      <div className="as-container">
        <div className="as-ready">
          <Link href="/student" className="as-back-link">
            <ion-icon name="arrow-back-outline"></ion-icon> Back to Dashboard
          </Link>

          <div className="as-ready-card">
            <div className="as-ready-icon"><ion-icon name="library-outline" style={{ fontSize: 48 }}></ion-icon></div>
            <h1>{assignment.title}</h1>
            <div className="as-ready-meta">
              {assignment.deadline && (
                <span className="as-deadline">
                  <ion-icon name="time-outline"></ion-icon>
                  Due: {new Date(assignment.deadline).toLocaleDateString()}
                </span>
              )}
              <span className="as-xp-badge"><ion-icon name="flash" style={{ fontSize: 14 }}></ion-icon> {assignment.xp_reward} XP</span>
            </div>

            <div className="as-ready-stats">
              <div className="as-ready-stat">
                <span className="as-ready-stat-val">{cards.length}</span>
                <span className="as-ready-stat-label">Cards</span>
              </div>
              <div className="as-ready-stat">
                <span className="as-ready-stat-val">{assignment.decks?.length || 0}</span>
                <span className="as-ready-stat-label">Decks</span>
              </div>
            </div>

            <div className="as-deck-list">
              {assignment.decks?.map((d, i) => (
                <div key={i} className="as-deck-chip">
                  <ion-icon name="albums-outline"></ion-icon>
                  {d.deck_name} ({d.card_count} cards)
                </div>
              ))}
            </div>

            <div className="as-ready-info">
              <p>You&apos;ll see each card&apos;s front side. Tap to reveal the answer, then rate how well you remembered it.</p>
              <div className="as-rating-legend">
                <span className="as-legend-item again">1 Again</span>
                <span className="as-legend-item hard">2 Hard</span>
                <span className="as-legend-item good">3 Good</span>
                <span className="as-legend-item easy">4 Easy</span>
              </div>
            </div>

            <button className="as-btn as-btn-start" onClick={startSession}>
              <ion-icon name="play"></ion-icon>
              Start Studying
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Studying
  if (phase === "studying" && sessionCards.length > 0) {
    const card = sessionCards[currentIndex];
    const progress = Math.round(((currentIndex + 1) / sessionCards.length) * 100);

    return (
      <div className="as-container">
        {/* Top bar */}
        <div className="as-study-header">
          <Link href="/student" className="as-close-btn" title="Exit">
            <ion-icon name="close-outline"></ion-icon>
          </Link>
          <div className="as-study-title">{assignment?.title}</div>
          <div className="as-study-header-right">
            <div className="as-study-counter">{currentIndex + 1} / {sessionCards.length}</div>
            <button className="as-btn as-btn-finish" onClick={() => finishSession()} title="Finish session (Esc)">
              <ion-icon name="flag-outline"></ion-icon> Finish
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="as-progress-bar">
          <div className="as-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Flashcard */}
        <div className="as-card-area">
          <div
            className={`as-flashcard ${isFlipped ? "flipped" : ""}`}
            onClick={() => !isFlipped && showAnswer()}
            ref={flipRef}
          >
            <div className="as-flashcard-inner">
              <div className="as-flashcard-front">
                <div className="as-card-label">TERM</div>
                <div className="as-card-text">{card.term}</div>
                {!isFlipped && (
                  <div className="as-tap-hint">Tap to reveal answer</div>
                )}
              </div>
              <div className="as-flashcard-back">
                <div className="as-card-label">DEFINITION</div>
                <div className="as-card-text">{card.definition}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="as-actions">
          {!isFlipped ? (
            <button className="as-btn as-btn-show" onClick={showAnswer}>
              Show Answer <kbd>Space</kbd>
            </button>
          ) : (
            <div className="as-rating-buttons">
              <button className="as-rate-btn as-rate-again" onClick={() => rateCard("again")}>
                <ion-icon name="close-circle"></ion-icon>
                <span>Again</span>
                <kbd>1</kbd>
              </button>
              <button className="as-rate-btn as-rate-hard" onClick={() => rateCard("hard")}>
                <ion-icon name="sad-outline"></ion-icon>
                <span>Hard</span>
                <kbd>2</kbd>
              </button>
              <button className="as-rate-btn as-rate-good" onClick={() => rateCard("good")}>
                <ion-icon name="checkmark-circle"></ion-icon>
                <span>Good</span>
                <kbd>3</kbd>
              </button>
              <button className="as-rate-btn as-rate-easy" onClick={() => rateCard("easy")}>
                <ion-icon name="happy-outline"></ion-icon>
                <span>Easy</span>
                <kbd>4</kbd>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Summary
  if (phase === "summary") {
    const total = results.again + results.hard + results.good + results.easy;
    const goodEasy = results.good + results.easy;
    const accuracy = total > 0 ? Math.round((goodEasy / total) * 100) : 0;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;

    return (
      <div className="as-container">
        <div className="as-summary">
          <div className="as-summary-card">
            <div className="as-summary-icon"><ion-icon name="trophy-outline" style={{ fontSize: 48 }}></ion-icon></div>
            <h1>Session Complete!</h1>
            <p className="as-summary-subtitle">{assignment?.title}</p>

            {/* Accuracy Ring */}
            <div className="as-accuracy-ring">
              <svg viewBox="0 0 36 36" className="as-ring-svg">
                <path className="as-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="as-ring-fill" strokeDasharray={`${accuracy}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="as-accuracy-text">{accuracy}%</div>
            </div>

            {/* Stats grid */}
            <div className="as-summary-stats">
              <div className="as-sum-stat">
                <span className="as-sum-val">{total}</span>
                <span className="as-sum-label">Reviews</span>
              </div>
              <div className="as-sum-stat">
                <span className="as-sum-val">{masteredCards.size}</span>
                <span className="as-sum-label">Mastered</span>
              </div>
              <div className="as-sum-stat">
                <span className="as-sum-val">{minutes}m {seconds}s</span>
                <span className="as-sum-label">Time</span>
              </div>
            </div>

            {/* Rating breakdown */}
            <div className="as-rating-breakdown">
              <div className="as-rb-item again">
                <span className="as-rb-label">Again</span>
                <div className="as-rb-bar"><div style={{ width: `${total > 0 ? (results.again / total) * 100 : 0}%` }} /></div>
                <span className="as-rb-val">{results.again}</span>
              </div>
              <div className="as-rb-item hard">
                <span className="as-rb-label">Hard</span>
                <div className="as-rb-bar"><div style={{ width: `${total > 0 ? (results.hard / total) * 100 : 0}%` }} /></div>
                <span className="as-rb-val">{results.hard}</span>
              </div>
              <div className="as-rb-item good">
                <span className="as-rb-label">Good</span>
                <div className="as-rb-bar"><div style={{ width: `${total > 0 ? (results.good / total) * 100 : 0}%` }} /></div>
                <span className="as-rb-val">{results.good}</span>
              </div>
              <div className="as-rb-item easy">
                <span className="as-rb-label">Easy</span>
                <div className="as-rb-bar"><div style={{ width: `${total > 0 ? (results.easy / total) * 100 : 0}%` }} /></div>
                <span className="as-rb-val">{results.easy}</span>
              </div>
            </div>

            {/* XP info */}
            <div className="as-xp-earned">
              <ion-icon name="flash" style={{ fontSize: 16, verticalAlign: 'middle' }}></ion-icon> +5 XP for this study session
              {accuracy === 100 && <span> · <ion-icon name="trophy" style={{ fontSize: 14, verticalAlign: 'middle', color: '#F59E0B' }}></ion-icon> Perfect score bonus available!</span>}
            </div>
            <div className="as-xp-formula">
              <span>Completion reward: up to {assignment?.xp_reward || 0} XP (based on {accuracy}% accuracy = ~{Math.round((assignment?.xp_reward || 0) * Math.max(0.1, accuracy / 100))} XP)</span>
            </div>

            {submitting && <p className="as-saving">Saving results...</p>}

            {/* Complete Assignment Button */}
            {!completed ? (
              <div className="as-complete-section">
                <p className="as-complete-hint">Ready to finish? Mark this assignment as complete to earn your XP!</p>
                <button
                  className="as-btn as-btn-complete"
                  onClick={completeAssignment}
                  disabled={completing}
                >
                  {completing ? (
                    <><span className="as-btn-spinner"></span> Completing...</>
                  ) : (
                    <><ion-icon name="checkmark-done-outline"></ion-icon> Complete Assignment</>
                  )}
                </button>
              </div>
            ) : (
              <div className="as-complete-success">
                <div className="as-complete-check"><ion-icon name="checkmark-circle" style={{ fontSize: 40, color: '#10B981' }}></ion-icon></div>
                <h3>Assignment Completed!</h3>
                <p className="as-xp-awarded"><ion-icon name="flash" style={{ fontSize: 16, verticalAlign: 'middle' }}></ion-icon> +{xpAwarded} XP earned!</p>
              </div>
            )}

            <div className="as-summary-actions">
              <button className="as-btn as-btn-primary" onClick={startSession}>
                <ion-icon name="refresh-outline"></ion-icon> Study Again
              </button>
              <Link href="/student" className="as-btn as-btn-secondary">
                <ion-icon name="home-outline"></ion-icon> Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
