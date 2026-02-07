/**
 * Study Mode Module
 * SRS-enhanced flashcard session logic
 */

import { getActiveDeck, saveState } from '../../core/storage/storage.js';
import { dom } from '../../utils/dom-helpers.js';
import { ui, showToast } from '../../ui/components/ui.js';
import { renderMarkdown } from '../../utils/markdown-parser.js';
import { getDueCards, updateCardAfterReview, getIntervalPreview } from '../../core/srs/scheduler.js';

let sessionCards = [];
let currentIndex = 0;
let isAnswerShown = false;
let sessionResults = {
    again: 0,
    hard: 0,
    good: 0,
    easy: 0
};

/**
 * Start a new SRS study session
 */
export function startStudySession() {
    const deck = getActiveDeck();
    if (!deck) return;
    
    // Get only due cards (includes new cards)
    const dueCards = getDueCards(deck);
    
    if (dueCards.length === 0) {
        ui.alert("No cards are due for review right now! 🎉\n\nCome back later or add new cards.");
        return;
    }
    
    // Shuffle due cards
    sessionCards = [...dueCards].sort(() => Math.random() - 0.5);
    currentIndex = 0;
    isAnswerShown = false;
    
    // Reset session results
    sessionResults = { again: 0, hard: 0, good: 0, easy: 0 };
    
    dom.studyModal.classList.remove('hidden');
    renderStudyCard();
    setupStudyListeners();
}

/**
 * Render current card
 */
function renderStudyCard() {
    const card = sessionCards[currentIndex];
    
    // Reset answer shown
    isAnswerShown = false;
    dom.flashcard.classList.remove('flipped');
    
    // Render Front
    dom.studyFront.innerHTML = renderMarkdown(card.term);
    dom.studyBack.innerHTML = renderMarkdown(card.def);
    
    // Update Progress
    dom.studyIndex.textContent = currentIndex + 1;
    dom.studyTotal.textContent = sessionCards.length;
    
    // Update UI for answer-hidden state
    updateButtonsForAnswerState();
}

/**
 * Update buttons based on answer shown/hidden
 */
function updateButtonsForAnswerState() {
    const card = sessionCards[currentIndex];
    const buttonsContainer = document.querySelector('.study-rating-buttons');
    
    if (!isAnswerShown) {
        // Show "Show Answer" button
        dom.btnStudyFlip.textContent = "Show Answer (Space)";
        dom.btnStudyFlip.classList.remove('hidden');
        
        if (buttonsContainer) {
            buttonsContainer.classList.add('hidden');
        }
    } else {
        // Hide flip button, show rating buttons
        dom.btnStudyFlip.classList.add('hidden');
        
        if (buttonsContainer) {
            buttonsContainer.classList.remove('hidden');
            
            // Update button intervals
            document.getElementById('btnAgain').innerHTML = 
                `<ion-icon name="close-circle\"></ion-icon> Again (${getIntervalPreview(card, 0)})`;
            document.getElementById('btnHard').innerHTML = 
                `<ion-icon name="sad-outline\"></ion-icon> Hard (${getIntervalPreview(card, 2)})`;
            document.getElementById('btnGood').innerHTML = 
                `<ion-icon name="checkmark-circle\"></ion-icon> Good (${getIntervalPreview(card, 3)})`;
            document.getElementById('btnEasy').innerHTML = 
                `<ion-icon name="happy-outline\"></ion-icon> Easy (${getIntervalPreview(card, 5)})`;
        }
    }
}

/**
 * Show answer
 */
export function showAnswer() {
    if (!isAnswerShown) {
        isAnswerShown = true;
        dom.flashcard.classList.add('flipped');
        updateButtonsForAnswerState();
    }
}

/**
 * Rate card and move to next
 * @param {number} quality - Quality rating (0, 2, 3, 5 for Again, Hard, Good, Easy)
 */
export function rateCard(quality) {
    const deck = getActiveDeck();
    const card = sessionCards[currentIndex];
    
    // Find card in deck (by reference or by term/def match)
    const deckCardIndex = deck.cards.findIndex(c => 
        c.term === card.term && c.def === card.def
    );
    
    if (deckCardIndex !== -1) {
        // Update card with new review data
        deck.cards[deckCardIndex] = updateCardAfterReview(card, quality);
        saveState();
        
        // Track session stats
        if (quality === 0) sessionResults.again++;
        else if (quality === 2) sessionResults.hard++;
        else if (quality === 3) sessionResults.good++;
        else if (quality === 5) sessionResults.easy++;
    }
    
    // Move to next card or end session
    if (currentIndex < sessionCards.length - 1) {
        currentIndex++;
        renderStudyCard();
    } else {
        endSession();
    }
}

/**
 * End study session and show summary
 */
function endSession() {
    const total = sessionResults.again + sessionResults.hard + sessionResults.good + sessionResults.easy;
    
    const message = `
        <div style="text-align: left;">
            <h3>Session Complete! 🎉</h3>
            <p>You reviewed <strong>${total} cards</strong>:</p>
            <ul>
                <li>Again: ${sessionResults.again}</li>
                <li>Hard: ${sessionResults.hard}</li>
                <li>Good: ${sessionResults.good}</li>
                <li>Easy: ${sessionResults.easy}</li>
            </ul>
        </div>
    `;
    
    ui.alert(message);
    closeStudySession();
}

/**
 * Close Session
 */
export function closeStudySession() {
    dom.studyModal.classList.add('hidden');
    removeStudyListeners();
}

// --- Event Listeners ---

function handleKeydown(e) {
    if (dom.studyModal.classList.contains('hidden')) return;

    if (e.code === 'Space') {
        e.preventDefault();
        if (!isAnswerShown) {
            showAnswer();
        }
    } else if (e.code === 'Digit1' && isAnswerShown) {
        rateCard(0); // Again
    } else if (e.code === 'Digit2' && isAnswerShown) {
        rateCard(2); // Hard
    } else if (e.code === 'Digit3' && isAnswerShown) {
        rateCard(3); // Good
    } else if (e.code === 'Digit4' && isAnswerShown) {
        rateCard(5); // Easy
    } else if (e.code === 'Escape') {
        closeStudySession();
    }
}

function setupStudyListeners() {
    document.addEventListener('keydown', handleKeydown);
    dom.btnStudyFlip.onclick = showAnswer;
    dom.btnCloseStudy.onclick = closeStudySession;
    
    // Rating buttons
    const btnAgain = document.getElementById('btnAgain');
    const btnHard = document.getElementById('btnHard');
    const btnGood = document.getElementById('btnGood');
    const btnEasy = document.getElementById('btnEasy');
    
    if (btnAgain) btnAgain.onclick = () => rateCard(0);
    if (btnHard) btnHard.onclick = () => rateCard(2);
    if (btnGood) btnGood.onclick = () => rateCard(3);
    if (btnEasy) btnEasy.onclick = () => rateCard(5);
    
    // Prev/Next buttons removed for SRS mode
   if (dom.btnStudyPrev) dom.btnStudyPrev.style.display = 'none';
    if (dom.btnStudyNext) dom.btnStudyNext.style.display = 'none';
}

function removeStudyListeners() {
    document.removeEventListener('keydown', handleKeydown);
    dom.btnStudyFlip.onclick = null;
    dom.btnCloseStudy.onclick = null;
}
