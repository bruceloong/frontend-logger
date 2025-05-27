const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/index.ts",
  target: "web",
  experiments: {
    outputModule: true,
  },
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
                  modules: false, // 保持ES模块
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
    filename: "index.js",
    path: path.resolve(__dirname, "dist/esm"),
    library: {
      type: "module",
    },
    clean: false,
  },
  externals: {
    // 如果有外部依赖，在这里声明
  },
  devtool: "source-map",
};
