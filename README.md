# 前端日志 SDK

一个用于客户端日志记录、错误跟踪、性能监控和行为分析的综合性 SDK。

## 特性

- **错误跟踪**: 自动捕获 JavaScript 错误、资源加载错误和未处理的 Promise Rejection。
- **性能监控**: 收集核心 Web 指标 (LCP, FID, CLS)、FCP 和导航计时数据。
- **行为跟踪**: 记录用户交互，如点击和页面/路由更改。
- **自定义日志**: 灵活的 API，用于发送不同严重级别的自定义日志消息。
- **用户行为路径(面包屑)**: 自动记录用户操作（点击、导航、控制台日志），为错误提供上下文。
- **批量与重试**: 高效地批量发送数据，并为上传失败提供重试机制。
- **可配置**: 高度可配置，提供采样、数据过滤和功能切换选项。
- **轻量级**: 设计目标是高性能，并对宿主应用程序的影响降到最低。

## 安装

```bash
npm install frontend-logger-sdk # 替换为您的实际包名
# 或者
yarn add frontend-logger-sdk
```

## 快速开始

```javascript
import { init, error, log, track, setUser } from "frontend-logger-sdk"; // 根据您的设置/包名调整路径

// 初始化 SDK
init({
  reportUrl: "https://your-logging-endpoint.com/api/logs", // 日志上报接口地址
  appId: "YOUR_APP_ID", // 您的应用唯一标识
  debug: true, // 在控制台启用 SDK 调试消息 (可选)
  sampleRate: 1.0, // 记录 100% 的事件 (可选)
  autoTrack: {
    jsError: true,
    resourceError: true,
    promiseRejection: true,
    performance: true,
    webVitals: true,
    navigationTiming: true,
    deviceInfo: true,
  },
  behavior: {
    clicks: true, // 或者 { selectors: ['button[data-track]'], ignoreClasses: ['no-track'] }
    navigation: true,
  },
  maxBreadcrumbs: 30,
  beforeSend: (logEntry) => {
    // 修改 logEntry 或返回 false 以阻止发送
    if (
      logEntry.type === "error" &&
      logEntry.data.message?.includes("ignore this error")
    ) {
      return false;
    }
    // 示例：添加自定义元数据
    // logEntry.customData = { tenantId: '123' };
    return logEntry;
  },
});

// 使用示例

// 设置用户信息 (可选)
setUser("user-12345", { email: "user@example.com", name: "John Doe" });

// 自定义日志消息
log("用户执行了一个操作", { buttonId: "submit-form" }, "info");

// 上报一个捕获的错误
try {
  //某些危险操作
  throw new Error("出错了!");
} catch (e) {
  error(e, { context: "form-submission" });
}

// 追踪一个自定义事件
track("videoPlayed", { videoId: "xyz", duration: 120 });
```

## 配置

`init` 方法接受一个配置对象。以下是一些关键选项：

- `reportUrl` (string, 必需): 日志将发送到的 URL 端点。
- `appId` (string, 必需): 您应用程序的唯一标识符。
- `userId` (string, 可选): 当前用户的标识符。
- `sdkVersion` (string, 可选): 覆盖默认的 SDK 版本。
- `sampleRate` (number, 可选): 一个介于 0 和 1 之间的值，用于控制记录事件的百分比 (例如, 0.5 代表 50%)。默认: `1.0`。
- `debug` (boolean, 可选): 设置为 `true` 以在控制台中启用来自 SDK 本身的详细日志记录。默认: `false`。
- `autoTrack` (object, 可选): 对自动跟踪功能的细粒度控制。
  - `jsError` (boolean): 捕获全局 JavaScript 错误。默认: `true`。
  - `resourceError` (boolean): 捕获资源加载错误。默认: `true`。
  - `promiseRejection` (boolean): 捕获未处理的 Promise Rejection。默认: `true`。
  - `performance` (boolean): 所有性能跟踪的主开关。默认: `true`。
  - `webVitals` (boolean): 捕获核心 Web 指标 (LCP, FID, CLS, FCP)。默认: `true`。
  - `navigationTiming` (boolean): 捕获导航计时数据。默认: `true`。
  - `deviceInfo` (boolean): 初始化时发送包含设备信息的日志。默认: `true`。
- `behavior` (object, 可选): 控制自动行为跟踪。
  - `clicks` (boolean | object): 跟踪元素点击。可以是 `true` 或一个对象 `{ selectors?: string[], ignoreClasses?: string[] }`。默认: `true`。
  - `navigation` (boolean): 跟踪页面浏览和路由更改 (适用于 SPA)。默认: `true`。
- `maxBreadcrumbs` (number, 可选): 存储的最大面包屑数量。默认: `20`。
- `batchSize` (number, 可选): 发送前批量处理的日志数量。默认: `10`。
- `batchInterval` (number, 可选): 发送批处理前等待的最长时间 (毫秒)。默认: `5000`。
- `beforeSend` (function, 可选): 一个回调函数 `(logEntry) => logEntry | false | Promise<logEntry | false>`，在每条日志发送前调用。允许修改或过滤日志。返回 `false` 以阻止发送日志。可以是异步的。
- `sessionTimeout` (number, 可选): 会话被视作超时的非活动时长（毫秒）。默认: `30 * 60 * 1000` (30 分钟)。
- `sendDeviceInfoWithLogs` (boolean, 可选): 如果为 true，则在每条日志中附加部分设备信息。默认: `false`。

## API

- `init(config: SdkConfig): void`
  使用给定配置初始化 SDK。

- `log(message: string, data?: any, level?: LogLevel = 'info', type?: LogType = 'custom', category?: string): void`
  发送自定义日志消息。
  `level` 可以是 `'info'`, `'warn'`, `'error'`, `'debug'`。

- `info(message: string, data?: any): void`
  `log(message, data, 'info')` 的快捷方式。

- `warn(message: string, data?: any): void`
  `log(message, data, 'warn')` 的快捷方式。

- `error(errorObj: Error | string, extraData?: Record<string, any>): void`
  报告错误。`errorObj` 可以是 Error 对象或字符串。

- `track(eventName: string, data?: Record<string, any>): void`
  跟踪自定义用户行为事件。

- `setUser(id?: string, details?: Record<string, any>): void`
  设置或更新当前用户的信息。

- `clearUser(): void`
  清除当前用户的信息。

- `addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void`
  手动添加面包屑。

- `getBreadcrumbs(): ReadonlyArray<Breadcrumb>`
  检索当前的面包屑列表。

- `clearBreadcrumbs(): void`
  清除所有存储的面包屑。

- `forceFlush(): void`
  手动触发发送任何排队的日志。

## 日志结构 (示例)

发送到后端的日志通常遵循以下结构 (实际字段可能因日志类型而异):

```json
{
  "timestamp": 1678886400000,
  "sdkVersion": "__SDK_VERSION__",
  "appId": "YOUR_APP_ID",
  "userId": "user-12345",
  "sessionId": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  "pageUrl": "https://example.com/some-page",
  "level": "error",
  "type": "error",
  "category": "js", // 例如: 'js', 'resource', 'promise', 'manual', 'web-vitals', 'click'
  "data": {
    // 特定类型的数据
    "message": "Uncaught TypeError: Cannot read property 'foo' of undefined",
    "source": "https://example.com/static/js/main.chunk.js",
    "lineno": 123,
    "colno": 45,
    "stack": "TypeError: Cannot read property...\n    at foo (https://example.com/...)"
  },
  "deviceInfo": { // 可选，如果 sendDeviceInfoWithLogs 为 true 或用于专用的 device_info 日志
    "userAgent": "Mozilla/5.0 (...)",
    "platform": "MacIntel",
    "language": "en-US",
    "screenWidth": 1920,
    "screenHeight": 1080,
    "network": "4g"
  },
  "breadcrumbs": [
    { "type": "navigation", "message": "Navigated to /some-page", "timestamp": ... },
    { "type": "click", "message": "Clicked on button#submit", "timestamp": ... }
  ]
}
```

## 开发

- 克隆仓库。
- 安装依赖: `npm install`
- 构建 SDK: `npm run build`
- 运行测试: `npm run test`
- Lint 代码: `npm run lint`

## 贡献

欢迎贡献！请提出 issue 或提交 pull request。

## 许可证

MIT
