# 🎯 ESLint + Prettier + Jest Setup Guide

## ✅ Nima O'rnatildi

### 1. ESLint 9 - Kod Sifatini Nazorat Qilish
- ✅ TypeScript support
- ✅ React hooks validation
- ✅ Prettier integration
- ✅ Custom rules configured

### 2. Prettier - Avtomatik Formatlash
- ✅ Consistent code style
- ✅ Auto-fix on save
- ✅ 100-char line width
- ✅ Semicolons + double quotes

### 3. Jest + React Testing Library
- ✅ Unit testing framework
- ✅ Component testing
- ✅ Coverage reporting
- ✅ 21 tests passing

---

## 🚀 Ishlatish

### Kod Tekshirish
```bash
# Xatolarni ko'rish
npm run lint

# Avtomatik tuzatish
npm run lint:fix
```

### Kod Formatlash
```bash
# Barcha fayllarni formatlash
npm run format

# Formatni tekshirish
npm run format:check
```

### Testlar
```bash
# Testlarni ishga tushirish
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## 📝 Script'lar

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx --max-warnings 50",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,json,css,md}\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 🧪 Yozilgan Testlar

### 1. AuthProvider Component Test
```typescript
// __tests__/components/AuthProvider.test.tsx
✓ renders children when provided
✓ provides auth context to children
```

### 2. SM-2 Scheduler Algorithm Test
```typescript
// __tests__/lib/scheduler.test.ts
✓ New card behavior tests (2)
✓ Rating: Again tests (3)
✓ Rating: Hard tests (2)
✓ Rating: Good tests (2)
✓ Rating: Easy tests (2)
✓ Edge cases (3)
✓ Long-term learning simulation (2)
```

### 3. Supabase Client Test
```typescript
// __tests__/lib/supabase.test.ts
✓ should create a client successfully
✓ should throw error if env vars missing
✓ should be able to call auth methods
```

**Total: 21 tests passing** ✅

---

## 📊 Hozirgi Holat

```bash
# Lint: 16 warnings (0 errors)
# Tests: 21 passed
# Coverage: Setup complete
# Format: All files formatted
```

---

## 💡 Qo'shimcha Test Yozish

### Yangi test fayli yaratish:

```bash
# Component uchun
touch __tests__/components/MyComponent.test.tsx

# Utility uchun  
touch __tests__/lib/myUtil.test.ts

# API route uchun
touch __tests__/api/myRoute.test.ts
```

### Test yozish template:

```typescript
import { render, screen } from "@testing-library/react";
import MyComponent from "@/components/MyComponent";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

---

## 🔧 Konfiguratsiya Fayllari

- ✅ `eslint.config.mjs` - ESLint 9 flat config
- ✅ `.prettierrc` - Prettier settings
- ✅ `.prettierignore` - Ignored files
- ✅ `jest.config.js` - Jest configuration
- ✅ `jest.setup.ts` - Test setup

---

## 📚 To'liq Qo'llanma

Batafsil ma'lumot uchun: `TESTING.md` fayliga qarang.

---

**Commit qilishdan oldin:**
```bash
npm run lint:fix && npm run format && npm test
```
