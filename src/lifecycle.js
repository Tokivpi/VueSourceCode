import { createElementVNode, createTextVNode } from "./vdom";
import Watcher from "./observe/watcher";
import { patch } from "./vdom/patch";

export function initLifeCycle(Vue) {
  Vue.prototype._update = function (vnode) {
    // vnode:虚拟DOM;el:真实DOM
    const vm = this;
    const el = vm.$el;
    const prevVnode = vm._vnode;
    vm._vnode = vnode;
    if (prevVnode) {
      vm.$el = patch(prevVnode, vnode);
    } else {
      vm.$el = patch(el, vnode);
    }
  };
  Vue.prototype._c = function () {
    return createElementVNode(this, ...arguments);
  };
  Vue.prototype._v = function () {
    return createTextVNode(this, ...arguments);
  };

  /*
  为什么_s返回的value是data中的数据?
    with(vm){return _v(_s(name)+"hello"+_s(age)+"hello"))} 访问到vm.name时会触发Object.defineProperty数据代理进而触发get函数返回value值
 */
  Vue.prototype._s = function (value) {
    if (typeof value !== "object") return value;
    return JSON.stringify(value);
  };
  Vue.prototype._render = function () {
    return this.$options.render.call(this);
  };
}

export function mountComponent(vm, el) {
  vm.$el = el;

  // +++++++++++++生命周期+++++++++++++++++
  // callHook(vm,'beforeMount')
  // +++++++++++++生命周期+++++++++++++++++

  const updateComponent = () => {
    // _update:虚拟节点渲染成真实节点
    // _render:解析DOM节点渲染成虚拟节点
    vm._update(vm._render());
  };
  const watcher = new Watcher(vm, updateComponent, true); //true标识的是一个渲染Watcher

  // +++++++++++++生命周期+++++++++++++++++
  // callHook(vm,'mounted')
  // +++++++++++++生命周期+++++++++++++++++
}

export function callHook(vm, hook) {
  const handlers = vm.$options[hook];
  if (handlers) {
    handlers.forEach((handler) => handler.call(vm));
  }
}
