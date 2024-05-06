import Dep, { popTarget, pushTarget } from "./dep";

let id = 0;

//每个属性有一个dep（属性就是被观察者），watcher就是观察者（属性变化了会通知观察者来更新）->观察者模式
class Watcher {
  // exprOrFn 可能是字符串(watch监控时调用Watcher) cb ：watch监控data属性变化时所触发的函数
  constructor(vm, exprOrFn, options, cb) {
    // +++++++++++++生命周期+++++++++++++++++
    // callHook(vm,'beforeUpdate')
    // +++++++++++++生命周期+++++++++++++++++

    this.id = id++;
    this.renderWatcher = options; //渲染Watcher
    if (typeof exprOrFn === "string") {
      this.getter = function () {
        return vm[exprOrFn];
      };
    } else {
      this.getter = exprOrFn;
    }
    this.deps = []; //收集属性dep 后续实现计算属性和属性清理时使用
    this.depsId = new Set(); //Set函数 方便去重
    this.lazy = options.lazy;
    this.cb = cb;
    this.dirty = this.lazy;
    this.vm = vm;
    this.user = options.user; //标识是否时用户自己的watcher
    // watch:监控 返回oldvalue
    this.value = this.lazy ? undefined : this.get();
  }

  addDep(dep) {
    let id = dep.id;
    if (!this.depsId.has(id)) {
      this.deps.push(dep);
      this.depsId.add(id);
      dep.addSub(this);
    }
  }

  evaluate() {
    this.value = this.get(); //获取到用户函数的返回值并且标识为脏值
    this.dirty = false;
  }

  get() {
    pushTarget(this);
    // 计算属性需要return的原因：返回计算属性
    let value = this.getter.call(this.vm);
    popTarget();
    return value; //计算属性返回值
  }

  depend() {
    let i = this.deps.length;
    while (i--) {
      this.deps[i].depend(); //让计算属性watcher 也收集渲染watcher
    }
  }

  update() {
    if (this.lazy) {
      // 如果是计算属性 依赖的值变化了 就标识计算属性是脏值了
      this.dirty = true;
    } else {
      queueWatcher(this);
    }
  }

  run() {
    let oldValue = this.value;
    let newValue = this.get();
    if (this.user) {
      this.cb.call(this.vm, newValue, oldValue);
    }

    // +++++++++++++生命周期+++++++++++++++++
    // callHook(vm,'updated')
    // +++++++++++++生命周期+++++++++++++++++
  }
}

let queue = [];
let has = {};
let pending = false;

function flushSchedulerQueue() {
  let flushQueue = queue.slice(0);
  queue = [];
  has = {};
  pending = false;
  flushQueue.forEach((q) => q.run());
}

function queueWatcher(watcher) {
  const id = watcher.id;
  if (!has[id]) {
    queue.push(watcher);
    has[id] = true;
    if (!pending) {
      nextTick(flushSchedulerQueue, 0);
      pending = true;
    }
  }
}

let callbacks = [];
let waiting = false;

function flushCallbacks() {
  let cbs = callbacks.slice(0);
  waiting = false;
  callbacks = [];
  cbs.forEach((cb) => cb());
}

// nextTick的目的不是创建一个异步任务，而是将这个任务维护到了队列而已
export function nextTick(cb) {
  callbacks.push(cb);
  if (!waiting) {
    timerFunc();
    waiting = true;
  }
}

let timerFunc; // 用来保存调用异步任务方法
// 判断1：是否原生支持Promise
if (typeof Promise !== "undefined") {
  // 保存一个异步任务
  const p = Promise.resolve();
  timerFunc = () => {
    // 执行回调函数
    p.then(flushCallbacks);
  };
} else if (
  typeof MutationObserver !== "undefined" ||
  MutationObserver.toString() === "[objectMutationObserverConstructor]"
) {
  // 判断2：是否原生支持MutationObserver
  let counter = 1;
  const observer = new MutationObserver(flushCallbacks);
  const textNode = document.createTextNode(String(counter));
  observer.observe(textNode, {
    characterData: true,
  });
  timerFunc = () => {
    counter = (counter + 1) % 2;
    textNode.data = String(counter);
  };
} else if (typeof setImmediate !== "undefined") {
  //判断3：是否原生支持setImmediat
  timerFunc = () => {
    setImmediate(flushCallbacks);
  };
} else {
  //判断4：上面都不行，直接用setTimeout
  timerFunc = () => {
    setTimeout(flushCallbacks, 0);
  };
}

export default Watcher;
