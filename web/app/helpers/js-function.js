import { helper } from '@ember/component/helper';

/**
 * Helper to reference a JavaScript function by name string
 * 
 * Usage: {{js-function "window.functionName"}}
 * 
 * @param {Array<string>} params - The function name to reference
 * @returns {Function} - A wrapper function that will call the named function
 */
export default helper(function jsFunction([funcName]) {
  return function(...args) {
    const path = funcName.split('.');
    let obj = window;
    
    // Navigate the object path
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]];
      if (!obj) return undefined;
    }
    
    const func = obj[path[path.length - 1]];
    if (typeof func === 'function') {
      return func.apply(obj, args);
    }
    
    return undefined;
  };
});
