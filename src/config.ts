import { SdkConfig } from "./types";

// 此版本号将在构建过程中被替换 (例如，使用 webpack.DefinePlugin)
export const DEFAULT_SDK_VERSION = "__SDK_VERSION__";

export const defaultConfig: Omit<
  SdkConfig,
  "reportUrl" | "appId" | "sdkVersion"
> = {
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
  maxBreadcrumbs: 20,
  batchSize: 10,
  batchInterval: 5000, // 5 秒
  debug: false,
  sessionTimeout: 30 * 60 * 1000, // 30 分钟
  sendDeviceInfoWithLogs: false,
};

export function mergeConfig(userConfig: Partial<SdkConfig>): SdkConfig {
  if (!userConfig.reportUrl) {
    throw new Error("[SDK] 初始化需要 reportUrl 参数。");
  }
  if (!userConfig.appId) {
    throw new Error("[SDK] 初始化需要 appId 参数。");
  }

  const mergedConfig = {
    ...defaultConfig,
    ...userConfig,
    // 确保嵌套对象也正确合并
    autoTrack: { ...defaultConfig.autoTrack, ...userConfig.autoTrack },
    behavior: {
      ...defaultConfig.behavior,
      // 如果 userConfig.behavior.clicks 是布尔值, 它将覆盖 defaultConfig.behavior.clicks (可能是一个对象)
      // 如果它是一个对象, 它将与 defaultConfig.behavior.clicks 合并 (如果它也是一个对象)
      clicks:
        typeof userConfig.behavior?.clicks === "object" &&
        typeof defaultConfig.behavior?.clicks === "object"
          ? { ...defaultConfig.behavior.clicks, ...userConfig.behavior.clicks }
          : userConfig.behavior?.clicks ?? defaultConfig.behavior?.clicks,
      navigation:
        userConfig.behavior?.navigation ?? defaultConfig.behavior?.navigation,
    },
    sdkVersion: userConfig.sdkVersion || DEFAULT_SDK_VERSION, // 使用用户提供的版本或默认/构建时版本
  } as SdkConfig; // 合并后进行类型断言

  return mergedConfig;
}
