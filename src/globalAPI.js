import { mergeOptions } from "./utils";

export function initGlobalAPI(Vue) {
  Vue.options = {
    _base: Vue,
  };
  // mixin 运用了策略模式和发布订阅模式
  Vue.mixin = function (mixin) {
    this.options = mergeOptions(this.options, mixin);
    return this;
  };
  // 创建组件
  Vue.extend = function (options) {
    function Sub(options = {}) {
      this._init(options);
    }
    Sub.prototype = Object.create(Vue.prototype); //Sub.prototype.__proto__===Vue.prototype
    Sub.prototype.constructor = Sub;
    // 组件的options会和更组件进行整合，这也就是全局mixin的实现原理
    Sub.options = mergeOptions(Vue.options, options);
    return Sub;
  };
  //全局组件
  Vue.options.components = {}; //全局的指令 Vue.options.directives
  Vue.component = function (id, definition) {
    definition =
      typeof definition === "function" ? definition : Vue.extend(definition);
    Vue.options.components[id] = definition;
  };
}
