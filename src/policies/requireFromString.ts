export const requireFromString = (code: string, filename: string = ''): any => {
    const module = { exports: {} };
    const context = { module, exports: module.exports };
    const wrappedCode = `(function (exports, require, module, __filename, __dirname) {
      ${code}
    });`;
    const compiled = eval(wrappedCode);
    const defaultRequire = () => ({});
    compiled.call(module.exports, module.exports, defaultRequire, module, filename, '');
    return module.exports;
  }