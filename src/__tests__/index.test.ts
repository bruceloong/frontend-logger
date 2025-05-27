import { init, log, error, track, setUser, LogLevel } from "../index";

describe("Frontend Logger SDK", () => {
  beforeEach(() => {
    // 清理状态
    jest.clearAllMocks();
  });

  describe("初始化", () => {
    it("应该能够正确初始化SDK", () => {
      expect(() => {
        init({
          reportUrl: "https://test.example.com/logs",
          appId: "test-app",
          debug: true,
        });
      }).not.toThrow();
    });
  });

  describe("日志记录", () => {
    beforeEach(() => {
      init({
        reportUrl: "https://test.example.com/logs",
        appId: "test-app",
        debug: false,
      });
    });

    it("应该能够记录信息日志", () => {
      expect(() => {
        log("测试信息日志", { key: "value" }, LogLevel.INFO);
      }).not.toThrow();
    });

    it("应该能够记录错误", () => {
      expect(() => {
        error(new Error("测试错误"), { context: "test" });
      }).not.toThrow();
    });

    it("应该能够跟踪事件", () => {
      expect(() => {
        track("button_click", { buttonId: "submit" });
      }).not.toThrow();
    });

    it("应该能够设置用户信息", () => {
      expect(() => {
        setUser("user123", { name: "Test User", email: "test@example.com" });
      }).not.toThrow();
    });
  });
});
