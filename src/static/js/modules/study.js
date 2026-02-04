/**
 * Study Mode Module
 * Flashcard session logic
 */

import { getActiveDeck } from './state.js';
import { dom } from './dom.js';
import { ui } from './ui.js'; // For alerts if deck empty
import { renderMarkdown } from './markdown.js';

let sessionCards = [];
let currentIndex = 0;
let isFlipped = false;

/**
 * Start a new study session
 */
export function startStudySession() {
    const deck = getActiveDeck();
    if (!deck) return;
    
    // Filter valid cards
    const validCards = deck.cards.filter(c => c.term && c.def);
    
    if (validCards.length === 0) {
        ui.alert("This deck is empty. Add some cards first!");
        return;
    }
    
    // Shuffle cards
    sessionCards = [...validCards].sort(() => Math.random() - 0.5);
    currentIndex = 0;
    isFlipped = false;
    
    dom.studyModal.classList.remove('hidden');
    renderStudyCard();
    setupStudyListeners();
}

/**
 * Render current card
 */
function renderStudyCard() {
    const card = sessionCards[currentIndex];
    
    // Reset Flip
    isFlipped = false;
    dom.flashcard.classList.remove('flipped');
    dom.btnStudyFlip.textContent = "Show Answer (Space)";
    
    // Render Content
    dom.studyFront.innerHTML = renderMarkdown(card.term);
    dom.studyBack.innerHTML = renderMarkdown(card.def);
    
    // Update Progress
    dom.studyIndex.textContent = currentIndex + 1;
    dom.studyTotal.textContent = sessionCards.length;
    
    // Button States
    dom.btnStudyPrev.disabled = currentIndex === 0;
    dom.btnStudyNext.disabled = currentIndex === sessionCards.length - 1;
}

/**
 * Toggle Flip
 */
export function flipCard() {
    isFlipped = !isFlipped;
    dom.flashcard.classList.toggle('flipped');
    
    if (isFlipped) {
        dom.btnStudyFlip.textContent = "Back to Question";
    } else {
        dom.btnStudyFlip.textContent = "Show Answer (Space)";
    }
}

/**
 * Helper to animate transition
 * @param {string} exitClass 
 * @param {string} entryClass 
 * @param {Function} callback 
 */
function animateTransition(exitClass, entryClass, callback) {
    const cardEl = dom.flashcard;
    
    // Exit Phase
    cardEl.classList.add(exitClass);
    
    setTimeout(() => {
        // Callback (Change Content)
        callback();
        
        // Prepare Entry Phase
        cardEl.classList.remove(exitClass);
        cardEl.classList.add(entryClass);
        
        // Wait for Entry to finish
        setTimeout(() => {
            cardEl.classList.remove(entryClass);
        }, 200); // 0.2s matches CSS
        
    }, 200); // 0.2s matches CSS
}

/**
 * Next Card
 */
export function nextCard() {
    if (currentIndex < sessionCards.length - 1) {
        animateTransition('anim-slide-out-left', 'anim-slide-in-right', () => {
            currentIndex++;
            renderStudyCard();
        });
    }
}

/**
 * Previous Card
 */
export function prevCard() {
    if (currentIndex > 0) {
        animateTransition('anim-slide-out-right', 'anim-slide-in-left', () => {
            currentIndex--;
            renderStudyCard();
        });
    }
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
        flipCard();
    } else if (e.code === 'ArrowRight') {
        nextCard();
    } else if (e.code === 'ArrowLeft') {
        prevCard();
    } else if (e.code === 'Escape') {
        closeStudySession();
    }
}

function setupStudyListeners() {
    document.addEventListener('keydown', handleKeydown);
    dom.flashcard.onclick = flipCard;
    dom.btnStudyFlip.onclick = flipCard;
    dom.btnStudyNext.onclick = nextCard;
    dom.btnStudyPrev.onclick = prevCard;
    dom.btnCloseStudy.onclick = closeStudySession;
}

function removeStudyListeners() {
    document.removeEventListener('keydown', handleKeydown);
    // Elements persist, so we might duplicate listeners if we don't handle them carefully.
    // Better strategy: Assign onclicks once in module init or overrides.
    // Assigning to .onclick overrides previous, so it's safe.
    dom.flashcard.onclick = null;
    dom.btnStudyFlip.onclick = null;
    dom.btnStudyNext.onclick = null;
    dom.btnStudyPrev.onclick = null;
    dom.btnCloseStudy.onclick = null;
}
