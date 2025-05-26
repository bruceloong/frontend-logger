import { Breadcrumb, BreadcrumbType } from "../types";
import { getSDKConfig, getConfigValue } from "../state";
import { trySafe } from "../lib/utils";

let breadcrumbs: Breadcrumb[] = [];

function _addBreadcrumb(breadcrumb: Omit<Breadcrumb, "timestamp">): void {
  const config = getSDKConfig();
  if (!config) return; // SDK 未初始化

  const timestamp = Date.now();
  const newBreadcrumb: Breadcrumb = { ...breadcrumb, timestamp };
  breadcrumbs.push(newBreadcrumb);

  const maxBreadcrumbs = config.maxBreadcrumbs || 20;
  if (breadcrumbs.length > maxBreadcrumbs) {
    breadcrumbs = breadcrumbs.slice(breadcrumbs.length - maxBreadcrumbs);
  }
  if (config.debug) {
    console.log("[SDK] 面包屑已添加:", newBreadcrumb);
  }
}

export const addBreadcrumb = trySafe(_addBreadcrumb);

export function getBreadcrumbs(): ReadonlyArray<Breadcrumb> {
  return breadcrumbs;
}

export function clearBreadcrumbs(): void {
  breadcrumbs = [];
  const config = getSDKConfig();
  if (config?.debug) {
    console.log("[SDK] 面包屑已清除。");
  }
}

/**
 * 将面包屑捕获附加到控制台方法。
 */
export function instrumentConsole(): void {
  const maxCrumbs = getConfigValue("maxBreadcrumbs");
  if (!maxCrumbs || maxCrumbs <= 0) return; // 如果禁用了面包屑，则不进行检测

  const config = getSDKConfig(); // 获取完整配置以供调试日志使用 (可选)

  const consoleMap: { [key: string]: BreadcrumbType } = {
    log: BreadcrumbType.CONSOLE, // 可以考虑更具体，如 CONSOLE_LOG
    info: BreadcrumbType.CONSOLE,
    warn: BreadcrumbType.CONSOLE,
    error: BreadcrumbType.CONSOLE, // 如果足够区分，也可以是 BreadcrumbType.ERROR
    debug: BreadcrumbType.CONSOLE,
  };

  (Object.keys(consoleMap) as Array<keyof typeof consoleMap>).forEach(
    (methodName) => {
      const originalConsoleMethod = (console as any)[methodName];

      (console as any)[methodName] = (...args: any[]): void => {
        trySafe(() => {
          let message = "";
          try {
            message = args
              .map((arg) => {
                if (typeof arg === "object" && arg !== null) {
                  // 尝试更安全地序列化，避免循环引用
                  // 对于 DOM 元素或复杂对象，可能需要更复杂的处理
                  if (arg instanceof Node) return arg.nodeName;
                  try {
                    return JSON.stringify(
                      arg,
                      Object.getOwnPropertyNames(
                        Object.getPrototypeOf(arg) === Object.prototype
                          ? arg
                          : Object.getPrototypeOf(arg)
                      ),
                      2
                    );
                  } catch (e) {
                    return `[Object (type: ${Object.prototype.toString.call(
                      arg
                    )})]`; // 提供一些类型信息
                  }
                }
                return String(arg);
              })
              .join(" ");
          } catch (e) {
            message = "[SDK] 无法序列化控制台参数";
          }

          addBreadcrumb({
            type: consoleMap[methodName],
            message: message.substring(0, 250), // 限制消息大小
            data: { level: methodName }, // 存储原始控制台级别
          });
        })();

        originalConsoleMethod.apply(console, args);
      };
    }
  );
}
