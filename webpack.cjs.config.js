const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/index.ts",
  target: "node",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { targets: { node: "14" } }],
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
    path: path.resolve(__dirname, "dist/cjs"),
    library: {
      type: "commonjs2",
    },
    clean: false,
  },
  externals: {
    // 如果有外部依赖，在这里声明
  },
  devtool: "source-map",
};
