/**
 * Dictionary Module
 * Integrates Free Dictionary API into the study tool
 */

let dictAudio = null;

export function initDictionary() {
  const searchInput = document.getElementById('dictSearchInput');
  const searchBtn = document.getElementById('btnDictSearch');
  const resultDiv = document.getElementById('dictResult');

  if (!searchInput || !searchBtn || !resultDiv) return;

  // Search on button click
  searchBtn.addEventListener('click', () => {
    const word = searchInput.value.trim();
    if (word) lookupWord(word, resultDiv);
  });

  // Search on Enter
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const word = searchInput.value.trim();
      if (word) lookupWord(word, resultDiv);
    }
  });
}

async function lookupWord(word, container) {
  container.innerHTML = `
    <div class="dict-loading">
      <div class="dict-loading-spinner"></div>
      <p>Looking up "${word}"...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `
        <div class="dict-error">
          <ion-icon name="alert-circle-outline" style="font-size:24px;margin-bottom:8px;display:block;"></ion-icon>
          ${data.error || 'Word not found'}
        </div>
      `;
      return;
    }

    renderResult(data, container);
  } catch (err) {
    container.innerHTML = `
      <div class="dict-error">
        <ion-icon name="cloud-offline-outline" style="font-size:24px;margin-bottom:8px;display:block;"></ion-icon>
        Failed to connect. Please check your internet connection.
      </div>
    `;
  }
}

function renderResult(data, container) {
  const audioUrl = data.audio || '';
  const phonetic = data.phonetic || '';

  let html = `<div class="dict-word-card">`;

  // Header with word, phonetic, audio, add button
  html += `<div class="dict-word-header">`;
  html += `<span class="dict-word">${escapeHtml(data.word)}</span>`;
  if (phonetic) {
    html += `<span class="dict-phonetic">${escapeHtml(phonetic)}</span>`;
  }
  if (audioUrl) {
    html += `<button class="dict-audio-btn" data-audio="${escapeHtml(audioUrl)}" title="Listen">
      <ion-icon name="volume-high-outline"></ion-icon>
    </button>`;
  }
  // Add to deck button
  html += `<button class="dict-add-btn" data-word="${escapeHtml(data.word)}" title="Add to current deck">
    <ion-icon name="add-circle-outline"></ion-icon> Add to Deck
  </button>`;
  html += `</div>`;

  // Meanings
  for (const meaning of data.meanings) {
    html += `<div class="dict-meaning">`;
    html += `<span class="dict-pos">${escapeHtml(meaning.partOfSpeech)}</span>`;
    html += `<ol class="dict-def-list">`;
    meaning.definitions.forEach((def, i) => {
      html += `<li class="dict-def-item">
        <span class="dict-def-num">${i + 1}.</span>
        <div class="dict-def-text">
          ${escapeHtml(def.definition)}
          ${def.example ? `<div class="dict-example">"${escapeHtml(def.example)}"</div>` : ''}
        </div>
      </li>`;
    });
    html += `</ol>`;

    // Synonyms
    if (meaning.synonyms && meaning.synonyms.length > 0) {
      html += `<div class="dict-synonyms">`;
      html += `<span class="dict-synonym-label">Synonyms:</span>`;
      meaning.synonyms.forEach(s => {
        html += `<span class="dict-synonym-tag" data-word="${escapeHtml(s)}">${escapeHtml(s)}</span>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // Wire up audio button
  const audioBtn = container.querySelector('.dict-audio-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const url = audioBtn.dataset.audio;
      if (url) {
        if (dictAudio) dictAudio.pause();
        dictAudio = new Audio(url);
        dictAudio.play().catch(() => {});
      }
    });
  }

  // Wire up synonym clicks to search
  container.querySelectorAll('.dict-synonym-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const w = tag.dataset.word;
      if (w) {
        const input = document.getElementById('dictSearchInput');
        if (input) input.value = w;
        lookupWord(w, container);
      }
    });
  });

  // Wire up add-to-deck button
  const addBtn = container.querySelector('.dict-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const word = addBtn.dataset.word;
      // Build definition string from first meaning
      const firstMeaning = data.meanings[0];
      const defText = firstMeaning
        ? `(${firstMeaning.partOfSpeech}) ${firstMeaning.definitions[0]?.definition || ''}`
        : '';
      
      // Use the omnibar to add the card
      const omnibar = document.getElementById('omnibarInput');
      if (omnibar && word && defText) {
        omnibar.value = `${word} - ${defText}`;
        omnibar.focus();
        // Dispatch enter event to add card
        omnibar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        
        // Show feedback
        addBtn.innerHTML = '<ion-icon name="checkmark-circle"></ion-icon> Added!';
        addBtn.style.background = '#10B981';
        addBtn.style.color = '#fff';
        setTimeout(() => {
          addBtn.innerHTML = '<ion-icon name="add-circle-outline"></ion-icon> Add to Deck';
          addBtn.style.background = '';
          addBtn.style.color = '';
        }, 2000);
      }
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
