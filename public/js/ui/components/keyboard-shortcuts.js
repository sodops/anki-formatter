/**
 * Keyboard shortcuts panel
 * Shows all available keyboard shortcuts with search
 */

export function createKeyboardShortcutsModal() {
  const shortcuts = [
    {
      category: "⚡ Asosiy",
      items: [
        { keys: ["Ctrl", "K"], description: "Buyruqlar palitrasini ochish" },
        { keys: ["Ctrl", "/"], description: "Klaviatura tugmalari spravkasi" },
        { keys: ["Ctrl", "S"], description: "Saqlash (Sync)" },
        { keys: ["Esc"], description: "Modal yopish / Bekor qilish" },
      ],
    },
    {
      category: "📚 Deck boshqaruvi",
      items: [
        { keys: ["Ctrl", "N"], description: "Yangi deck yaratish" },
        { keys: ["↑", "↓"], description: "Decklar orasida harakatlanish" },
        { keys: ["Enter"], description: "Deckni tanlash" },
        { keys: ["Ctrl", "D"], description: "Deckni o'chirish" },
      ],
    },
    {
      category: "🎴 Card boshqaruvi",
      items: [
        { keys: ["Ctrl", "Enter"], description: "Yangi card qo'shish" },
        { keys: ["Ctrl", "E"], description: "Cardni tahrirlash" },
        { keys: ["Delete"], description: "Cardni o'chirish" },
        { keys: ["Ctrl", "F"], description: "Qidirish va almashtirish" },
        { keys: ["Ctrl", "A"], description: "Barchasini tanlash" },
      ],
    },
    {
      category: "📖 O'qish (Study Mode)",
      items: [
        { keys: ["Space"], description: "Javobni ko'rsatish" },
        { keys: ["1"], description: "Again (Yana)" },
        { keys: ["2"], description: "Hard (Qiyin)" },
        { keys: ["3"], description: "Good (Yaxshi)" },
        { keys: ["4"], description: "Easy (Oson)" },
        { keys: ["R"], description: "TTS (Ovozli o'qish)" },
        { keys: ["E"], description: "Cardni tahrirlash" },
      ],
    },
    {
      category: "🎨 Ko'rinish",
      items: [
        { keys: ["Ctrl", "B"], description: "Sidebar toggle" },
        { keys: ["Ctrl", "T"], description: "Theme o'zgartirish" },
        { keys: ["Ctrl", "1"], description: "Library view" },
        { keys: ["Ctrl", "2"], description: "Study view" },
        { keys: ["Ctrl", "3"], description: "Stats view" },
      ],
    },
    {
      category: "🔧 Import/Export",
      items: [
        { keys: ["Ctrl", "O"], description: "Fayl import qilish" },
        { keys: ["Ctrl", "Shift", "E"], description: "Export to Anki" },
        { keys: ["Ctrl", "Shift", "S"], description: "Backup yaratish" },
      ],
    },
  ];

  const modal = document.createElement("div");
  modal.id = "keyboard-shortcuts-modal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
    animation: fadeIn 0.2s ease-out;
  `;

  const content = document.createElement("div");
  content.style.cssText = `
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 16px;
    max-width: 800px;
    width: 100%;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;

  const title = document.createElement("div");
  title.innerHTML = `
    <h2 style="margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">
      ⌨️ Klaviatura Tugmalari
    </h2>
    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: var(--text-secondary);">
      Tez ishlash uchun barcha shortcut'lar
    </p>
  `;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 2rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s;
  `;
  closeBtn.onmouseover = () => {
    closeBtn.style.background = "var(--bg-tertiary)";
    closeBtn.style.color = "var(--text-primary)";
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.background = "none";
    closeBtn.style.color = "var(--text-secondary)";
  };
  closeBtn.onclick = () => modal.remove();

  header.appendChild(title);
  header.appendChild(closeBtn);

  const searchContainer = document.createElement("div");
  searchContainer.style.cssText = `
    padding: 0 1.5rem 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
  `;

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Qidiruv...";
  searchInput.style.cssText = `
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s;
  `;
  searchInput.onfocus = () => (searchInput.style.borderColor = "var(--accent)");
  searchInput.onblur = () => (searchInput.style.borderColor = "var(--border)");

  searchContainer.appendChild(searchInput);

  const scrollContainer = document.createElement("div");
  scrollContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  `;

  const renderShortcuts = (filter = "") => {
    scrollContainer.innerHTML = "";
    const filterLower = filter.toLowerCase();

    shortcuts.forEach((category) => {
      const filteredItems = category.items.filter(
        (item) =>
          item.description.toLowerCase().includes(filterLower) ||
          item.keys.some((key) => key.toLowerCase().includes(filterLower))
      );

      if (filteredItems.length === 0) return;

      const categorySection = document.createElement("div");
      categorySection.style.marginBottom = "2rem";

      const categoryTitle = document.createElement("h3");
      categoryTitle.textContent = category.category;
      categoryTitle.style.cssText = `
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 1rem 0;
      `;
      categorySection.appendChild(categoryTitle);

      filteredItems.forEach((item) => {
        const row = document.createElement("div");
        row.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          transition: background 0.2s;
        `;
        row.onmouseover = () => (row.style.background = "var(--bg-tertiary)");
        row.onmouseout = () => (row.style.background = "transparent");

        const description = document.createElement("span");
        description.textContent = item.description;
        description.style.cssText = `
          color: var(--text-primary);
          font-size: 0.9rem;
        `;

        const keysContainer = document.createElement("div");
        keysContainer.style.cssText = `
          display: flex;
          gap: 0.5rem;
        `;

        item.keys.forEach((key) => {
          const keyBadge = document.createElement("kbd");
          keyBadge.textContent = key;
          keyBadge.style.cssText = `
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-primary);
            font-family: monospace;
            box-shadow: 0 2px 0 var(--border);
          `;
          keysContainer.appendChild(keyBadge);
        });

        row.appendChild(description);
        row.appendChild(keysContainer);
        categorySection.appendChild(row);
      });

      scrollContainer.appendChild(categorySection);
    });

    if (scrollContainer.children.length === 0) {
      const noResults = document.createElement("div");
      noResults.textContent = "Hech narsa topilmadi";
      noResults.style.cssText = `
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
        font-size: 0.95rem;
      `;
      scrollContainer.appendChild(noResults);
    }
  };

  searchInput.oninput = (e) => renderShortcuts(e.target.value);
  renderShortcuts();

  content.appendChild(header);
  content.appendChild(searchContainer);
  content.appendChild(scrollContainer);
  modal.appendChild(content);

  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // Close on Escape
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);

  // Add animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(modal);
}
