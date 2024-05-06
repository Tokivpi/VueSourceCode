import { initState } from "./state";
import { compileToFunction } from "./compiler";
import { callHook, mountComponent } from "./lifecycle";
import { mergeOptions } from "./utils";

export function initMixin(Vue) {
  Vue.prototype._init = function (options) {
    // vm是实例对象
    const vm = this;
    // vm.$options=Vue.options
    vm.$options = mergeOptions(this.constructor.options, options); //将用户的选项挂载到实例上

    // +++++++++++++生命周期+++++++++++++++++
    // callHook(vm,'beforeCreate')
    // +++++++++++++生命周期+++++++++++++++++

    callHook(vm, "beforeCreate");
    // 初始化数据并未将数据渲染到视图中,初始化计算属性，初始化watch
    initState(vm);

    // +++++++++++++生命周期+++++++++++++++++
    // callHook(vm,'created')
    // +++++++++++++生命周期+++++++++++++++++

    callHook(vm, "created");

    if (options.el) {
      vm.$mount(options.el);
    }
  };
  Vue.prototype.$mount = function (el) {
    const vm = this;
    el = document.querySelector(el);
    if (!vm.$options.render) {
      let template;
      if (!vm.$options.template && el) {
        template = el.outerHTML;
      } else {
        template = vm.$options.template;
      }
      if (template) {
        const render = compileToFunction(template);
        vm.$options.render = render;
      }
    }
    mountComponent(vm, el); //组件的挂载
    // vm.$options.render;
  };
}
