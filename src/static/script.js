const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.querySelector('.browse-btn');
const uploadForm = document.getElementById('uploadForm');
const convertBtn = document.getElementById('convertBtn');
const loader = document.querySelector('.loader');
const btnText = document.querySelector('.btn-text');

// Tabs
const tabFile = document.getElementById('tabFile');
const tabUrl = document.getElementById('tabUrl');
const tabText = document.getElementById('tabText');

const fileSection = document.getElementById('fileSection');
const urlSection = document.getElementById('urlSection');
const textSection = document.getElementById('textSection');

// Modes: 'file', 'url', 'text'
let currentMode = 'file';

// Panels
const editorPanel = document.getElementById('editorPanel');
const resultPanel = document.getElementById('resultPanel');
const successView = document.getElementById('successView');
const errorView = document.getElementById('errorView');

// Editor elements
const cardsTableBody = document.querySelector('#cardsTable tbody');
const addCardBtn = document.getElementById('addCardBtn');
const generateBtn = document.getElementById('generateBtn');
const genLoader = document.getElementById('genLoader');
const outputFilenameInput = document.getElementById('outputFilename');

// Stats & Skipped & Add Selected
const statSkippedBtn = document.getElementById('btnToggleSkipped');
const skippedSection = document.getElementById('skippedSection');
const skippedList = document.getElementById('skippedList');
const btnAddSelected = document.getElementById('btnAddSelected');

let currentFailures = []; // Store raw failure strings

// Toggle Skipped
if(statSkippedBtn) {
    statSkippedBtn.addEventListener('click', () => {
        skippedSection.classList.toggle('hidden');
    });
}
if(skippedSection) {
    skippedSection.addEventListener('click', (e) => {
        if(e.target.closest('.skipped-header') && !e.target.matches('button')) {
             skippedSection.classList.add('hidden');
        }
    });
}

// Helper to clean error tags and bullets
function cleanLine(rawLine) {
    // 1. Remove [Error Tag] if present at the start
    let cleaned = rawLine.replace(/^\[.*?\]\s*/, '');
    // 2. Remove common bullets, numbering, arrows
    cleaned = cleaned.replace(/^[\s]*((?:\d+\.)|[•\-\–\—\>\→\⇒\●\*]+)[\s]*/, '');
    return cleaned.trim();
}

// Add Selected
if(btnAddSelected) {
    btnAddSelected.addEventListener('click', () => {
        const checkboxes = skippedList.querySelectorAll('input[type="checkbox"]:checked');
        const selectedLines = [];
        
        checkboxes.forEach(cb => {
            const rawLine = cb.dataset.rawLine;
            if(rawLine) {
                selectedLines.push(rawLine);
                cb.closest('.skipped-item').remove();
            }
        });
        
        if(selectedLines.length === 0) {
            alert('Please select at least one line to add');
            return;
        }
        
        selectedLines.forEach(line => {
             const cleaned = cleanLine(line);
             // Try simple split first
             const parts = parseLineManually(cleaned);
             if(parts) {
                 addRow(parts.term, parts.definition);
             } else {
                 // Even if fails, add CLEANED line to Front so user can edit
                 addRow(cleaned, "");
             }
        });
        
        // Update stats
        updateStats(selectedLines.length, -selectedLines.length);
        
        // Remove from currentFailures matches
        currentFailures = currentFailures.filter(f => !selectedLines.includes(f));
        
        // If skipped list is empty now, show empty message
        if(skippedList.children.length === 0) {
             renderSkippedList([]);
        }
    });
}

// Tab Switching
const tabReader = document.getElementById('tabReader');
const readerSection = document.getElementById('readerSection');

// Reading Mode Elements
const readingNameInput = document.getElementById('readingName');
const readTermInput = document.getElementById('readTerm');
const readDefInput = document.getElementById('readDef');
const btnAddToSession = document.getElementById('btnAddToSession');
const sessionList = document.getElementById('sessionList');
const sessionCountSpan = document.getElementById('sessionCount');

let sessionItems = []; // Array of {term, def}

// Tab Switching
tabFile.addEventListener('click', () => switchTab('file'));
tabUrl.addEventListener('click', () => switchTab('url'));
tabText.addEventListener('click', () => switchTab('text'));
if(tabReader) tabReader.addEventListener('click', () => switchTab('reader'));

function switchTab(mode) {
    currentMode = mode;
    
    // Reset active class
    tabFile.classList.remove('active');
    tabUrl.classList.remove('active');
    tabText.classList.remove('active');
    if(tabReader) tabReader.classList.remove('active');
    
    // Reset sections
    fileSection.classList.add('hidden');
    urlSection.classList.add('hidden');
    textSection.classList.add('hidden');
    if(readerSection) readerSection.classList.add('hidden');
    
    // Hide main Convert Button in Reader Mode (replaced by specific actions)
    convertBtn.classList.remove('hidden');

    if (mode === 'file') {
        tabFile.classList.add('active');
        fileSection.classList.remove('hidden');
    } else if (mode === 'url') {
        tabUrl.classList.add('active');
        urlSection.classList.remove('hidden');
    } else if (mode === 'text') {
        tabText.classList.add('active');
        textSection.classList.remove('hidden');
    } else if (mode === 'reader') {
        if(tabReader) tabReader.classList.add('active');
        if(readerSection) readerSection.classList.remove('hidden');
        convertBtn.classList.add('hidden'); // Hide default convert button
        loadSession(); // Load from localStorage
    }
}

// Reading Mode Logic
if(btnAddToSession) {
    btnAddToSession.addEventListener('click', addSessionItem);
}

// Enter Key Support
if(readDefInput) {
    readDefInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') addSessionItem();
    });
}

function addSessionItem() {
    const term = readTermInput.value.trim();
    const def = readDefInput.value.trim();
    
    if(!term) {
        readTermInput.focus();
        return;
    }
    
    sessionItems.push({ term, def });
    saveSession();
    renderSession();
    
    // Clear inputs
    readTermInput.value = '';
    readDefInput.value = '';
    readTermInput.focus();
}

function removeSessionItem(index) {
    sessionItems.splice(index, 1);
    saveSession();
    renderSession();
}

function saveSession() {
    localStorage.setItem('anki_reader_items', JSON.stringify(sessionItems));
    localStorage.setItem('anki_reader_name', readingNameInput.value);
}

function loadSession() {
    const savedItems = localStorage.getItem('anki_reader_items');
    const savedName = localStorage.getItem('anki_reader_name');
    
    if(savedItems) {
        try {
            sessionItems = JSON.parse(savedItems);
        } catch(e) {
            sessionItems = [];
        }
    }
    if(savedName) {
        readingNameInput.value = savedName;
    }
    renderSession();
}

function renderSession() {
    sessionList.innerHTML = '';
    sessionCountSpan.textContent = sessionItems.length;
    
    sessionItems.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <span class="term">${escapeHtml(item.term)}</span>
                <span class="def">${escapeHtml(item.def)}</span>
            </div>
            <button class="remove-item-btn" onclick="removeSessionItem(${index})">×</button>
        `;
        sessionList.appendChild(li);
    });
    
    // Add "Export/Finish" button if items exist
    const existingExportBtn = document.getElementById('btnExportSession');
    if(existingExportBtn) existingExportBtn.remove();
    
    if(sessionItems.length > 0) {
        const btnFn = document.createElement('button');
        btnFn.id = 'btnExportSession';
        btnFn.type = 'button'; // Prevent form submission
        btnFn.className = 'submit-btn';
        btnFn.style.marginTop = '20px';
        btnFn.textContent = 'Finish & Convert to Cards';
        btnFn.onclick = exportSessionToCards;
        readerSection.appendChild(btnFn);
    }
}

function exportSessionToCards() {
    // 1. Set Deck Name
    const rName = readingNameInput.value.trim();
    if(rName) {
        document.getElementById('deckName').value = rName;
    }
    
    // Hide error/success panels if open
    resultPanel.classList.add('hidden');
    
    // 2. Clear current table? Or append? Let's append.
    // However, if we are "starting conversion", usually we want a fresh start or specific flow.
    // Let's just switch to Editor Panel and populate table.
    
    showEditor({ cards: [], failures: [], stats: { total: sessionItems.length } }); // Reset editor with empty
    
    // Manually add rows
    cardsTableBody.innerHTML = '';
    sessionItems.forEach(item => {
        addRow(item.term, item.def);
    });
    
    // Update stats logic manually since showEditor resets them
    document.getElementById('statParsed').textContent = sessionItems.length;
    document.getElementById('statTotal').textContent = sessionItems.length;
    
    // Maybe clear session? 
    // Let's keep it until user clears it or overwrites it, 
    // but maybe nice to clear inputs if successful. 
    // For now, keep it safe in localStorage.
}

// Helper: Client-side parser for skipped items
function parseLineManually(line) {
    const separators = [' == ', '==', ' -> ', '->', ' => ', '=>', ' : ', ' = ', '\t', ' - '];
    // Clean start
    const cleaned = line.replace(/^[\s]*((?:\d+\.)|[•\-\–\—\>\→\⇒\●\*]+)[\s]*/, '').trim();
    if(!cleaned) return null;
    
    for(const sep of separators) {
        if(cleaned.includes(sep)) {
            const parts = cleaned.split(sep);
            return { term: parts[0].trim(), definition: parts.slice(1).join(sep).trim() };
        }
    }
    return null;
}

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        updateDropZone(e.dataTransfer.files[0]);
    }
});
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    if (fileInput.files.length) updateDropZone(fileInput.files[0]);
});
function updateDropZone(file) {
    const p = dropZone.querySelector('p');
    p.textContent = `Selected: ${file.name}`;
    p.style.color = '#fff';
}

// STEP 1: Parse Form
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(uploadForm);
    
    // Validate based on mode
    if (currentMode === 'file') {
        if (!fileInput.files.length) {
            alert("Please select a file first.");
            return;
        }
    } else if (currentMode === 'url') {
        const url = document.getElementById('docUrl').value.trim();
        if (!url) {
            alert("Please enter a Google Docs URL.");
            return;
        }
    } else if (currentMode === 'text') {
        const txt = document.getElementById('rawText').value.trim();
        if (!txt) {
            alert("Please paste some vocabulary text.");
            return;
        }
    }

    // UI Loading
    convertBtn.disabled = true;
    loader.classList.remove('hidden');
    btnText.classList.add('hidden');
    
    editorPanel.classList.add('hidden');
    resultPanel.classList.add('hidden');
    skippedSection.classList.add('hidden');

    try {
        const response = await fetch('/parse', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (response.ok) {
            showEditor(data);
        } else {
            resultPanel.classList.remove('hidden');
            showError(data);
        }

    } catch (err) {
        resultPanel.classList.remove('hidden');
        showError({ error: 'Network Error: ' + err.message, failures: [] });
    } finally {
        convertBtn.disabled = false;
        loader.classList.add('hidden');
        btnText.classList.remove('hidden');
    }
});

// STEP 2: Show Editor
function showEditor(data) {
    editorPanel.classList.remove('hidden');
    outputFilenameInput.value = data.filename || "my_deck";
    
    // Stats
    const total = data.stats ? data.stats.total : 0;
    const parsed = data.cards.length;
    const failed = data.failures.length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statParsed').textContent = parsed;
    document.getElementById('statSkipped').textContent = failed;
    
    currentFailures = data.failures || [];
    
    renderSkippedList(currentFailures);
    
    // Populate Table
    cardsTableBody.innerHTML = '';
    data.cards.forEach(card => addRow(card.question, card.answer));
}

function renderSkippedList(failures) {
    skippedList.innerHTML = '';
    if (failures && failures.length > 0) {
        failures.forEach(line => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'skipped-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.rawLine = line;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'skipped-item-content';
            
            if (line.startsWith('[')) {
                const parts = line.split(']');
                if (parts.length > 1) {
                    const tag = parts[0] + ']';
                    const content = parts.slice(1).join(']').trim();
                    contentDiv.innerHTML = `<span class="skip-tag">${escapeHtml(tag)}</span><span class="skip-content">${escapeHtml(content)}</span>`;
                } else {
                    contentDiv.textContent = line;
                }
            } else {
                contentDiv.textContent = line;
            }
            
            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(contentDiv);
            skippedList.appendChild(itemDiv);
        });
    } else {
        const div = document.createElement('div');
        div.className = 'skipped-item';
        div.style.textAlign = 'center';
        div.style.color = '#94a3b8';
        div.textContent = "✅ No lines skipped.";
        skippedList.appendChild(div);
    }
}

function updateStats(parsedChange, skippedChange) {
    const parsedSpan = document.getElementById('statParsed');
    const skippedSpan = document.getElementById('statSkipped');
    
    let currentParsed = parseInt(parsedSpan.textContent) || 0;
    let currentSkipped = parseInt(skippedSpan.textContent) || 0;
    
    parsedSpan.textContent = Math.max(0, currentParsed + parsedChange);
    skippedSpan.textContent = Math.max(0, currentSkipped + skippedChange);
}

function moveToSkipped(btn) {
    const row = btn.closest('tr');
    const term = row.querySelector('.input-term').value.trim();
    const def = row.querySelector('.input-def').value.trim();
    
    let lineToRestore = term;
    if(def) {
        lineToRestore += " - " + def;
    }
    
    // Add to failures
    currentFailures.unshift(lineToRestore); // Add to top
    
    // Update Stats
    updateStats(-1, 1);
    
    // Re-render Skipped List
    renderSkippedList(currentFailures);
    
    // Remove Row
    row.remove();
}

function addRow(term = '', definition = '') {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="input-term" value="${escapeHtml(term)}"></td>
        <td><input type="text" class="input-def" value="${escapeHtml(definition)}"></td>
        <td><button class="delete-btn" onclick="moveToSkipped(this)">×</button></td>
    `;
    cardsTableBody.appendChild(row);
}
addCardBtn.addEventListener('click', () => addRow());

// STEP 3: Generate
generateBtn.addEventListener('click', async () => {
    const rows = cardsTableBody.querySelectorAll('tr');
    const cards = [];
    rows.forEach(row => {
        const term = row.querySelector('.input-term').value.trim();
        const def = row.querySelector('.input-def').value.trim();
        if (term && def) cards.push({ question: term, answer: def });
    });

    if (cards.length === 0) {
        alert("Please add at least one card.");
        return;
    }

    generateBtn.disabled = true;
    const btnSpan = generateBtn.querySelector('span');
    btnSpan.classList.add('hidden');
    genLoader.classList.remove('hidden');

    const deckName = document.getElementById('deckName').value;
    const filename = outputFilenameInput.value;

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cards, deck_name: deckName, filename })
        });
        const data = await response.json();
        
        resultPanel.classList.remove('hidden');
        editorPanel.classList.add('hidden');
        
        if (response.ok) {
            showSuccess(data, cards.length);
        } else {
            showError(data);
        }
    } catch (err) {
        showError({ error: 'Generation failed.' });
    } finally {
        generateBtn.disabled = false;
        btnSpan.classList.remove('hidden');
        genLoader.classList.add('hidden');
    }
});

function showSuccess(data, count) {
    successView.classList.remove('hidden');
    errorView.classList.add('hidden');
    document.getElementById('statsText').textContent = `Successfully created ${count} cards.`;
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = data.download_url;
    downloadLink.textContent = `Download .apkg`;
}

function showError(data) {
    successView.classList.add('hidden');
    errorView.classList.remove('hidden');
    document.getElementById('errorDescription').textContent = data.error || "Unknown Error";
    const list = document.getElementById('failedLinesList');
    list.innerHTML = '';
    if (data.failures && data.failures.length > 0) {
        data.failures.forEach(line => {
            const li = document.createElement('li');
            li.textContent = line;
            list.appendChild(li);
        });
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
