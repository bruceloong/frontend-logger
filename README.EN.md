# Frontend Logger SDK

A comprehensive SDK for client-side logging, error tracking, performance monitoring, and behavior analytics.

## Features

- **Error Tracking**: Automatic capturing of JavaScript errors, resource loading errors, and unhandled promise rejections.
- **Performance Monitoring**: Collects Core Web Vitals (LCP, FID, CLS), FCP, and navigation timing data.
- **Behavior Tracking**: Logs user interactions like clicks and page/route changes.
- **Custom Logging**: Flexible API for sending custom log messages with different severity levels.
- **Breadcrumbs**: Automatically records user actions (clicks, navigation, console logs) to provide context for errors.
- **Batching & Retries**: Efficiently sends data in batches with retry mechanisms for failed uploads.
- **Configurable**: Highly configurable with options for sampling, data filtering, and feature toggling.
- **Lightweight**: Designed to be performant and have a minimal impact on the host application.

## Installation

```bash
npm install frontend-logger-sdk # Replace with your actual package name
# or
yarn add frontend-logger-sdk
```

## Quick Start

```javascript
import { init, error, log, track, setUser } from "frontend-logger-sdk"; // Adjust path based on your setup/package name

// Initialize the SDK
init({
  reportUrl: "https://your-logging-endpoint.com/api/logs",
  appId: "YOUR_APP_ID",
  debug: true, // Enable SDK debug messages in console (optional)
  sampleRate: 1.0, // Log 100% of events (optional)
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
    clicks: true, // or { selectors: ['button[data-track]'], ignoreClasses: ['no-track'] }
    navigation: true,
  },
  maxBreadcrumbs: 30,
  beforeSend: (logEntry) => {
    // Modify logEntry or return false to prevent sending
    if (
      logEntry.type === "error" &&
      logEntry.data.message?.includes("ignore this error")
    ) {
      return false;
    }
    // Example: Add custom metadata
    // logEntry.customData = { tenantId: '123' };
    return logEntry;
  },
});

// Example Usage

// Set user information (optional)
setUser("user-12345", { email: "user@example.com", name: "John Doe" });

// Custom log messages
log("User performed an action", { buttonId: "submit-form" }, "info");

// Report a caught error
try {
  // some risky operation
  throw new Error("Something went wrong!");
} catch (e) {
  error(e, { context: "form-submission" });
}

// Track a custom event
track("videoPlayed", { videoId: "xyz", duration: 120 });
```

## Configuration

The `init` method accepts a configuration object. Here are some key options:

- `reportUrl` (string, required): The URL endpoint where logs will be sent.
- `appId` (string, required): Your application's unique identifier.
- `userId` (string, optional): An identifier for the current user.
- `sdkVersion` (string, optional): Overrides the default SDK version.
- `sampleRate` (number, optional): A value between 0 and 1 to control the percentage of events logged (e.g., 0.5 for 50%). Default: `1.0`.
- `debug` (boolean, optional): Set to `true` to enable verbose logging from the SDK itself to the console. Default: `false`.
- `autoTrack` (object, optional): Fine-grained control over automatic tracking features.
  - `jsError` (boolean): Capture global JavaScript errors. Default: `true`.
  - `resourceError` (boolean): Capture resource loading errors. Default: `true`.
  - `promiseRejection` (boolean): Capture unhandled promise rejections. Default: `true`.
  - `performance` (boolean): Master switch for all performance tracking. Default: `true`.
  - `webVitals` (boolean): Capture Core Web Vitals (LCP, FID, CLS, FCP). Default: `true`.
  - `navigationTiming` (boolean): Capture navigation timing data. Default: `true`.
  - `deviceInfo` (boolean): Send a log with device information on init. Default: `true`.
- `behavior` (object, optional): Control automatic behavior tracking.
  - `clicks` (boolean | object): Track element clicks. Can be `true` or an object `{ selectors?: string[], ignoreClasses?: string[] }`. Default: `true`.
  - `navigation` (boolean): Track page views and route changes (for SPAs). Default: `true`.
- `maxBreadcrumbs` (number, optional): Maximum number of breadcrumbs to store. Default: `20`.
- `batchSize` (number, optional): Number of logs to batch before sending. Default: `10`.
- `batchInterval` (number, optional): Maximum time (ms) to wait before sending a batch. Default: `5000`.
- `beforeSend` (function, optional): A callback function `(logEntry) => logEntry | false | Promise<logEntry | false>` that is called before each log is sent. Allows modification or filtering of logs. Return `false` to prevent the log from being sent. Can be asynchronous.
- `sessionTimeout` (number, optional): Duration in milliseconds after which a session is considered timed out if no activity. Default: `30 * 60 * 1000` (30 minutes).
- `sendDeviceInfoWithLogs` (boolean, optional): If true, attaches partial device info to each log. Default: `false`.

## API

- `init(config: SdkConfig): void`
  Initializes the SDK with the given configuration.

- `log(message: string, data?: any, level?: LogLevel = 'info', type?: LogType = 'custom', category?: string): void`
  Sends a custom log message.
  `level` can be `'info'`, `'warn'`, `'error'`, `'debug'.

- `info(message: string, data?: any): void`
  Shortcut for `log(message, data, 'info')`.

- `warn(message: string, data?: any): void`
  Shortcut for `log(message, data, 'warn')`.

- `error(errorObj: Error | string, extraData?: Record<string, any>): void`
  Reports an error. `errorObj` can be an Error object or a string.

- `track(eventName: string, data?: Record<string, any>): void`
  Tracks a custom user behavior event.

- `setUser(id?: string, details?: Record<string, any>): void`
  Sets or updates the current user's information.

- `clearUser(): void`
  Clears the current user's information.

- `addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void`
  Manually adds a breadcrumb.

- `getBreadcrumbs(): ReadonlyArray<Breadcrumb>`
  Retrieves the current list of breadcrumbs.

- `clearBreadcrumbs(): void`
  Clears all stored breadcrumbs.

- `forceFlush(): void`
  Manually triggers sending any queued logs.

## Log Structure (Example)

Logs sent to the backend will generally follow this structure (actual fields may vary by log type):

```json
{
  "timestamp": 1678886400000,
  "sdkVersion": "__SDK_VERSION__",
  "appId": "YOUR_APP_ID",
  "userId": "user-12345",
  "sessionId": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  "pageUrl": "https://example.com/some-page",
  "level": "error",
  "type": "error",
  "category": "js", // e.g., 'js', 'resource', 'promise', 'manual', 'web-vitals', 'click'
  "data": {
    // Type-specific data
    "message": "Uncaught TypeError: Cannot read property 'foo' of undefined",
    "source": "https://example.com/static/js/main.chunk.js",
    "lineno": 123,
    "colno": 45,
    "stack": "TypeError: Cannot read property...\n    at foo (https://example.com/...)"
  },
  "deviceInfo": { // Optional, if sendDeviceInfoWithLogs is true or for dedicated device_info log
    "userAgent": "Mozilla/5.0 (...)",
    "platform": "MacIntel",
    "language": "en-US",
    "screenWidth": 1920,
    "screenHeight": 1080,
    "network": "4g"
  },
  "breadcrumbs": [
    { "type": "navigation", "message": "Navigated to /some-page", "timestamp": ... },
    { "type": "click", "message": "Clicked on button#submit", "timestamp": ... }
  ]
}
```

## Development

- Clone the repository.
- Install dependencies: `npm install`
- Build the SDK: `npm run build`
- Run tests: `npm run test`
- Lint code: `npm run lint`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
