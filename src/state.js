import { observe } from "./observe";
import Watcher, { nextTick } from "./observe/watcher";
import watcher from "./observe/watcher";
import Dep from "./observe/dep";
import Vue from "./index";

export function initState(vm) {
  const options = vm.$options;
  // 初始化data数据并对data中的数据进行数据劫持
  if (options.data) {
    initData(vm);
  }
  //初始化计算属性
  if (options.computed) {
    initComputed(vm);
  }
  //初始化watch
  if (options.watch) {
    initWatch(vm);
  }
}

function initWatch(vm) {
  let watch = vm.$options.watch;
  for (let key in watch) {
    const handler = watch[key];
    console.log(Array.isArray(handler));
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, key, handler) {
  // 传递来的handler 要么是字符串要么是函数
  if (typeof handler === "string") {
    handler = vm[handler];
  }
  return vm.$watch(key, handler);
}

// proxy 语法糖 本来取data中的数据需要vm._data.属 性，代理后只需vm.属性
function proxy(vm, target, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[target][key];
    },
    set(newValue) {
      vm[target][key] = newValue;
    },
  });
}

function initData(vm) {
  // data可能是函数或对象
  let data = vm.$options.data;
  data = typeof data === "function" ? data.call(vm) : data;
  vm._data = data;
  //数据劫持
  observe(data);
  for (let key in data) {
    proxy(vm, "_data", key);
  }
}

function initComputed(vm) {
  const computed = vm.$options.computed;
  const watchers = (vm._computedWatchers = {});
  for (let key in computed) {
    let userDef = computed[key];

    let fn = typeof userDef === "function" ? userDef : userDef.get;
    //如果直接new Watcher默认就会执行fn 添加{lazy：true}标识fn不立即执行,将属性和watcher对应起来
    watchers[key] = new Watcher(vm, fn, { lazy: true });
    defineComputed(vm, key, userDef);
  }
}

function defineComputed(target, key, userDef) {
  // target:vm;key:computed的属性值
  // const getter = typeof userDef === "function" ? userDef : userDef.get;
  const setter = userDef.set || (() => {});

  Object.defineProperty(target, key, {
    get: createComputedGetter(key),
    set: setter,
  });
}

// 计算属性根本不会收集依赖，只会让自己的依赖属性去收集依赖
function createComputedGetter(key) {
  return function () {
    const watcher = this._computedWatchers[key]; //获取对应属性的watcher
    if (watcher.dirty) {
      //   如果是脏值 就去执行
      watcher.evaluate();
    }
    // 计算属性出栈后，还有渲染watcher，计算属性watcher出栈后，也要去收集上一层watcher(渲染watcher)
    if (Dep.target) {
      watcher.depend();
    }
    return watcher.value;
  };
}
export function initStateMixin(Vue) {
  // exprOrFn：传递过来的key也就是watch里面的属性名，cb：观察的属性值发生改变所执行的函数
  Vue.prototype.$watch = function (exprOrFn, cb) {
    new Watcher(this, exprOrFn, { user: true }, cb);
  };
  Vue.prototype.$nextTick = nextTick;
}
