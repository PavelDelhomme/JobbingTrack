"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "(instrument)/./src/instrumentation.ts":
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n/**\n * Exécuté une fois au démarrage du serveur Node (Next).\n * Évite `ReferenceError: self is not defined` si une dépendance bundle côté serveur\n * attend l’API navigateur (ex. chunk `vendors.js` au `next build`).\n */ function register() {\n    if (false) {}\n    const g = globalThis;\n    if (typeof g.self === \"undefined\") {\n        g.self = g;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2luc3RydW1lbnRhdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Q0FJQyxHQUNNLFNBQVNBO0lBQ2QsSUFBSUMsS0FBNkIsRUFBVSxFQUFPO0lBQ2xELE1BQU1HLElBQUlDO0lBQ1YsSUFBSSxPQUFPRCxFQUFFRSxJQUFJLEtBQUssYUFBYTtRQUNqQ0YsRUFBRUUsSUFBSSxHQUFHRjtJQUNYO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9qb2JiaW5ndHJhY2stZnJvbnRlbmQvLi9zcmMvaW5zdHJ1bWVudGF0aW9uLnRzPzRmYWIiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBFeMOpY3V0w6kgdW5lIGZvaXMgYXUgZMOpbWFycmFnZSBkdSBzZXJ2ZXVyIE5vZGUgKE5leHQpLlxuICogw4l2aXRlIGBSZWZlcmVuY2VFcnJvcjogc2VsZiBpcyBub3QgZGVmaW5lZGAgc2kgdW5lIGTDqXBlbmRhbmNlIGJ1bmRsZSBjw7R0w6kgc2VydmV1clxuICogYXR0ZW5kIGzigJlBUEkgbmF2aWdhdGV1ciAoZXguIGNodW5rIGB2ZW5kb3JzLmpzYCBhdSBgbmV4dCBidWlsZGApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXIoKSB7XG4gIGlmIChwcm9jZXNzLmVudi5ORVhUX1JVTlRJTUUgIT09ICdub2RlanMnKSByZXR1cm47XG4gIGNvbnN0IGcgPSBnbG9iYWxUaGlzIGFzIHR5cGVvZiBnbG9iYWxUaGlzICYgeyBzZWxmPzogdHlwZW9mIGdsb2JhbFRoaXMgfTtcbiAgaWYgKHR5cGVvZiBnLnNlbGYgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgZy5zZWxmID0gZztcbiAgfVxufVxuIl0sIm5hbWVzIjpbInJlZ2lzdGVyIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUlVOVElNRSIsImciLCJnbG9iYWxUaGlzIiwic2VsZiJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(instrument)/./src/instrumentation.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(instrument)/./src/instrumentation.ts"));
module.exports = __webpack_exports__;

})();