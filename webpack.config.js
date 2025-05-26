const path = require("path");

module.exports = {
  mode: "production", // 'development' or 'production'
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "babel-loader", // Using babel-loader to transpile TS and JS
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "index.js", // For CommonJS/Node a single file is fine
    path: path.resolve(__dirname, "dist"),
    library: "FrontendLoggerSDK", // Global variable name for UMD build
    libraryTarget: "umd", // Universal Module Definition
    globalObject: "this", // To make UMD build work in Node and browser
    clean: true, // Clean the output directory before emit.
  },
  // For multiple outputs (e.g., ESM, CJS)
  // optimization: {
  //   minimize: true, // Ensure this is true for production builds
  // },
  // experiments: {
  //   outputModule: true, // For ESM output if desired
  // },
  // output: [
  //   {
  //     format: "umd",
  //     filename: 'index.umd.js',
  //     libraryTarget: 'umd',
  //     globalObject: 'this',
  //     path: path.resolve(__dirname, 'dist'),
  //   },
  //   {
  //     format: "esm",
  //     filename: 'index.esm.js',
  //     libraryTarget: 'module',
  //     path: path.resolve(__dirname, 'dist'),
  //   }
  // ],
  devtool: "source-map", // For better debugging
};
