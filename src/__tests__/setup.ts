// 模拟浏览器 API
Object.defineProperty(window, "navigator", {
  value: {
    sendBeacon: () => true,
    userAgent: "Mozilla/5.0 (Test Environment)",
  },
  writable: true,
});

Object.defineProperty(window, "performance", {
  value: {
    now: () => Date.now(),
    getEntriesByType: () => [],
  },
  writable: true,
});

Object.defineProperty(window, "PerformanceObserver", {
  value: function () {
    return {
      observe: () => {},
      disconnect: () => {},
    };
  },
  writable: true,
});

// 模拟 localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// 模拟 sessionStorage
const sessionStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// 模拟 fetch
Object.defineProperty(window, "fetch", {
  value: () =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    }),
  writable: true,
});

// 使文件成为模块
export {};
