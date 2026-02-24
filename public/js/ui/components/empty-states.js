/**
 * Beautiful empty state components with helpful actions
 */

export function createEmptyState(config) {
  const {
    icon = "📭",
    title = "Bo'sh",
    description = "",
    actions = [],
    illustration = null,
  } = config;

  const container = document.createElement("div");
  container.className = "empty-state";
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4rem 2rem;
    min-height: 400px;
  `;

  // Illustration or icon
  if (illustration) {
    const img = document.createElement("div");
    img.style.cssText = `
      width: 200px;
      height: 200px;
      margin-bottom: 2rem;
      opacity: 0.6;
      animation: float 3s ease-in-out infinite;
    `;
    img.innerHTML = illustration;
    container.appendChild(img);
  } else {
    const iconEl = document.createElement("div");
    iconEl.textContent = icon;
    iconEl.style.cssText = `
      font-size: 5rem;
      margin-bottom: 1.5rem;
      opacity: 0.5;
      animation: float 3s ease-in-out infinite;
    `;
    container.appendChild(iconEl);
  }

  // Title
  const titleEl = document.createElement("h2");
  titleEl.textContent = title;
  titleEl.style.cssText = `
    margin: 0 0 0.75rem 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
  `;
  container.appendChild(titleEl);

  // Description
  if (description) {
    const descEl = document.createElement("p");
    descEl.textContent = description;
    descEl.style.cssText = `
      margin: 0 0 2rem 0;
      font-size: 1rem;
      color: var(--text-secondary);
      max-width: 500px;
      line-height: 1.6;
    `;
    container.appendChild(descEl);
  }

  // Actions
  if (actions.length > 0) {
    const actionsContainer = document.createElement("div");
    actionsContainer.style.cssText = `
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    `;

    actions.forEach((action) => {
      const button = document.createElement("button");
      button.textContent = action.label;
      button.style.cssText = `
        padding: 0.875rem 1.75rem;
        background: ${action.primary ? "var(--accent)" : "var(--bg-tertiary)"};
        color: ${action.primary ? "white" : "var(--text-primary)"};
        border: none;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: ${action.primary ? "0 2px 8px rgba(232, 163, 23, 0.3)" : "none"};
      `;
      button.onmouseover = () => {
        button.style.transform = "translateY(-2px)";
        button.style.boxShadow = action.primary
          ? "0 4px 12px rgba(232, 163, 23, 0.4)"
          : "0 2px 8px rgba(0, 0, 0, 0.1)";
      };
      button.onmouseout = () => {
        button.style.transform = "translateY(0)";
        button.style.boxShadow = action.primary ? "0 2px 8px rgba(232, 163, 23, 0.3)" : "none";
      };
      button.onclick = action.onClick;
      actionsContainer.appendChild(button);
    });

    container.appendChild(actionsContainer);
  }

  // Add animation
  if (!document.getElementById("empty-state-animations")) {
    const style = document.createElement("style");
    style.id = "empty-state-animations";
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .empty-state {
        animation: fadeInUp 0.5s ease-out;
      }
    `;
    document.head.appendChild(style);
  }

  return container;
}

// Predefined empty states
export const EmptyStates = {
  noDeck: (onCreateDeck) =>
    createEmptyState({
      icon: "📚",
      title: "Birinchi deckingizni yarating",
      description: "Flashcard o'rganishni boshlash uchun deck yarating. Har bir deck alohida mavzu yoki kurs bo'lishi mumkin.",
      actions: [
        {
          label: "➕ Deck yaratish",
          primary: true,
          onClick: onCreateDeck,
        },
      ],
    }),

  noCards: (onAddCard, onImport) =>
    createEmptyState({
      icon: "🎴",
      title: "Bu deckda cardlar yo'q",
      description: "Flashcardlarni bitta-bitta qo'shing yoki fayldan import qiling.",
      actions: [
        {
          label: "➕ Card qo'shish",
          primary: true,
          onClick: onAddCard,
        },
        {
          label: "📤 Import qilish",
          primary: false,
          onClick: onImport,
        },
      ],
    }),

  noDueCards: () =>
    createEmptyState({
      icon: "🎉",
      title: "Barcha cardlar o'rganildi!",
      description: "Ajoyib! Hozirda takrorlanadigan cardlar yo'q. Ertaga qaytib keling yoki yangi cardlar qo'shing.",
      actions: [],
    }),

  noSearchResults: (query, onClear) =>
    createEmptyState({
      icon: "🔍",
      title: "Hech narsa topilmadi",
      description: `"${query}" so'rovi bo'yicha natija yo'q. Boshqa kalit so'z bilan qidiring.`,
      actions: [
        {
          label: "Qidiruvni tozalash",
          primary: true,
          onClick: onClear,
        },
      ],
    }),

  trashEmpty: () =>
    createEmptyState({
      icon: "🗑️",
      title: "Trash bo'sh",
      description: "O'chirilgan decklar bu yerda ko'rinadi.",
      actions: [],
    }),

  offlineNoData: () =>
    createEmptyState({
      icon: "📡",
      title: "Offline rejim",
      description: "Internet yo'q va lokal keshda ma'lumot yo'q. Internetga ulanib, sync qiling.",
      actions: [],
    }),

  syncError: (onRetry) =>
    createEmptyState({
      icon: "⚠️",
      title: "Sync xatosi",
      description: "Ma'lumotlarni yuklashda xatolik yuz berdi. Internetni tekshiring va qaytadan urinib ko'ring.",
      actions: [
        {
          label: "🔄 Qayta urinish",
          primary: true,
          onClick: onRetry,
        },
      ],
    }),

  firstStudy: (onStart) =>
    createEmptyState({
      icon: "🚀",
      title: "O'qishni boshlang!",
      description: "Spaced Repetition algoritmi yordamida samarali o'rganing. Har kuni bir oz vaqt ajrating!",
      actions: [
        {
          label: "📖 Boshlash",
          primary: true,
          onClick: onStart,
        },
      ],
    }),
};
