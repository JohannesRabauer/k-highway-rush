/* ============================================================
   Loads one of the game's browser-global modules (js/tracks.js,
   js/traffic.js, ...) under plain Node.js for automated testing.

   These files are written for the browser: they declare
   `const Foo = (() => { ... })();` at the top level and expect
   dependencies (THREE, Cars, Tracks, Audio, ...) as bare global
   identifiers rather than CommonJS imports. We evaluate the file
   source inside a `new Function(...)` whose parameter names match
   those globals, so the existing code runs unmodified.
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @param {string} relativeJsPath e.g. 'js/tracks.js'
 * @param {string} exportName e.g. 'Tracks'
 * @param {Object} globals map of identifier -> value made available
 *   inside the module's source as if they were globals.
 */
function loadBrowserModule(relativeJsPath, exportName, globals = {}) {
  const filePath = path.join(__dirname, '..', relativeJsPath);
  const source = fs.readFileSync(filePath, 'utf8');
  const paramNames = Object.keys(globals);
  const paramValues = paramNames.map(k => globals[k]);
  // eslint-disable-next-line no-new-func
  const factory = new Function(...paramNames, `${source}\nreturn ${exportName};`);
  return factory(...paramValues);
}

module.exports = { loadBrowserModule };
