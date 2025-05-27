import {
  SdkConfig,
  LogLevel,
  LogType,
  CustomLog,
  ErrorLog,
  BehaviorLog,
  UserInfo,
  DeviceInfoLog,
} from "./types";
import { mergeConfig, DEFAULT_SDK_VERSION } from "./config";
import {
  setSDKConfig,
  getSDKConfig,
  setCurrentSessionId,
  setCurrentUser,
  getCurrentUser,
  isSDKInitialized,
  getConfigValue,
} from "./state";
import { initErrorCollection } from "./core/errorHandler";
import { initPerformanceCollection } from "./core/performanceCollector";
import { initBehaviorTracking } from "./core/behaviorTracker";
import {
  reportLog as internalReportLog,
  flushQueue,
  attemptRetransmissionOfStoredLogs,
} from "./core/reporter";
import {
  instrumentConsole,
  addBreadcrumb as internalAddBreadcrumb,
  getBreadcrumbs as internalGetBreadcrumbs,
  clearBreadcrumbs as internalClearBreadcrumbs,
} from "./core/breadcrumbs";
import { BreadcrumbType } from "./types";
import {
  getCommonLogData as internalGetCommonLogData,
  getDeviceInfo,
  getOrCreateSessionId,
  updateSessionLastActivity,
  trySafe,
} from "./lib/utils";

// --- SDK Lifecycle & State Management ---

const _init = (userConfig: Partial<SdkConfig>): void => {
  if (isSDKInitialized()) {
    console.warn("[SDK] 已初始化。忽略对 init() 的调用。");
    return;
  }
  try {
    const baseConfig = {
      ...userConfig,
      sdkVersion: userConfig.sdkVersion || DEFAULT_SDK_VERSION,
    };
    const finalConfig = mergeConfig(baseConfig);
    setSDKConfig(finalConfig);

    const newSessionId = getOrCreateSessionId(
      getConfigValue("sessionTimeout")!
    );
    setCurrentSessionId(newSessionId);

    document.addEventListener(
      "visibilitychange",
      trySafe(updateSessionLastActivity),
      true
    );
    window.addEventListener("focus", trySafe(updateSessionLastActivity), true);

    if (getConfigValue("debug")) {
      console.log(
        `[SDK] 前端日志记录器 v${getConfigValue(
          "sdkVersion"
        )} 正在为 appId: ${getConfigValue("appId")} 进行初始化`
      );
      console.log("[SDK] 配置:", getSDKConfig());
    }

    if (getConfigValue("maxBreadcrumbs", 0)! > 0) {
      instrumentConsole();
    }
    if (
      getConfigValue("autoTrack")?.jsError ||
      getConfigValue("autoTrack")?.resourceError ||
      getConfigValue("autoTrack")?.promiseRejection
    ) {
      initErrorCollection();
    }
    if (getConfigValue("autoTrack")?.performance) {
      initPerformanceCollection();
    }
    if (
      getConfigValue("behavior")?.clicks ||
      getConfigValue("behavior")?.navigation
    ) {
      initBehaviorTracking();
    }

    if (getConfigValue("autoTrack")?.deviceInfo) {
      const deviceInfoData = getDeviceInfo();
      const currentConfig = getSDKConfig();
      if (currentConfig) {
        const logEntry: DeviceInfoLog = {
          ...internalGetCommonLogData(),
          timestamp: Date.now(),
          sdkVersion: currentConfig.sdkVersion,
          appId: currentConfig.appId,
          level: LogLevel.INFO,
          type: LogType.DEVICE_INFO,
          data: deviceInfoData,
        };
        internalReportLog(logEntry);
      }
    }

    attemptRetransmissionOfStoredLogs();

    console.log(
      `[SDK] 前端日志记录器 v${getConfigValue(
        "sdkVersion"
      )} 已为 appId: ${getConfigValue("appId")} 初始化。`
    );
  } catch (error) {
    console.error("[SDK] 初始化失败:", error);
  }
};
export const init = trySafe(_init);

// --- Public API Methods ---

const _log = (
  message: string,
  data?: any,
  level: LogLevel = LogLevel.INFO,
  category?: string
): void => {
  if (!isSDKInitialized()) {
    return console.warn("[SDK] 未初始化。请先调用 init()。日志已丢弃:", {
      message,
      data,
    });
  }
  updateSessionLastActivity();

  const currentConfig = getSDKConfig();
  if (!currentConfig) return;

  internalAddBreadcrumb({
    type: BreadcrumbType.CUSTOM,
    message: `日志: ${message.substring(0, 50)}`,
    data: { level, custom_data: data },
  });

  const logEntry: CustomLog = {
    ...internalGetCommonLogData(),
    timestamp: Date.now(),
    sdkVersion: currentConfig.sdkVersion,
    appId: currentConfig.appId,
    level,
    type: LogType.CUSTOM,
    category: category || "custom",
    data: {
      message,
      ...(typeof data === "object" && data !== null ? data : { value: data }),
    },
  };
  internalReportLog(logEntry);
};
export const log = trySafe(_log);

export const info = trySafe((message: string, data?: any): void => {
  log(message, data, LogLevel.INFO);
});

export const warn = trySafe((message: string, data?: any): void => {
  log(message, data, LogLevel.WARN);
});

const _error = (
  errorObj: Error | string,
  extraData?: Record<string, any>
): void => {
  if (!isSDKInitialized()) {
    return console.warn("[SDK] 未初始化。请先调用 init()。错误已丢弃:", {
      errorObj,
      extraData,
    });
  }
  updateSessionLastActivity();

  const currentConfig = getSDKConfig();
  if (!currentConfig) return;

  let err = errorObj instanceof Error ? errorObj : new Error(String(errorObj));

  internalAddBreadcrumb({
    type: BreadcrumbType.ERROR,
    message: `错误: ${err.message.substring(0, 100)}`,
    data: { stack: err.stack?.substring(0, 200), ...extraData },
  });

  const errorData = {
    message: err.message,
    stack: err.stack,
    ...(extraData || {}),
  };

  const logEntry: ErrorLog = {
    ...internalGetCommonLogData(),
    timestamp: Date.now(),
    sdkVersion: currentConfig.sdkVersion,
    appId: currentConfig.appId,
    level: LogLevel.ERROR,
    type: LogType.ERROR,
    category: "manual",
    data: errorData,
  };
  internalReportLog(logEntry);
};
export const error = trySafe(_error);

const _track = (eventName: string, data?: Record<string, any>): void => {
  if (!isSDKInitialized()) {
    return console.warn("[SDK] 未初始化。请先调用 init()。追踪事件已丢弃:", {
      eventName,
      data,
    });
  }
  updateSessionLastActivity();

  const currentConfig = getSDKConfig();
  if (!currentConfig) return;

  internalAddBreadcrumb({
    type: BreadcrumbType.CUSTOM,
    message: `追踪: ${eventName.substring(0, 50)}`,
    data: data,
  });

  const behaviorData: BehaviorLog["data"] = {
    subType: "custom_event",
    eventName,
    ...(data || {}),
  };

  const logEntry: BehaviorLog = {
    ...internalGetCommonLogData(),
    timestamp: Date.now(),
    sdkVersion: currentConfig.sdkVersion,
    appId: currentConfig.appId,
    level: LogLevel.INFO,
    type: LogType.BEHAVIOR,
    category: "custom_event",
    data: behaviorData,
  };
  internalReportLog(logEntry);
};
export const track = trySafe(_track);

// --- User Management ---
const _setUser = (id?: string, details?: Record<string, any>): void => {
  if (!isSDKInitialized()) {
    console.warn(
      "[SDK] SDK尚未初始化，用户信息将暂存并在init时应用（如果适用）。"
    );
  }
  const newUser: UserInfo = { ...details, id: id };
  setCurrentUser(newUser);

  if (isSDKInitialized() && getConfigValue("debug")) {
    console.log("[SDK] 用户信息已更新:", getCurrentUser());
  }
};
export const setUser = trySafe(_setUser);

export const clearUser = trySafe((): void => {
  if (!isSDKInitialized()) return;
  setCurrentUser(null);
  if (getConfigValue("debug")) console.log("[SDK] User context cleared.");
});

// --- Manual Controls ---
export const forceFlush = trySafe((): void => {
  if (!isSDKInitialized())
    return console.warn(
      "[SDK] Not initialized. Call init() first. Flush ignored."
    );
  flushQueue();
});

// --- Breadcrumbs Public API (wrapped for safety) ---
export const addBreadcrumb = trySafe(internalAddBreadcrumb);
export const getBreadcrumbs = trySafe(internalGetBreadcrumbs);
export const clearBreadcrumbs = trySafe(internalClearBreadcrumbs);

/**
 * 获取包含页面URL、会话ID和用户ID的通用日志数据。
 * @deprecated 此函数不应直接从外部调用，而是由SDK内部使用。
 * 它现在依赖于 state.ts 中的访问器。
 */
export function getCommonLogData() {
  console.warn(
    "[SDK] getCommonLogData from index.ts is deprecated for direct use."
  );
  return internalGetCommonLogData();
}

// 手动触发日志队列的发送
export const flush = trySafe(flushQueue);

// Re-export enums for convenience
export { LogLevel, LogType, BreadcrumbType };

// Make SDK available on window if not in a module environment (e.g. CDN)
if (typeof window !== "undefined") {
  (window as any).FrontendLoggerSDK = {
    init,
    log,
    info,
    warn,
    error,
    track,
    setUser,
    clearUser,
    forceFlush,
    addBreadcrumb,
    getBreadcrumbs,
    clearBreadcrumbs,
    LogLevel,
    LogType,
    BreadcrumbType,
  };
}

// 默认导出，用于支持 import SDK from 'frontend-logger-sdk' 语法
const FrontendLoggerSDK = {
  init,
  log,
  info,
  warn,
  error,
  track,
  setUser,
  clearUser,
  forceFlush,
  addBreadcrumb,
  getBreadcrumbs,
  clearBreadcrumbs,
  flush,
  LogLevel,
  LogType,
  BreadcrumbType,
};

export default FrontendLoggerSDK;
