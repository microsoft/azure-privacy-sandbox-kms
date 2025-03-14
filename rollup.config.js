// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: {
    dir: "dist/src",
    format: "es",
    preserveModules: true,
    preserveModulesRoot: "src",
  },
  plugins: [
    nodeResolve(),
    typescript()
  ],
};
