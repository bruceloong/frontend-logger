// src/core/behaviorTracker.ts
import {
  LogLevel,
  LogType,
  BehaviorLog,
  BehaviorData,
  BreadcrumbType,
} from "../types";
import { reportLog } from "./reporter";
import { getSDKConfig, getConfigValue } from "../state";
import { addBreadcrumb } from "./breadcrumbs";
import {
  getCommonLogData as internalGetCommonLogData,
  getElementSelector,
  trySafe,
  hasIgnoredClass,
} from "../lib/utils";

const _initBehaviorTracking = (): void => {
  const currentFullConfig = getSDKConfig();
  if (!currentFullConfig) return;

  const behaviorConfig = getConfigValue("behavior");
  const debugMode = getConfigValue("debug");

  // Track Clicks
  if (behaviorConfig?.clicks) {
    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      let clickSettings = behaviorConfig.clicks;
      if (typeof clickSettings === "boolean") clickSettings = {};

      if (hasIgnoredClass(target, clickSettings?.ignoreClasses)) {
        if (debugMode)
          console.log("[SDK] 点击因 ignoreClasses 规则被忽略:", target);
        return;
      }

      if (clickSettings?.selectors && clickSettings.selectors.length > 0) {
        let matched = false;
        for (const selector of clickSettings.selectors) {
          if (target.matches(selector)) {
            matched = true;
            break;
          }
        }
        if (!matched) {
          if (debugMode)
            console.log("[SDK] 点击被忽略，未匹配任何指定的选择器:", target);
          return;
        }
      }
      const activeConfig = getSDKConfig();
      if (!activeConfig) return;

      const selector = getElementSelector(target);
      const data: BehaviorData = {
        subType: "click",
        selector,
        tagName: target.tagName.toLowerCase(),
        textContent: target.textContent?.trim().substring(0, 100) || "",
        targetId: target.id,
        targetClasses: Array.from(target.classList).join(" "),
      };
      addBreadcrumb({
        type: BreadcrumbType.CLICK,
        message: `点击 ${selector.substring(0, 100)}`,
        data: {
          selector: data.selector,
          text: data.textContent?.substring(0, 50),
        },
      });

      const logEntry: BehaviorLog = {
        ...internalGetCommonLogData(),
        timestamp: Date.now(),
        sdkVersion: activeConfig.sdkVersion,
        appId: activeConfig.appId,
        level: LogLevel.INFO,
        type: LogType.BEHAVIOR,
        category: "click",
        data,
      };
      reportLog(logEntry);
    };
    document.addEventListener("click", trySafe(clickHandler), true);
  }

  // Track Navigation (Page Views / Route Changes)
  if (behaviorConfig?.navigation) {
    let lastRecordedPath =
      window.location.pathname + window.location.search + window.location.hash;

    const recordPageView = (
      url?: string,
      subType: "page_view" | "route_change" = "page_view"
    ) => {
      const activeConfig = getSDKConfig();
      if (!activeConfig) return;

      const pageUrl =
        url ||
        window.location.pathname +
          window.location.search +
          window.location.hash;
      if (subType === "route_change" && pageUrl === lastRecordedPath) {
        if (activeConfig.debug)
          console.log("[SDK] 路由更改到相同路径被忽略:", pageUrl);
        return;
      }

      lastRecordedPath = pageUrl;

      const data: BehaviorData = {
        subType,
        url: pageUrl,
        referrer: document.referrer,
        title: document.title,
      };
      addBreadcrumb({
        type: BreadcrumbType.NAVIGATION,
        message: `${
          subType === "page_view" ? "查看" : "导航至"
        } ${pageUrl.substring(0, 150)}`,
        data: { url: data.url, title: data.title },
      });

      const logEntry: BehaviorLog = {
        ...internalGetCommonLogData(),
        timestamp: Date.now(),
        sdkVersion: activeConfig.sdkVersion,
        appId: activeConfig.appId,
        level: LogLevel.INFO,
        type: LogType.BEHAVIOR,
        category: subType === "page_view" ? "page_view" : "route_change",
        data,
      };
      reportLog(logEntry);
    };

    // Initial Page View
    recordPageView(undefined, "page_view");

    // Listen to hash changes
    window.addEventListener(
      "hashchange",
      trySafe(() => recordPageView(undefined, "route_change")),
      true
    );

    // Listen to popstate (browser back/forward)
    window.addEventListener(
      "popstate",
      trySafe(() => recordPageView(undefined, "route_change")),
      true
    );

    // Monkey patch history.pushState and history.replaceState
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      // Dispatch a custom event or directly call recordPageView
      // Using custom event is cleaner if other parts of SDK might want to listen
      const event = new CustomEvent("pushstate", { detail: { to: args[2] } });
      window.dispatchEvent(event);
      trySafe(() => recordPageView(args[2]?.toString(), "route_change"))(); // args[2] is the URL
      return result;
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      const event = new CustomEvent("replacestate", {
        detail: { to: args[2] },
      });
      window.dispatchEvent(event);
      trySafe(() => recordPageView(args[2]?.toString(), "route_change"))();
      return result;
    };
  }
};

export const initBehaviorTracking = trySafe(_initBehaviorTracking);
