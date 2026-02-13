# 🧪 Testing & Code Quality Guide

Bu loyihada **ESLint**, **Prettier**, va **Jest** o'rnatilgan.

## 📋 Nima bu?

### 🔍 **ESLint** - Kod Tekshiruvchi

ESLint kodingizni tekshiradi va xatolarni topadi:

- ❌ Ishlatilmagan o'zgaruvchilar
- ❌ Console.log'lar (production uchun)
- ❌ TypeScript xatolari
- ❌ React hooks xatolari

**Misol:**

```typescript
// ❌ Xato - ishlatilmagan variable
const unused = 123;

// ✅ To'g'ri
const used = 123;
console.log(used);
```

### 🎨 **Prettier** - Kod Formatlash

Prettier kodingizni avtomatik formatlaydi:

- Bir xil indentatsiya (2 space)
- Nuqtali vergullar
- Qo'shtirnoq uslubi
- Satr uzunligi (100 belgidan oshsa yangi qatorga)

**Misol:**

```typescript
// ❌ Noto'g'ri format
const obj = { name: "test", value: 123 };

// ✅ Prettier avtomatik to'g'rilaydi:
const obj = { name: "test", value: 123 };
```

### 🧪 **Jest** - Unit Testlar

Jest - bu test yozish uchun framework:

- ✅ Funksiyalar to'g'ri ishlayaptimi?
- ✅ Komponentlar render bo'ladimi?
- ✅ API to'g'ri javob qaytaradimi?

**Misol:**

```typescript
describe("Calculator", () => {
  it("should add two numbers", () => {
    expect(2 + 2).toBe(4);
  });
});
```

---

## 🚀 Qanday Ishlatish

### 1️⃣ ESLint - Kod Tekshirish

```bash
# Barcha xatolarni ko'rish
npm run lint

# Avtomatik tuzatish
npm run lint:fix
```

**Chiqish:**

```
✖ 15 problems (5 errors, 10 warnings)
  - app/page.tsx:45:7 - 'user' is assigned but never used
  - lib/utils.ts:12:3 - Unexpected console statement
```

### 2️⃣ Prettier - Kod Formatlash

```bash
# Barcha fayllarni formatlash
npm run format

# Format tekshirish (commit qilishdan oldin)
npm run format:check
```

**Qanday ishlaydi:**

1. Barcha `.ts`, `.tsx`, `.js` fayllarni topadi
2. Har birini `.prettierrc` qoidalariga moslaydi
3. Fayllarni qayta yozadi

### 3️⃣ Jest - Testlarni Ishga Tushirish

```bash
# Barcha testlarni ishga tushirish
npm test

# Watch mode (o'zgarishlarni kuzatish)
npm run test:watch

# Coverage report (qancha kod test qilingan)
npm run test:coverage
```

**Test chiqishi:**

```
PASS __tests__/lib/scheduler.test.ts
  ✓ should calculate intervals correctly (5ms)
  ✓ should handle edge cases (3ms)

Test Suites: 3 passed, 3 total
Tests:       21 passed, 21 total
```

---

## 📝 Test Yozish

### Oddiy Test

```typescript
// __tests__/utils/math.test.ts
describe("Math Utils", () => {
  it("should multiply two numbers", () => {
    const result = multiply(3, 4);
    expect(result).toBe(12);
  });
});
```

### React Component Test

```typescript
// __tests__/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import Button from '@/components/Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);

    screen.getByText('Click').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### API Test

```typescript
// __tests__/api/parse.test.ts
import { POST } from "@/app/api/parse/route";

describe("Parse API", () => {
  it("should parse text correctly", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ raw_text: "word - definition" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.cards).toHaveLength(1);
    expect(data.cards[0].question).toBe("word");
  });
});
```

---

## 🎯 Jest Matchers (Tekshirish Metodlari)

```typescript
// Qiymat tekshirish
expect(value).toBe(4); // Aniq tenglik
expect(value).toEqual({ name: "test" }); // Obyekt tenglik
expect(value).toBeGreaterThan(3); // Katta
expect(value).toBeLessThan(10); // Kichik
expect(value).toBeNull(); // null
expect(value).toBeDefined(); // undefined emas
expect(value).toBeTruthy(); // true hisoblanadi
expect(value).toBeFalsy(); // false hisoblanadi

// String tekshirish
expect(text).toMatch(/hello/); // Regex match
expect(text).toContain("world"); // Ichida bor

// Array tekshirish
expect(arr).toHaveLength(5); // Uzunlik
expect(arr).toContain("item"); // Element bor

// DOM tekshirish
expect(element).toBeInTheDocument(); // DOM'da bor
expect(element).toHaveTextContent("Hi"); // Text bor
expect(element).toBeVisible(); // Ko'rinadi
expect(element).toBeDisabled(); // Disabled

// Function tekshirish
expect(mockFn).toHaveBeenCalled(); // Chaqirilgan
expect(mockFn).toHaveBeenCalledTimes(2); // 2 marta
expect(mockFn).toHaveBeenCalledWith(arg); // Argument bilan
```

---

## 🔥 Real World Misol

### Scenario: Card yaratish funksiyasini test qilish

```typescript
// lib/cards.ts
export function createCard(term: string, def: string) {
  if (!term || !def) {
    throw new Error("Term and definition required");
  }

  return {
    id: Math.random().toString(36),
    term,
    def,
    createdAt: new Date().toISOString(),
  };
}
```

```typescript
// __tests__/lib/cards.test.ts
import { createCard } from "@/lib/cards";

describe("createCard", () => {
  it("should create a card with correct data", () => {
    const card = createCard("hello", "salom");

    expect(card).toHaveProperty("id");
    expect(card).toHaveProperty("term", "hello");
    expect(card).toHaveProperty("def", "salom");
    expect(card).toHaveProperty("createdAt");
  });

  it("should throw error if term is empty", () => {
    expect(() => createCard("", "def")).toThrow("Term and definition required");
  });

  it("should generate unique IDs", () => {
    const card1 = createCard("word1", "def1");
    const card2 = createCard("word2", "def2");

    expect(card1.id).not.toBe(card2.id);
  });
});
```

---

## 📊 Coverage Report

Coverage - qancha kod test qilingan:

```bash
npm run test:coverage
```

**Chiqish:**

```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   75.5  |   68.2   |   80.1  |   75.3  |
 lib/cards.ts         |   100   |   100    |   100   |   100   |
 lib/utils.ts         |   60.5  |   50.0   |   70.2  |   60.1  |
----------------------|---------|----------|---------|---------|
```

**Target:**

- ✅ 50%+ coverage (hozir)
- 🎯 70%+ coverage (maqsad)
- 🏆 90%+ coverage (ideal)

---

## 💡 Best Practices

### ✅ DO (Qiling)

```typescript
// ✅ Aniq test nomlari
it("should add card to deck when valid data provided", () => {});

// ✅ Bir testda bitta narsa
it("should calculate interval", () => {
  expect(getInterval()).toBe(5);
});

// ✅ Arrange-Act-Assert pattern
it("should work", () => {
  // Arrange - tayyorgarlik
  const input = { term: "test" };

  // Act - harakat
  const result = process(input);

  // Assert - tekshirish
  expect(result).toBeDefined();
});

// ✅ Mock external dependencies
jest.mock("@/lib/supabase/client");
```

### ❌ DON'T (Qilmang)

```typescript
// ❌ Noaniq nom
it("works", () => {});

// ❌ Bir testda ko'p tekshirish
it("should do everything", () => {
  expect(a).toBe(1);
  expect(b).toBe(2);
  expect(c).toBe(3);
  expect(d).toBe(4);
});

// ❌ Test ichida console.log
it("should work", () => {
  console.log("Testing..."); // ❌
});
```

---

## 🔧 CI/CD Integration

GitHub Actions yoki Vercel uchun:

```yaml
# .github/workflows/test.yml
name: Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run lint
      - run: npm run format:check
      - run: npm test
```

---

## 📚 Qo'shimcha O'qish

- [Jest Docs](https://jestjs.io/)
- [Testing Library](https://testing-library.com/react)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)

---

**Muhim:** Har commit oldidan:

```bash
npm run lint:fix && npm run format && npm test
```
