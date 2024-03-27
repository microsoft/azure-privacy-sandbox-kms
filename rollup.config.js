// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: {
    dir: "dist/src",
    format: "es",
    preserveModules: true,
    preserveModulesRoot: "src",
  },
  plugins: [nodeResolve(), typescript(), commonjs()],
  onwarn: function (warning, rollupWarn) {
    if (warning.code !== "THIS_IS_UNDEFINED") {
      rollupWarn(warning);
    }
  },
};
