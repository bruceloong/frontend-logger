import { LogLevel, LogType, PerformanceLog, PerformanceMetric } from "../types";
import { reportLog } from "./reporter";
import { getSDKConfig, getConfigValue } from "../state";
import {
  getCommonLogData as internalGetCommonLogData,
  trySafe,
} from "../lib/utils";

let clsValue = 0;
let lcpReported = false;
let fcpReported = false;
let fidReported = false;

const _observePerformance = (): void => {
  const currentConfig = getSDKConfig();
  if (!currentConfig) return;

  if (typeof PerformanceObserver === "undefined") {
    if (currentConfig.debug)
      console.warn(
        "[SDK] PerformanceObserver API 不支持。跳过 Web Vitals 和一些性能指标。"
      );
    return;
  }

  const autoTrackCfg = getConfigValue("autoTrack");

  const entryHandler = (list: PerformanceObserverEntryList) => {
    const activeConfig = getSDKConfig();
    if (!activeConfig) return;
    const activeAutoTrackCfg = activeConfig.autoTrack;

    for (const entry of list.getEntries()) {
      let metric: PerformanceMetric | null = null;
      let category: PerformanceLog["category"] = "web-vitals";

      switch (entry.entryType) {
        case "paint":
          if (entry.name === "first-paint" && activeAutoTrackCfg?.webVitals) {
            // FP is often not reported directly, FCP is preferred.
            // metric = { name: 'FP', value: entry.startTime, unit: 'ms', entry };
          } else if (
            entry.name === "first-contentful-paint" &&
            !fcpReported &&
            activeAutoTrackCfg?.webVitals
          ) {
            metric = { name: "FCP", value: entry.startTime, unit: "ms", entry };
            fcpReported = true;
          }
          break;
        case "largest-contentful-paint":
          if (!lcpReported && activeAutoTrackCfg?.webVitals) {
            metric = { name: "LCP", value: entry.startTime, unit: "ms", entry };
          }
          break;
        case "first-input":
          if (!fidReported && activeAutoTrackCfg?.webVitals) {
            const fidEntry = entry as PerformanceEventTiming;
            metric = {
              name: "FID",
              value: fidEntry.processingStart - fidEntry.startTime,
              unit: "ms",
              entry: fidEntry,
            };
            fidReported = true;
          }
          break;
        case "layout-shift":
          if (activeAutoTrackCfg?.webVitals) {
            const layoutShiftEntry = entry as PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            };
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value;
            }
          }
          break;
        case "navigation":
          if (activeAutoTrackCfg?.navigationTiming) {
            const navEntry = entry as PerformanceNavigationTiming;
            const navMetrics: Record<string, any> = {
              ttfb: navEntry.responseStart - navEntry.requestStart,
              domContentLoadedTime:
                navEntry.domContentLoadedEventEnd - navEntry.startTime,
              loadTime: navEntry.loadEventEnd - navEntry.startTime,
              dnsLookupTime:
                navEntry.domainLookupEnd - navEntry.domainLookupStart,
              tcpConnectTime: navEntry.connectEnd - navEntry.connectStart,
              requestTime: navEntry.responseStart - navEntry.requestStart,
              responseTime: navEntry.responseEnd - navEntry.responseStart,
              domInteractiveTime: navEntry.domInteractive - navEntry.startTime,
              entryType: navEntry.type,
              protocol: navEntry.nextHopProtocol,
            };
            category = "navigation";
            reportLog({
              ...internalGetCommonLogData(),
              timestamp: Date.now(),
              sdkVersion: activeConfig.sdkVersion,
              appId: activeConfig.appId,
              level: LogLevel.INFO,
              type: LogType.PERFORMANCE,
              category,
              data: { name: "navigationTiming", ...navMetrics },
            });
          }
          break;
        case "resource":
          // Resource timing can be very verbose. Consider if it's needed and how to sample/filter.
          // if (config.autoTrack?.resourceTiming) { ... }
          break;
      }

      if (metric) {
        const logEntry: PerformanceLog = {
          ...internalGetCommonLogData(),
          timestamp: Date.now(),
          sdkVersion: activeConfig.sdkVersion,
          appId: activeConfig.appId,
          level: LogLevel.INFO,
          type: LogType.PERFORMANCE,
          category,
          data: metric,
        };
        if (metric.name !== "LCP") {
          reportLog(logEntry);
        }
      }
    }
  };

  const po = new PerformanceObserver(trySafe(entryHandler));
  if (autoTrackCfg?.webVitals) {
    po.observe({ type: "paint", buffered: true });
    po.observe({ type: "largest-contentful-paint", buffered: true });
    po.observe({ type: "first-input", buffered: true });
    po.observe({ type: "layout-shift", buffered: true });
  }
  if (autoTrackCfg?.navigationTiming) {
    po.observe({ type: "navigation", buffered: true });
  }
  // if (autoTrackCfg?.resourceTiming) { po.observe({ type: 'resource', buffered: true }); }

  const reportClsAndLcp = trySafe(() => {
    const finalConfig = getSDKConfig();
    if (!finalConfig || !finalConfig.autoTrack?.webVitals) return;

    if (!lcpReported) {
      const lcpEntries = performance.getEntriesByType(
        "largest-contentful-paint"
      );
      if (lcpEntries.length > 0) {
        const lastLcpEntry = lcpEntries[lcpEntries.length - 1];
        reportLog({
          ...internalGetCommonLogData(),
          timestamp: Date.now(),
          sdkVersion: finalConfig.sdkVersion,
          appId: finalConfig.appId,
          level: LogLevel.INFO,
          type: LogType.PERFORMANCE,
          category: "web-vitals",
          data: {
            name: "LCP",
            value: lastLcpEntry.startTime,
            unit: "ms",
            entry: lastLcpEntry,
          },
        });
        lcpReported = true;
      }
    }
    if (clsValue > 0) {
      reportLog({
        ...internalGetCommonLogData(),
        timestamp: Date.now(),
        sdkVersion: finalConfig.sdkVersion,
        appId: finalConfig.appId,
        level: LogLevel.INFO,
        type: LogType.PERFORMANCE,
        category: "web-vitals",
        data: { name: "CLS", value: clsValue, unit: "score" },
      });
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      reportClsAndLcp();
    }
  });
  window.addEventListener("pagehide", reportClsAndLcp, { capture: true });
};

export const initPerformanceCollection = trySafe((): void => {
  clsValue = 0;
  lcpReported = false;
  fcpReported = false;
  fidReported = false;
  _observePerformance();
});
