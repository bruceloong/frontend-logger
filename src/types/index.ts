// src/types/index.ts
export enum LogLevel {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  DEBUG = "debug",
}

export enum LogType {
  ERROR = "error", // 错误日志
  PERFORMANCE = "performance", // 性能日志
  BEHAVIOR = "behavior", // 行为日志
  CUSTOM = "custom", // 自定义日志
  DEVICE_INFO = "device_info", // 设备信息日志
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  network?: string;
  viewportWidth: number;
  viewportHeight: number;
  // ... 可添加更多设备信息
}

export enum BreadcrumbType { // 面包屑类型
  CLICK = "click", // 点击事件
  NAVIGATION = "navigation", // 导航/路由变化
  CONSOLE = "console", // 控制台日志
  ERROR = "error", // 错误发生
  CUSTOM = "custom", // 用户自定义
  API = "api", // API 请求
  // ... 可添加更多类型
}

export interface Breadcrumb {
  // 面包屑结构
  type: BreadcrumbType;
  message: string;
  data?: any;
  timestamp: number;
}

export interface BaseLog {
  // 基础日志结构
  timestamp: number; // 时间戳
  sdkVersion: string; // SDK 版本
  appId: string; // 应用ID
  userId?: string; // 用户ID
  sessionId: string; // 会话ID
  pageUrl: string; // 页面URL
  level: LogLevel; // 日志级别
  type: LogType; // 日志类型
  category?: string; // 日志分类 (例如：js_error, resource_error)
  deviceInfo?: Partial<DeviceInfo>; // 部分设备信息，可随每条日志发送
  breadcrumbs?: Breadcrumb[]; // 错误发生时的面包屑
}

// 错误日志特定字段
export interface ErrorData {
  message: string; // 错误信息
  source?: string; // 错误来源文件
  lineno?: number; // 行号
  colno?: number; // 列号
  stack?: string; // 错误堆栈
}
export interface ErrorLog extends BaseLog {
  type: LogType.ERROR;
  category: "js" | "resource" | "promise" | "console" | "manual"; // 错误分类
  data: ErrorData;
}

// 性能日志特定字段
export interface PerformanceMetric {
  name: string; // 指标名称, 例如 'FCP', 'LCP', 'FID', 'CLS', 'TTFB' 等.
  value: number; // 指标值
  unit?: "ms" | "score"; // 单位, CLS 是一个分数
  entry?: any; // 原始 performance entry，用于需要更多详细信息时
}
export interface PerformanceLog extends BaseLog {
  type: LogType.PERFORMANCE;
  category: "web-vitals" | "navigation" | "resource_timing"; // 性能分类
  data: PerformanceMetric | Record<string, any>; // 可以是单个指标或一组导航计时
}

// 行为日志特定字段
export interface BehaviorData {
  subType: string; // 子类型, 例如 'click', 'page_view', 'custom_event', 'route_change'
  [key: string]: any; // 灵活的数据字段
}
export interface BehaviorLog extends BaseLog {
  type: LogType.BEHAVIOR;
  category: "click" | "page_view" | "route_change" | "custom_event"; // 行为分类
  data: BehaviorData;
}

// 自定义日志特定字段
export interface CustomLog extends BaseLog {
  type: LogType.CUSTOM;
  data: any; // 用户自定义数据
}
export interface DeviceInfoLog extends BaseLog {
  type: LogType.DEVICE_INFO;
  data: DeviceInfo; // 完整的设备信息
}

export type LogEntry =
  | ErrorLog
  | PerformanceLog
  | BehaviorLog
  | CustomLog
  | DeviceInfoLog;

// 用户上下文信息
export interface UserInfo {
  id?: string;
  [key: string]: any; // 允许其他用户特定的详细信息
}

// SDK 配置项
export interface SdkConfig {
  reportUrl: string; // 日志上报地址
  appId: string; // 应用ID
  userId?: string; // 用户ID
  sampleRate?: number; // 采样率 (0到1之间)
  sdkVersion: string; // SDK版本 (通常由构建过程自动填充)
  autoTrack?: {
    // 自动追踪配置
    jsError?: boolean; // JS错误
    resourceError?: boolean; // 资源加载错误
    promiseRejection?: boolean; // Promise Rejection
    performance?: boolean; // 性能数据总开关
    webVitals?: boolean; // Web Vitals 核心指标
    navigationTiming?: boolean; // 导航计时数据
    deviceInfo?: boolean; // 初始化时是否发送专门的设备信息日志
  };
  behavior?: {
    // 行为追踪配置
    clicks?:
      | boolean
      | {
          // 点击事件配置
          selectors?: string[]; // 只追踪这些选择器匹配的元素点击
          ignoreClasses?: string[]; // 忽略包含这些类名的元素点击
        };
    navigation?: boolean; // 页面浏览/路由变化
  };
  maxBreadcrumbs?: number; // 最大面包屑数量
  batchSize?: number; // 批量上报的日志数量阈值
  batchInterval?: number; // ms, 批量上报的时间间隔阈值
  beforeSend?: (log: LogEntry) => LogEntry | false | Promise<LogEntry | false>; // 日志发送前回调，可修改或丢弃日志，可以是异步的
  debug?: boolean; // 是否开启SDK自身的调试日志
  sessionTimeout?: number; // ms, 会话超时时间，默认30分钟
  sendDeviceInfoWithLogs?: boolean; // 是否在每条日志中附加部分设备信息
}
