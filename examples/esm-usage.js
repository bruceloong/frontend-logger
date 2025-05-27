// ES模块使用示例
import FrontendLoggerSDK, {
  init,
  log,
  error,
  track,
  setUser,
  LogLevel,
} from "@bruceloong/frontend-logger-sdk";

// 方式1: 使用默认导出
FrontendLoggerSDK.init({
  reportUrl: "https://your-logging-endpoint.com/api/logs",
  appId: "your-app-id",
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
  beforeSend: (logEntry) => {
    // 可以在这里修改或过滤日志
    if (
      logEntry.level === LogLevel.DEBUG &&
      !window.location.hostname.includes("localhost")
    ) {
      return false; // 生产环境不发送debug日志
    }
    return logEntry;
  },
});

// 方式2: 使用命名导出
init({
  reportUrl: "https://your-logging-endpoint.com/api/logs",
  appId: "your-app-id",
  debug: process.env.NODE_ENV === "development",
});

// 设置用户信息
setUser("user-12345", {
  email: "user@example.com",
  name: "John Doe",
  plan: "premium",
});

// 记录自定义日志
log(
  "用户执行了重要操作",
  {
    action: "purchase",
    productId: "prod-123",
    amount: 99.99,
  },
  LogLevel.INFO
);

// 错误处理
try {
  // 一些可能出错的代码
  throw new Error("示例错误");
} catch (e) {
  error(e, {
    context: "payment-processing",
    userId: "user-12345",
    additionalInfo: "Credit card validation failed",
  });
}

// 跟踪用户行为
track("video_played", {
  videoId: "video-456",
  duration: 120,
  quality: "1080p",
  timestamp: Date.now(),
});

// React 组件中的使用示例
export function MyReactComponent() {
  const handleButtonClick = () => {
    track("button_click", {
      buttonId: "cta-button",
      page: "landing",
      campaign: "summer-sale",
    });
  };

  const handleError = (error) => {
    error(error, {
      component: "MyReactComponent",
      props: {
        /* 相关props */
      },
    });
  };

  return <button onClick={handleButtonClick}>点击我</button>;
}

// Vue 组件中的使用示例
export default {
  name: "MyVueComponent",
  methods: {
    handleClick() {
      track("vue_button_click", {
        component: "MyVueComponent",
        timestamp: Date.now(),
      });
    },

    async fetchData() {
      try {
        const response = await fetch("/api/data");
        const data = await response.json();

        log("数据获取成功", {
          endpoint: "/api/data",
          dataSize: JSON.stringify(data).length,
        });

        return data;
      } catch (err) {
        error(err, {
          context: "data-fetching",
          endpoint: "/api/data",
        });
        throw err;
      }
    },
  },
};
