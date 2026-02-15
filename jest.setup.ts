import "@testing-library/jest-dom";

// Polyfill for Next.js server components
if (typeof Request === 'undefined') {
  global.Request = class Request {} as any;
}

if (typeof Response === 'undefined' || !Response.json) {
  global.Response = class Response {
    body?: any;
    init?: ResponseInit;

    constructor(body?: any, init?: ResponseInit) {
      this.body = body;
      this.init = init;
    }
    
    static json(data: any, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
    
    get status() {
      return this.init?.status || 200;
    }
  } as any;
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers {} as any;
}
