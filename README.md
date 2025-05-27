# 前端日志 SDK

一个用于客户端日志记录、错误跟踪、性能监控和行为分析的综合性 SDK。

[![npm version](https://badge.fury.io/js/%40bruceloong%2Ffrontend-logger-sdk.svg)](https://badge.fury.io/js/%40bruceloong%2Ffrontend-logger-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 特性

- **错误跟踪**: 自动捕获 JavaScript 错误、资源加载错误和未处理的 Promise Rejection。
- **性能监控**: 收集核心 Web 指标 (LCP, FID, CLS)、FCP 和导航计时数据。
- **行为跟踪**: 记录用户交互，如点击和页面/路由更改。
- **自定义日志**: 灵活的 API，用于发送不同严重级别的自定义日志消息。
- **用户行为路径(面包屑)**: 自动记录用户操作（点击、导航、控制台日志），为错误提供上下文。
- **批量与重试**: 高效地批量发送数据，并为上传失败提供重试机制。
- **可配置**: 高度可配置，提供采样、数据过滤和功能切换选项。
- **轻量级**: 设计目标是高性能，并对宿主应用程序的影响降到最低。
- **多格式支持**: 支持 ES 模块、CommonJS 和 UMD 格式。
- **TypeScript 支持**: 完整的 TypeScript 类型定义。

## 安装

```bash
# 使用 npm
npm install @bruceloong/frontend-logger-sdk

# 使用 yarn
yarn add @bruceloong/frontend-logger-sdk

# 使用 pnpm
pnpm add @bruceloong/frontend-logger-sdk
```

## 快速开始

### ES 模块 (推荐)

```javascript
import {
  init,
  error,
  log,
  track,
  setUser,
} from "@bruceloong/frontend-logger-sdk";

// 初始化 SDK
init({
  reportUrl: "https://your-logging-endpoint.com/api/logs",
  appId: "YOUR_APP_ID",
  debug: true,
  sampleRate: 1.0,
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
    clicks: true,
    navigation: true,
  },
  maxBreadcrumbs: 30,
});

// 使用示例
setUser("user-12345", { email: "user@example.com", name: "John Doe" });
log("用户执行了一个操作", { buttonId: "submit-form" }, "info");
track("videoPlayed", { videoId: "xyz", duration: 120 });
```

### CommonJS

```javascript
const { init, log, error, track } = require("@bruceloong/frontend-logger-sdk");

init({
  reportUrl: "https://your-logging-endpoint.com/api/logs",
  appId: "YOUR_APP_ID",
});
```

### UMD (浏览器直接引入)

```html
<script src="https://unpkg.com/@bruceloong/frontend-logger-sdk/dist/umd/frontend-logger-sdk.min.js"></script>
<script>
  FrontendLoggerSDK.init({
    reportUrl: "https://your-logging-endpoint.com/api/logs",
    appId: "YOUR_APP_ID",
  });

  FrontendLoggerSDK.log("页面已加载");
</script>
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

## 框架集成

### React

```jsx
import { useEffect } from "react";
import { init, track, error } from "@bruceloong/frontend-logger-sdk";

function App() {
  useEffect(() => {
    init({
      reportUrl: "https://your-endpoint.com/logs",
      appId: "react-app",
    });
  }, []);

  const handleClick = () => {
    track("button_click", { component: "App" });
  };

  return <button onClick={handleClick}>点击我</button>;
}
```

### Vue

```vue
<template>
  <button @click="handleClick">点击我</button>
</template>

<script>
import { init, track } from "@bruceloong/frontend-logger-sdk";

export default {
  mounted() {
    init({
      reportUrl: "https://your-endpoint.com/logs",
      appId: "vue-app",
    });
  },
  methods: {
    handleClick() {
      track("button_click", { component: "VueComponent" });
    },
  },
};
</script>
```

### Angular

```typescript
import { Component, OnInit } from "@angular/core";
import { init, track } from "@bruceloong/frontend-logger-sdk";

@Component({
  selector: "app-root",
  template: '<button (click)="handleClick()">点击我</button>',
})
export class AppComponent implements OnInit {
  ngOnInit() {
    init({
      reportUrl: "https://your-endpoint.com/logs",
      appId: "angular-app",
    });
  }

  handleClick() {
    track("button_click", { component: "AppComponent" });
  }
}
```

## 日志结构 (示例)

发送到后端的日志通常遵循以下结构 (实际字段可能因日志类型而异):

```json
{
  "timestamp": 1678886400000,
  "sdkVersion": "1.0.0",
  "appId": "YOUR_APP_ID",
  "userId": "user-12345",
  "sessionId": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  "pageUrl": "https://example.com/some-page",
  "level": "error",
  "type": "error",
  "category": "js",
  "data": {
    "message": "Uncaught TypeError: Cannot read property 'foo' of undefined",
    "source": "https://example.com/static/js/main.chunk.js",
    "lineno": 123,
    "colno": 45,
    "stack": "TypeError: Cannot read property...\n    at foo (https://example.com/...)"
  },
  "deviceInfo": {
    "userAgent": "Mozilla/5.0 (...)",
    "platform": "MacIntel",
    "language": "en-US",
    "screenWidth": 1920,
    "screenHeight": 1080,
    "network": "4g"
  },
  "breadcrumbs": [
    {
      "type": "navigation",
      "message": "Navigated to /some-page",
      "timestamp": 1678886300000
    },
    {
      "type": "click",
      "message": "Clicked on button#submit",
      "timestamp": 1678886350000
    }
  ]
}
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/bruceloong/frontend-logger-sdk.git
cd frontend-logger-sdk

# 安装依赖
npm install

# 构建 SDK
npm run build

# 运行测试
npm test

# 运行测试覆盖率
npm run test:coverage

# Lint 代码
npm run lint

# 修复 lint 问题
npm run lint:fix
```

## 构建产物

构建后会生成以下文件：

```
dist/
├── cjs/           # CommonJS 格式
│   ├── index.js
│   └── index.js.map
├── esm/           # ES 模块格式
│   ├── index.js
│   └── index.js.map
├── umd/           # UMD 格式 (浏览器)
│   ├── frontend-logger-sdk.min.js
│   └── frontend-logger-sdk.min.js.map
└── types/         # TypeScript 类型定义
    └── index.d.ts
```

## 发布

```bash
# 运行发布脚本
chmod +x scripts/publish.sh
./scripts/publish.sh

# 或手动发布
npm run build
npm test
npm publish
```

## 浏览器支持

- Chrome >= 60
- Firefox >= 55
- Safari >= 12
- Edge >= 79

## 贡献

欢迎贡献！请提出 issue 或提交 pull request。

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

MIT

## 更新日志

### v1.0.0

- 初始发布
- 支持错误跟踪、性能监控、行为分析
- 多格式构建支持 (ESM, CJS, UMD)
- 完整的 TypeScript 支持
