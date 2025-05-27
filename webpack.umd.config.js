const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/index.ts",
  target: "web",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    browsers: [
                      "> 1%",
                      "last 2 versions",
                      "not dead",
                      "not ie <= 11",
                    ],
                  },
                },
              ],
              "@babel/preset-typescript",
            ],
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "frontend-logger-sdk.min.js",
    path: path.resolve(__dirname, "dist/umd"),
    library: {
      name: "FrontendLoggerSDK",
      type: "umd",
      export: "default",
    },
    globalObject: "this",
    clean: false,
  },
  externals: {
    // 如果有外部依赖，在这里声明
  },
  devtool: "source-map",
};
