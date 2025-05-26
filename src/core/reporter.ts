import { LogEntry, SdkConfig } from "../types";
import { getSDKConfig } from "../index"; // 假设这将从主 index 文件中可用
import { trySafe } from "../lib/utils";

let logQueue: LogEntry[] = [];
let timerId: number | null = null;

const MAX_RETRY_ATTEMPTS = 3; // 最大重试次数
const RETRY_DELAY_BASE_MS = 1000; // 重试基础延迟毫秒数
const MAX_QUEUE_SIZE_BEFORE_FLUSH = 50; // 立即清空队列的最大日志数量，如果大于 batchSize 则覆盖它

// 用于存储失败的日志 - 非常基础，实际实现可能使用 IndexedDB 进行持久化
const FAILED_LOGS_STORAGE_KEY = "__sdk_failed_logs";

function storeFailedLogs(logs: LogEntry[]): void {
  const config = getSDKConfig();
  if (config?.debug) {
    console.warn("[SDK] 正在存储失败的日志 (此示例中为内存存储):", logs);
  }
  // 在实际场景中，您会使用 localStorage 或 IndexedDB 并设置大小限制
  // 为简单起见，此示例未实现会话之外失败日志的持久存储。
  // 您可以谨慎地推送到全局数组或使用 localStorage。
  try {
    const existingFailed = JSON.parse(
      localStorage.getItem(FAILED_LOGS_STORAGE_KEY) || "[]"
    );
    const updatedFailed = [...existingFailed, ...logs].slice(
      -MAX_QUEUE_SIZE_BEFORE_FLUSH * 2 // 限制存储的失败日志数量
    );
    localStorage.setItem(
      FAILED_LOGS_STORAGE_KEY,
      JSON.stringify(updatedFailed)
    );
  } catch (e) {
    if (config?.debug) console.error("[SDK] 存储日志到 localStorage 失败:", e);
  }
}

function retrieveAndClearFailedLogs(): LogEntry[] {
  try {
    const logs = JSON.parse(
      localStorage.getItem(FAILED_LOGS_STORAGE_KEY) || "[]"
    ) as LogEntry[];
    if (logs.length > 0) {
      localStorage.removeItem(FAILED_LOGS_STORAGE_KEY);
      const config = getSDKConfig();
      if (config?.debug) console.log("[SDK] 已检索存储的失败日志:", logs);
      return logs;
    }
  } catch (e) {
    const config = getSDKConfig();
    if (config?.debug) console.error("[SDK] 从 localStorage 检索日志失败:", e);
  }
  return [];
}

async function sendLogs(
  logs: LogEntry[],
  config: SdkConfig,
  attempt = 1
): Promise<void> {
  if (!logs || logs.length === 0) return;
  const dataToSend = JSON.stringify(logs);

  if (config.debug) {
    console.log(
      `[SDK] 尝试发送 ${logs.length} 条日志 (尝试次数 ${attempt}):`,
      logs
    );
  }

  try {
    let sentSuccessfully = false;
    if (navigator.sendBeacon && attempt === 1) {
      // sendBeacon 是"即发即弃"的，除了排队之外，不返回 Promise 或轻易指示成功
      // 它有数据限制 (大约 64KB)
      try {
        sentSuccessfully = navigator.sendBeacon(config.reportUrl, dataToSend);
        if (!sentSuccessfully && config.debug) {
          console.warn(
            "[SDK] navigator.sendBeacon 返回 false, 可能表示数据过大或其他问题。"
          );
        }
      } catch (e) {
        // sendBeacon 在某些浏览器中如果数据过大可能会抛出错误
        if (config.debug)
          console.warn(
            "[SDK] navigator.sendBeacon 抛出错误 (数据可能过大):",
            e
          );
        sentSuccessfully = false; // 确保它会回退到 fetch
      }
    }

    if (!sentSuccessfully) {
      // 使用 fetch 作为回退或用于重试
      const response = await fetch(config.reportUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: dataToSend,
        keepalive: true, // 重要：确保 fetch 在页面卸载时仍能工作，尤其是在 sendBeacon 失败时
      });
      if (!response.ok) {
        throw new Error(
          `服务器响应 ${response.status}: ${await response
            .text()
            .catch(() => "")}`
        );
      }
      if (config.debug) console.log("[SDK] 日志通过 fetch 发送成功。");
    } else {
      if (config.debug && attempt === 1)
        console.log("[SDK] 日志通过 sendBeacon 成功排队。");
    }
  } catch (error) {
    if (config.debug) {
      console.error("[SDK] 日志上报在尝试 " + attempt + " 次后失败:", error);
    }
    if (attempt < MAX_RETRY_ATTEMPTS) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1))
      ); // 指数退避
      return sendLogs(logs, config, attempt + 1); // 重试
    } else {
      if (config.debug)
        console.error("[SDK] 已达到最大重试次数。正在存储日志。");
      storeFailedLogs(logs);
    }
  }
}

const _flushQueue = async (): Promise<void> => {
  const config = getSDKConfig();
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  if (logQueue.length > 0 && config) {
    const logsToProcess = [...logQueue];
    logQueue = [];
    await sendLogs(logsToProcess, config);
  } else if (config?.debug && logQueue.length === 0) {
    console.log("[SDK] flushQueue 被调用，但队列为空。");
  }
};

export const flushQueue = trySafe(_flushQueue);

async function _processLog(logEntry: LogEntry): Promise<void> {
  const config = getSDKConfig();
  if (!config || !config.reportUrl || !config.appId) {
    console.warn(
      "[SDK] SDK 未初始化或缺少 reportUrl/appId。日志已丢弃:",
      logEntry
    );
    return;
  }

  // 采样
  if (
    config.sampleRate !== undefined &&
    config.sampleRate < 1.0 &&
    Math.random() > config.sampleRate
  ) {
    if (config.debug) console.log("[SDK] 日志因采样被丢弃:", logEntry);
    return;
  }

  let finalLogEntry: LogEntry | false | Promise<LogEntry | false> = logEntry;
  if (config.beforeSend) {
    try {
      finalLogEntry = config.beforeSend(logEntry); // 可以是一个 promise
    } catch (e) {
      console.error("[SDK] beforeSend 钩子 (同步路径) 发生错误:", e);
      // 可选：将此错误作为元错误报告，或丢弃日志
      finalLogEntry = false;
    }
  }

  // 处理异步 beforeSend
  if (finalLogEntry instanceof Promise) {
    try {
      finalLogEntry = await finalLogEntry;
    } catch (e) {
      console.error("[SDK] beforeSend 钩子 (异步路径) 发生错误:", e);
      finalLogEntry = false;
    }
  }

  if (finalLogEntry === false) {
    if (config.debug)
      console.log("[SDK] 日志被 beforeSend 钩子丢弃:", logEntry);
    return;
  }

  logQueue.push(finalLogEntry as LogEntry);

  if (
    logQueue.length >= (config.batchSize || 10) || // 达到批量大小
    logQueue.length >= MAX_QUEUE_SIZE_BEFORE_FLUSH // 或者达到最大队列大小
  ) {
    await flushQueue();
  } else if (!timerId) {
    timerId = window.setTimeout(
      trySafe(flushQueue),
      config.batchInterval || 5000
    ); // 使用 trySafe 包装 flushQueue
  }
}

export const reportLog = trySafe(_processLog);

export function attemptRetransmissionOfStoredLogs(): void {
  const config = getSDKConfig();
  if (!config || !config.reportUrl) return;

  const failedLogs = retrieveAndClearFailedLogs();
  if (failedLogs.length > 0) {
    if (config.debug)
      console.log(`[SDK] 尝试重新传输 ${failedLogs.length} 条已存储的日志。`);
    // 以较小的批次发送这些日志，以避免网络过载或 sendBeacon 限制
    const batchSize = config.batchSize || 10;
    for (let i = 0; i < failedLogs.length; i += batchSize) {
      const batch = failedLogs.slice(i, i + batchSize);
      sendLogs(batch, config); // 不要 await，让它们在后台发送
    }
  }
}

// 页面卸载/隐藏时自动清空队列
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushQueue(); // 确保调用的是 trySafe 版本
    }
  });
  window.addEventListener(
    "pagehide",
    () => {
      flushQueue(); // 确保调用的是 trySafe 版本
    },
    { capture: true }
  );
}
