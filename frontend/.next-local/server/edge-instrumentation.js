// runtime can't be in strict mode because a global variable is assign and maybe created.
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["instrumentation"],{

/***/ "(instrument)/./src/instrumentation.ts":
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n/**\n * Exécuté une fois au démarrage du serveur Node (Next).\n * Évite `ReferenceError: self is not defined` si une dépendance bundle côté serveur\n * attend l’API navigateur (ex. chunk `vendors.js` au `next build`).\n */ function register() {\n    if (true) return;\n    const g = globalThis;\n    if (typeof g.self === \"undefined\") {\n        g.self = globalThis;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2luc3RydW1lbnRhdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Q0FJQyxHQUNNLFNBQVNBO0lBQ2QsSUFBSUMsSUFBNkIsRUFBVTtJQUMzQyxNQUFNRyxJQUFJQztJQUNWLElBQUksT0FBT0QsRUFBRUUsSUFBSSxLQUFLLGFBQWE7UUFDakNGLEVBQUVFLElBQUksR0FBR0Q7SUFDWDtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL3NyYy9pbnN0cnVtZW50YXRpb24udHM/NGZhYiJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEV4w6ljdXTDqSB1bmUgZm9pcyBhdSBkw6ltYXJyYWdlIGR1IHNlcnZldXIgTm9kZSAoTmV4dCkuXG4gKiDDiXZpdGUgYFJlZmVyZW5jZUVycm9yOiBzZWxmIGlzIG5vdCBkZWZpbmVkYCBzaSB1bmUgZMOpcGVuZGFuY2UgYnVuZGxlIGPDtHTDqSBzZXJ2ZXVyXG4gKiBhdHRlbmQgbOKAmUFQSSBuYXZpZ2F0ZXVyIChleC4gY2h1bmsgYHZlbmRvcnMuanNgIGF1IGBuZXh0IGJ1aWxkYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlcigpIHtcbiAgaWYgKHByb2Nlc3MuZW52Lk5FWFRfUlVOVElNRSAhPT0gJ25vZGVqcycpIHJldHVybjtcbiAgY29uc3QgZyA9IGdsb2JhbFRoaXMgYXMgdHlwZW9mIGdsb2JhbFRoaXMgJiB7IHNlbGY/OiBXaW5kb3cgJiB0eXBlb2YgZ2xvYmFsVGhpcyB9O1xuICBpZiAodHlwZW9mIGcuc2VsZiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBnLnNlbGYgPSBnbG9iYWxUaGlzIGFzIHVua25vd24gYXMgV2luZG93ICYgdHlwZW9mIGdsb2JhbFRoaXM7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJyZWdpc3RlciIsInByb2Nlc3MiLCJlbnYiLCJORVhUX1JVTlRJTUUiLCJnIiwiZ2xvYmFsVGhpcyIsInNlbGYiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(instrument)/./src/instrumentation.ts\n");

/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__("(instrument)/./src/instrumentation.ts"));
/******/ (_ENTRIES = typeof _ENTRIES === "undefined" ? {} : _ENTRIES).middleware_instrumentation = __webpack_exports__;
/******/ }
]);