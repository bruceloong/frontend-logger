import {
  LogLevel,
  LogType,
  ErrorLog,
  ErrorData,
  BreadcrumbType,
} from "../types";
import { reportLog } from "./reporter";
import { getSDKConfig, getConfigValue } from "../state";
import { addBreadcrumb, getBreadcrumbs } from "./breadcrumbs";
import {
  getCommonLogData as internalGetCommonLogData,
  trySafe,
} from "../lib/utils";

function formatJsError(event: ErrorEvent): ErrorData {
  return {
    message: event.message,
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  };
}

function formatResourceError(event: Event): ErrorData | null {
  const target = event.target as HTMLElement;
  let sourceUrl: string | null = null;

  if (
    target instanceof HTMLScriptElement ||
    target instanceof HTMLImageElement ||
    target instanceof HTMLVideoElement ||
    target instanceof HTMLAudioElement
  ) {
    sourceUrl = target.src;
  } else if (target instanceof HTMLLinkElement) {
    sourceUrl = target.href;
  }

  if (sourceUrl) {
    return {
      message: `Failed to load resource: ${sourceUrl.substring(0, 200)}`,
      source: sourceUrl,
    };
  }
  return null;
}

function formatPromiseError(event: PromiseRejectionEvent): ErrorData {
  const reason = event.reason;
  if (reason instanceof Error) {
    return {
      message: reason.message,
      stack: reason.stack,
      source: "unhandledrejection",
    };
  }
  return {
    message: typeof reason === "string" ? reason : JSON.stringify(reason),
    source: "unhandledrejection",
  };
}

const _handleGlobalError = (
  errorData: ErrorData,
  category: ErrorLog["category"]
): void => {
  const currentConfig = getSDKConfig();
  if (!currentConfig) return;

  addBreadcrumb({
    type: BreadcrumbType.ERROR,
    message: `错误: ${errorData.message.substring(0, 100)}`,
    data: { category, source: errorData.source },
  });

  const logEntry: ErrorLog = {
    ...internalGetCommonLogData(),
    timestamp: Date.now(),
    sdkVersion: currentConfig.sdkVersion,
    appId: currentConfig.appId,
    level: LogLevel.ERROR,
    type: LogType.ERROR,
    category,
    data: errorData,
    breadcrumbs: [...getBreadcrumbs()],
  };
  reportLog(logEntry);
};
const handleGlobalError = trySafe(_handleGlobalError);

export function initErrorCollection(): void {
  const autoTrackConfig = getConfigValue("autoTrack");
  const currentConfig = getSDKConfig();

  if (autoTrackConfig?.jsError) {
    const jsErrorHandler = trySafe((event: ErrorEvent) => {
      // Avoid reporting errors that are handled by other more specific listeners (e.g. resource errors if they bubble to window.onerror)
      // This check might need refinement. Often ErrorEvent for JS errors has `error` property.
      if (event.error) {
        // This is more indicative of a JS error
        const formattedError = formatJsError(event);
        handleGlobalError(formattedError, "js");
      }
    });
    window.addEventListener("error", jsErrorHandler, true); // Use capture phase for JS errors
  }

  if (autoTrackConfig?.resourceError) {
    const resourceErrorHandler = trySafe((event: Event) => {
      // Resource errors typically don't have `error` property on the event when caught by window.addEventListener('error')
      // and target will be the element that failed to load.
      if (!(event instanceof ErrorEvent) && event.target) {
        const formattedError = formatResourceError(event);
        if (formattedError) {
          handleGlobalError(formattedError, "resource");
        }
      }
    });
    window.addEventListener("error", resourceErrorHandler, true); // Capture phase is good for resource errors too
  }

  if (autoTrackConfig?.promiseRejection) {
    const promiseRejectionHandler = trySafe((event: PromiseRejectionEvent) => {
      const formattedError = formatPromiseError(event);
      handleGlobalError(formattedError, "promise");
    });
    window.addEventListener("unhandledrejection", promiseRejectionHandler);
  }

  // Optional: Override console.error to capture its calls as logs
  if (currentConfig && autoTrackConfig?.jsError) {
    // Assuming console.error capture falls under jsError tracking
    const originalConsoleError = console.error;
    console.error = trySafe((...args: any[]) => {
      originalConsoleError.apply(console, args);
      let message = "";
      try {
        message = args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ");
      } catch (e) {
        message = "[SDK] Failed to serialize console.error arguments";
      }

      handleGlobalError(
        {
          message: message.substring(0, 500), // Limit message length
          source: "console.error",
        },
        "console"
      );
    });
  }
}
