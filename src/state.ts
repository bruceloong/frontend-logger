import { SdkConfig, UserInfo } from "./types";

// SDK配置实例
let sdkConfigInstance: SdkConfig | null = null;
// 当前会话ID
let currentSessionIdInstance: string = "";
// 当前用户信息
let currentUserInstance: UserInfo | null = null;

/**
 * 设置SDK配置。仅应在SDK初始化时调用。
 * @param config - SDK配置对象
 */
export function setSDKConfig(config: SdkConfig): void {
  sdkConfigInstance = config;
}

/**
 * 获取SDK配置。
 * @returns SDK配置对象，如果未初始化则返回null。
 */
export function getSDKConfig(): SdkConfig | null {
  return sdkConfigInstance;
}

/**
 * 设置当前会话ID。
 * @param sessionId - 会话ID
 */
export function setCurrentSessionId(sessionId: string): void {
  currentSessionIdInstance = sessionId;
}

/**
 * 获取当前会话ID。
 * @returns 当前会话ID。
 */
export function getSessionId(): string {
  return currentSessionIdInstance;
}

/**
 * 设置当前用户信息。
 * @param user - 用户信息对象
 */
export function setCurrentUser(user: UserInfo | null): void {
  currentUserInstance = user;
}

/**
 * 获取当前用户信息。
 * @returns 当前用户信息对象，如果未设置则返回null。
 */
export function getCurrentUser(): UserInfo | null {
  return currentUserInstance;
}

/**
 * 检查SDK是否已初始化。
 * @returns 如果SDK已初始化则返回true，否则返回false。
 */
export function isSDKInitialized(): boolean {
  return sdkConfigInstance !== null;
}

/**
 * 获取SDK配置中的特定值，如果未设置或未初始化，则返回默认值或指定的回退值。
 * @param key - SdkConfig中的键
 * @param fallback - 如果找不到配置或键，则返回此值
 * @returns 配置值或回退值
 */
export function getConfigValue<K extends keyof SdkConfig>(
  key: K,
  fallback?: SdkConfig[K]
): SdkConfig[K] | undefined {
  if (sdkConfigInstance && sdkConfigInstance[key] !== undefined) {
    return sdkConfigInstance[key];
  }
  // 如果 SDK 未初始化或特定键未在最终配置中设置，则返回 fallback
  // 不再尝试从 defaultConfig 读取，因为它的类型是 Omit<...>
  // 并且 getConfigValue 的目的是获取当前 *激活* 的配置值
  return fallback;
}
