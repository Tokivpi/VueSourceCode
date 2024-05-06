import babel from "rollup-plugin-babel";
import resolve from "@rollup/plugin-node-resolve"

export default {
  input: "./src/index.js",
  output: {
    file: "./dist/vue.js",
    name: "Vue",
    format: "umd",
    sourcemap: true
  },
  plugins: [
    babel({
      exclude: 'node_modules/**'//排数node-modules所有文件
    }),
    resolve()
  ]
}