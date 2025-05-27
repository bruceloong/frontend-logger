import { BaseLog, DeviceInfo } from "../types";
import { getSDKConfig, getSessionId, getCurrentUser } from "../state";

export function getCommonLogData(): Omit<
  BaseLog,
  | "level"
  | "type"
  | "data"
  | "category"
  | "breadcrumbs"
  | "timestamp"
  | "sdkVersion"
  | "appId"
> {
  const user = getCurrentUser();

  return {
    pageUrl: window.location.href,
    sessionId: getSessionId(),
    userId: user?.id,
    // 注意: sdkVersion, appId, timestamp 通常在日志实际创建点附近添加，
    // 或者通过一个包装此函数的函数来确保它们是最新的。
    // 如果 config.sendDeviceInfoWithLogs 为 true，则可以在此处添加 deviceInfo
  };
}

let memoizedDeviceInfo: DeviceInfo | null = null;

export function getDeviceInfo(forceRefresh = false): DeviceInfo {
  if (!memoizedDeviceInfo || forceRefresh) {
    memoizedDeviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language:
        navigator.language ||
        (navigator as any).userLanguage || // 兼容旧版 IE
        (navigator as any).browserLanguage || // 兼容旧版 IE
        "",
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      network: (navigator as any).connection?.effectiveType || "unknown", // 网络类型
      // 可以考虑添加更多信息: deviceMemory, hardwareConcurrency (如果相关且可用)
      viewportWidth: window.innerWidth, // 视口宽度
      viewportHeight: window.innerHeight, // 视口高度
    };
  }
  return memoizedDeviceInfo;
}

export function generateUUID(): string {
  // 基本的 UUID v4 生成器
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SESSION_ID_KEY = "__sdk_sid"; // Session ID 存储键
const SESSION_LAST_ACTIVITY_KEY = "__sdk_slat"; // Session 最后活动时间存储键

export function getOrCreateSessionId(sessionTimeout: number): string {
  const now = Date.now();
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  const lastActivity = parseInt(
    sessionStorage.getItem(SESSION_LAST_ACTIVITY_KEY) || "0",
    10
  );

  if (sessionId && now - lastActivity > sessionTimeout) {
    // Session 已超时
    sessionId = null;
  }

  if (!sessionId) {
    sessionId = generateUUID();
  }
  sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(now)); // 更新最后活动时间
  return sessionId;
}

export function updateSessionLastActivity(): void {
  const config = getSDKConfig();
  if (sessionStorage.getItem(SESSION_ID_KEY) && config) {
    // 仅当会话存在时更新
    sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
  }
}

// 生成元素选择器 (可以做得更健壮)
export function getElementSelector(
  element: HTMLElement | null,
  maxDepth = 5 // 最大遍历深度
): string {
  if (
    !element ||
    element === document.body ||
    element === document.documentElement
  ) {
    return "body";
  }
  const selectors: string[] = [];
  let currentElement: HTMLElement | null = element;
  let depth = 0;

  while (
    currentElement &&
    currentElement !== document.body &&
    currentElement !== document.documentElement &&
    depth < maxDepth
  ) {
    let currentSelector = currentElement.tagName.toLowerCase();
    if (currentElement.id) {
      currentSelector += `#${currentElement.id.replace(/\s+/g, "-")}`; // ID 被认为是足够唯一的
      selectors.unshift(currentSelector);
      break;
    } else {
      const classes = Array.from(currentElement.classList)
        .filter((cls) => cls.trim() !== "" && !cls.includes(":")) // 过滤掉空的或伪类 (如果存在)
        .map((cls) => `.${cls.replace(/\s+/g, "-")}`)
        .join("");
      if (classes) {
        currentSelector += classes;
      }
      // 如果需要更具体的选择器，可以考虑添加 :nth-child 或 :nth-of-type，
      // 但这可能很脆弱且冗长。
    }
    selectors.unshift(currentSelector);
    currentElement = currentElement.parentElement;
    depth++;
  }

  return selectors.join(" > ") || "unknown_selector"; // 未知选择器
}

/**
 * 使用 try-catch 包装函数，以防止 SDK 错误导致宿主应用程序崩溃。
 * 如果处于调试模式，则将错误记录到控制台。
 */
export function trySafe<T extends (...args: any[]) => any>(
  fn: T,
  context: any = null
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  return function (...args: Parameters<T>): ReturnType<T> | undefined {
    try {
      return fn.apply(context, args);
    } catch (error) {
      const config = getSDKConfig();
      if (config?.debug) {
        console.error("[SDK 内部错误] 执行失败 ", fn.name, error);
      }
      // 可选：将此作为元错误报告给您的日志后端
    }
    return undefined; // 错误时显式返回 undefined
  };
}

/**
 * 检查目标元素或其父元素是否具有忽略列表中的类。
 */
export function hasIgnoredClass(
  element: HTMLElement | null,
  ignoreClasses: string[] | undefined
): boolean {
  if (!ignoreClasses || ignoreClasses.length === 0) {
    return false;
  }
  let currentElement: HTMLElement | null = element;
  while (currentElement) {
    for (const ignoredClass of ignoreClasses) {
      if (currentElement.classList.contains(ignoredClass)) {
        return true;
      }
    }
    currentElement = currentElement.parentElement;
  }
  return false;
}
