// 判断是否为自定义标签
const isReservedTagg = (tag) => {
  return ["a", "div", "p", "button", "ul", "li", "span"].includes(tag);
};
// _c
export function createElementVNode(vm, tag, data, ...children) {
  if (data === null) {
    data = {};
  }
  let key = data.key;
  if (key) {
    delete data.key;
  }
  // 元素标签
  if (isReservedTagg(tag)) {
    return vnode(vm, tag, key, data, children);
  } else {
    // 自定义标签
    let Ctor = vm.$options.components[tag];

    return createComponentVnode(vm, tag, key, data, children, Ctor);
  }
}
function createComponentVnode(vm, tag, key, data, children, Ctor) {
  if (typeof Ctor === "object") {
    Ctor = vm.$options._base.extend(Ctor);
  }

  data.hook = {
    //稍候创造真实节点的时候，如果是组件则调用此init方法
    init(vnode) {
      let instance = (vnode.componentInstance =
        new vnode.componentOptions.Ctor()); //创建组件实例(new Sub())
      // instance就是组件实例对象
      // +++++++++++++++++++++++++++++++++++
      // +++++++++++++++++++++++++++++++++++
      // 组件挂载
      // +++++++++++++++++++++++++++++++++++
      // +++++++++++++++++++++++++++++++++++
      instance.$mount();
    },
  };

  return vnode(vm, tag, key, data, children, null, { Ctor });
}
//_v
export function createTextVNode(vm, text) {
  return vnode(vm, undefined, undefined, undefined, undefined, text);
}

function vnode(vm, tag, key, data, children, text, componentOptions) {
  return {
    vm,
    tag,
    key,
    data,
    children,
    text,
    componentOptions,
  };
}

export function isSameVnode(oldVnode, newVnode) {
  return oldVnode.tag === newVnode.tag && oldVnode.key === newVnode.key;
}
