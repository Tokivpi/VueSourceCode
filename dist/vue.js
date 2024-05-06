(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

  let oldArrayProto = Array.prototype;
  let newArrayProto = Object.create(oldArrayProto);
  let methods = ["push", "pop", "shift", "unshift", "reverse", "sort", "splice"];
  methods.forEach(method => {
    newArrayProto[method] = function (...args) {
      const result = oldArrayProto[method].call(this, ...args);
      let inserted;
      let ob = this.__ob__;
      switch (method) {
        case "push":
        case "unshift":
          inserted = args;
          break;
        case "splice":
          inserted = args.slice(2);
          break;
      }
      if (inserted) {
        ob.observeArray(inserted);
      }

      // 更新
      ob.dep.notify();
      return result;
    };
  });

  let id$1 = 0;

  //每个属性有一个dep（属性就是被观察者），watcher就是观察者（属性变化了会通知观察者来更新）->观察者模式
  class Watcher {
    // exprOrFn 可能是字符串(watch监控时调用Watcher) cb ：watch监控data属性变化时所触发的函数
    constructor(vm, exprOrFn, options, cb) {
      // +++++++++++++生命周期+++++++++++++++++
      // callHook(vm,'beforeUpdate')
      // +++++++++++++生命周期+++++++++++++++++

      this.id = id$1++;
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
    flushQueue.forEach(q => q.run());
  }
  function queueWatcher(watcher) {
    const id = watcher.id;
    if (!has[id]) {
      queue.push(watcher);
      has[id] = true;
      if (!pending) {
        nextTick(flushSchedulerQueue);
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
    cbs.forEach(cb => cb());
  }

  // nextTick的目的不是创建一个异步任务，而是将这个任务维护到了队列而已
  function nextTick(cb) {
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
  } else if (typeof MutationObserver !== "undefined" || MutationObserver.toString() === "[objectMutationObserverConstructor]") {
    // 判断2：是否原生支持MutationObserver
    let counter = 1;
    const observer = new MutationObserver(flushCallbacks);
    const textNode = document.createTextNode(String(counter));
    observer.observe(textNode, {
      characterData: true
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

  let id = 0;
  class Dep {
    constructor() {
      this.id = id++; //属性的dep要收集watcher
      this.subs = []; //这里存放着当前属性对应的watcher有哪些
    }

    depend() {
      // 移除this.subs.push(Dep.target)的原因：防止收集重复的watcher，可以在watcher类中进行去重操作

      // Dep.target就是watcher的实例对象
      Dep.target.addDep(this); //让watcher收集dep
    }

    // 添加watcher实例对象
    addSub(watcher) {
      this.subs.push(watcher);
    }
    notify() {
      this.subs.forEach(watcher => watcher.update());
    }
  }
  Dep.target = null;
  let stack = [];
  function pushTarget(watcher) {
    stack.push(watcher);
    Dep.target = watcher;
  }
  function popTarget() {
    stack.pop();
    // Dep.target指向null
    Dep.target = stack[stack.length - 1];
  }

  class Observe {
    constructor(data) {
      // 给每个对象都增加收集功能
      this.dep = new Dep();

      // 方便array.js文件中调用observeArray方法
      Object.defineProperty(data, "__ob__", {
        value: this,
        enumerable: false //将__ob__变成不可枚举（循环的时候无法获取到）
      });

      if (Array.isArray(data)) {
        // 重写数组中的方法 7个变异方法 是可以修改数组本身的
        data.__proto__ = newArrayProto;
        this.observeArray(data);
      } else {
        this.walk(data);
      }
    }

    // 遍历data中的数据并对所有的属性进行劫持
    walk(data) {
      Object.keys(data).forEach(key => defineReactive(data, key, data[key]));
    }

    // 观测数组
    observeArray(data) {
      // 对数组中存在对象进行数据劫持
      data.forEach(item => observe(item));
    }
  }
  function dependArray(value) {
    for (let i = 0; i < value.length; i++) {
      let current = value[i];
      current.__ob__ && current.__ob__.dep.depend();
      if (Array.isArray(current)) {
        dependArray(current);
      }
    }
  }

  // 属性劫持 value=data[key]也就是属性值
  function defineReactive(target, key, value) {
    let childOb = observe(value);
    let dep = new Dep(); //每一个属性对应一个dep
    Object.defineProperty(target, key, {
      get() {
        if (Dep.target) {
          dep.depend(); //属性收集当前的watcher
          if (childOb) {
            childOb.dep.depend(); //数组和对象收集当前的watcher

            //如果出现数组套数组的情况
            if (Array.isArray(value)) {
              dependArray(value);
            }
          }
        }
        return value;
      },
      set(newValue) {
        if (newValue === value) return;
        observe(newValue);
        value = newValue;
        dep.notify();
      }
    });
  }
  function observe(data) {
    // 传递过来的data必须是对象
    if (typeof data !== "object" || data == null) {
      return;
    }
    // 如果data中存在__ob__属性 说明这个对象被代理过了
    if (data.__ob__ instanceof Observe) {
      return data.__ob__;
    }
    // 如果一个对象被劫持过了，那就不需要再被劫持了（要判断一个对象是否被劫持过，可以增添一个实例，用实例来判断是否被劫持过）
    return new Observe(data);
  }

  function initState(vm) {
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
      }
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
    const watchers = vm._computedWatchers = {};
    for (let key in computed) {
      let userDef = computed[key];
      let fn = typeof userDef === "function" ? userDef : userDef.get;
      //如果直接new Watcher默认就会执行fn 添加{lazy：true}标识fn不立即执行,将属性和watcher对应起来
      watchers[key] = new Watcher(vm, fn, {
        lazy: true
      });
      defineComputed(vm, key, userDef);
    }
  }
  function defineComputed(target, key, userDef) {
    // target:vm;key:computed的属性值
    // const getter = typeof userDef === "function" ? userDef : userDef.get;
    const setter = userDef.set || (() => {});
    Object.defineProperty(target, key, {
      get: createComputedGetter(key),
      set: setter
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
  function initStateMixin(Vue) {
    // exprOrFn：传递过来的key也就是watch里面的属性名，cb：观察的属性值发生改变所执行的函数
    Vue.prototype.$watch = function (exprOrFn, cb) {
      new Watcher(this, exprOrFn, {
        user: true
      }, cb);
    };
    Vue.prototype.$nextTick = nextTick;
  }

  const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`;
  const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
  const startTagOpen = new RegExp(`^<${qnameCapture}`); //匹配到的是一个开始标签名
  const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); //匹配到的是一个结束标签
  const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; //匹配属性
  const startTagClose = /^\s*(\/?)>/; // <br/>

  function parseHTML(html) {
    const ELEMENT_TYPE = 1;
    const TEXT_TYPE = 3;
    const stack = []; //用于存放元素的
    let currentParent; //指向的是栈中的最后一个
    let root;
    function createASTElement(tag, attrs) {
      return {
        tag,
        type: ELEMENT_TYPE,
        children: [],
        attrs,
        parent: null
      };
    }
    function start(tag, attrs) {
      let node = createASTElement(tag, attrs);
      if (!root) {
        root = node;
      }
      if (currentParent) {
        node.parent = currentParent;
        currentParent.children.push(node);
      }
      stack.push(node);
      currentParent = node;
    }
    function chars(text) {
      text = text.replace(/\s/g, "");
      text && currentParent.children.push({
        type: TEXT_TYPE,
        text,
        parent: currentParent
      });
    }
    function end(tag) {
      stack.pop();
      currentParent = stack[stack.length - 1];
    }
    function advance(n) {
      html = html.substring(n);
    }

    // 解析开始标签
    function parseStartTag() {
      const start = html.match(startTagOpen);
      if (start) {
        const match = {
          tagName: start[1],
          //标签名
          attrs: []
        };
        advance(start[0].length);
        let attr, end;
        while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
          advance(attr[0].length);
          match.attrs.push({
            name: attr[1],
            value: attr[3] || attr[4] || attr[5] || true
          });
        }
        if (end) {
          advance(end[0].length);
        }
        return match;
      }
      return false;
    }
    while (html) {
      let textEnd = html.indexOf("<");
      if (textEnd === 0) {
        const startTagMatch = parseStartTag();
        if (startTagMatch) {
          start(startTagMatch.tagName, startTagMatch.attrs);
          continue;
        }
        let endTagMatch = html.match(endTag);
        if (endTagMatch) {
          advance(endTagMatch[0].length);
          end(endTagMatch[1]);
          continue;
        }
      }
      if (textEnd > 0) {
        let text = html.substring(0, textEnd);
        if (text) {
          chars(text);
          advance(text.length);
        }
      }
    }
    return root;
  }

  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; //匹配到的内容就是我们表达式的变量
  function genProps(attrs) {
    let str = "";
    for (let i = 0; i < attrs.length; i++) {
      let attr = attrs[i];
      if (attr.name === "style") {
        let obj = {};
        attr.value.split(";").forEach(item => {
          let [key, value] = item.split(":");
          obj[key] = value;
        });
        attr.value = obj;
      }
      str += `${attr.name}:${JSON.stringify(attr.value)},`;
    }
    return `{${str.slice(0, -1)}}`;
  }
  function gen(node) {
    if (node.type === 1) {
      return codegen(node);
    } else {
      let text = node.text;
      if (!defaultTagRE.test(text)) {
        return `_v(${JSON.stringify(text)})`;
      } else {
        let tokens = [];
        let match;
        defaultTagRE.lastIndex = 0;
        let lastIndex = 0;
        while (match = defaultTagRE.exec(text)) {
          let index = match.index;
          if (index > lastIndex) {
            tokens.push(JSON.stringify(text.slice(lastIndex, index)));
          }
          tokens.push(`_s(${match[1].trim()})`);
          lastIndex = index + match[0].length;
        }
        if (lastIndex < text.length) {
          tokens.push(JSON.stringify(text.slice(lastIndex)));
        }
        return `_v(${tokens.join("+")})`;
      }
    }
  }
  function genChildren(children) {
    if (children) {
      return children.map(child => gen(child)).join(",");
    }
  }
  function codegen(ast) {
    let children = genChildren(ast.children);
    let code = `_c('${ast.tag}',${ast.attrs.length > 0 ? genProps(ast.attrs) : "null"}${ast.children.length ? `,${children}` : ""})`;
    return code;
  }
  function compileToFunction(template) {
    let ast = parseHTML(template);
    let code = codegen(ast);
    code = `with(this){return ${code}}`;
    let render = new Function(code);
    return render;
  }

  // 判断是否为自定义标签
  const isReservedTagg = tag => {
    return ["a", "div", "p", "button", "ul", "li", "span"].includes(tag);
  };
  // _c
  function createElementVNode(vm, tag, data, ...children) {
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
        let instance = vnode.componentInstance = new vnode.componentOptions.Ctor(); //创建组件实例(new Sub())
        // instance就是组件实例对象
        // +++++++++++++++++++++++++++++++++++
        // +++++++++++++++++++++++++++++++++++
        // 组件挂载
        // +++++++++++++++++++++++++++++++++++
        // +++++++++++++++++++++++++++++++++++
        instance.$mount();
      }
    };
    return vnode(vm, tag, key, data, children, null, {
      Ctor
    });
  }
  //_v
  function createTextVNode(vm, text) {
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
      componentOptions
    };
  }
  function isSameVnode(oldVnode, newVnode) {
    return oldVnode.tag === newVnode.tag && oldVnode.key === newVnode.key;
  }

  function createComponent(vnode) {
    let i = vnode.data;
    if ((i = i.hook) && (i = i.init)) {
      i(vnode);
    }
    if (vnode.componentInstance) {
      return true; //说明是组件
    }
  }

  // 将虚拟节点渲染成真实DOM
  function createElm(vnode) {
    let {
      tag,
      data,
      children,
      text
    } = vnode;
    if (typeof tag === "string") {
      // 创建真实元素 也要区分是组件还是元素
      if (createComponent(vnode)) {
        return vnode.componentInstance.$el;
      }

      // 将真实节点和虚拟节点对应起来
      vnode.el = document.createElement(tag);
      // 给标签附上属性
      patchProps(vnode.el, {}, data);
      children.forEach(child => {
        // 会将组件创建的元素插入到父元素中
        vnode.el.appendChild(createElm(child));
      });
    } else {
      // 将文本节点的真实节点和虚拟节点对应起来
      vnode.el = document.createTextNode(text);
    }
    return vnode.el;
  }
  function patchProps(el, oldProps = {}, props = {}) {
    /*
    在进行diff算法的时候，老的标签中存在的属性，而新的标签中不存在，则要删除老的标签中的属性
    */
    let oldStyles = oldProps.style || {};
    let newStyles = props.style || {};
    for (let key in oldStyles) {
      //老的样式中有，新的没有，则删除
      if (!newStyles[key]) {
        el.style[key] = "";
      }
    }
    for (let key in props) {
      //新的样式中有，老的没有 则删除
      if (!props[key]) {
        el.removeAttribute(key);
      }
    }
    for (let key in props) {
      if (key === "style") {
        for (let styleName in props.style) {
          el.style[styleName] = props.style[styleName];
        }
      } else {
        el.setAttribute(key, props[key]);
      }
    }
  }
  function patch(oldVnode, vnode) {
    // 组件的挂载(执行组件实例.$mount()方法时并未传入el，此时el（el是真实DOM）为null，(在执行后续代码时会执行（vm.$el = patch(el, vnode);） 所以在组件初步渲染的时候oldVnode为空 ，然后直接回去渲染真实DOM并返回))
    if (!oldVnode) {
      return createElm(vnode); //vm.$el,对应的就是组件的渲染结果
    }

    const isRealElement = oldVnode.nodeType;
    if (isRealElement) {
      const elm = oldVnode;
      const parentElm = elm.parentNode;
      let newElm = createElm(vnode);
      parentElm.insertBefore(newElm, elm.nextSibling);
      parentElm.removeChild(elm);
      return newElm;
    } else {
      //   diff算法
      return patchVnode(oldVnode, vnode);
    }
  }

  // +++++++++++++++++++++++++++
  // diff算法核心 patchVnode的目的：比较属性和子节点
  // +++++++++++++++++++++++++++
  function patchVnode(oldVnode, vnode) {
    /*
       标签和属性key值：isSameVnode用来比较标签和key是否一致，若不一致，则用新节点直接替换老节点
       */
    if (!isSameVnode(oldVnode, vnode)) {
      let el = createElm(vnode);
      oldVnode.el.parentNode.replaceChild(el, oldVnode.el);
      return el;
    }

    /*
      文本：判断是否为文本节点，若是为文本节点，则直接更新
     */
    /*
       ==============关于el的指向问题===============
       el指向的就是oldVnode.el也就是真实DOM节点，在进行diff算法后返回el，最后把el覆盖掉vnode中的el节点
     */
    let el = vnode.el = oldVnode.el; //复用老节点的元素
    if (!oldVnode.tag) {
      if (oldVnode.text !== vnode.text) {
        el.textContent = vnode.text;
      }
    }
    /*
      标签中的属性：需要对比标签中的属性是否一致
     */
    patchProps(el, oldVnode.data, vnode.data);
    /*
      儿子节点：一方有儿子，一方没有儿子||两方都有儿子
     */
    let oldChildren = oldVnode.children || [];
    let newChildren = vnode.children || [];
    if (oldChildren.length > 0 && newChildren.length > 0) {
      // 新节点和节点都存来儿子的情况
      updateChildren(el, oldChildren, newChildren);
    } else if (newChildren.length > 0) {
      // 老节点不存来儿子，则新节点直接把儿子插入到真实DOM上
      mountChildren(el, newChildren);
    } else if (oldChildren.length > 0) {
      el.innerHTML = "";
    }
    return el;
  }
  function mountChildren(el, newChildren) {
    for (let i = 0; i < newChildren.length; i++) {
      let child = newChildren[i];
      el.appendChild(createElm(child));
    }
  }
  function updateChildren(el, oldChildren, newChildren) {
    let oldStartIndex = 0;
    let newStartIndex = 0;
    let oldEndIndex = oldChildren.length - 1;
    let newEndIndex = newChildren.length - 1;
    let oldStartVnode = oldChildren[0];
    let newStartVnode = newChildren[0];
    let oldEndVnode = oldChildren[oldEndIndex];
    let newEndVnode = newChildren[newEndIndex];

    // 乱序排序所需要的映射表
    function makeIndexByKey(children) {
      let map = {};
      children.forEach((child, index) => {
        map[child.key] = index;
      });
      return map;
    }
    let map = makeIndexByKey(oldChildren);
    while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
      if (!oldStartVnode) {
        oldStartVnode = oldChildren[++oldStartIndex];
      } else if (!oldEndVnode) {
        oldEndVnode = oldChildren[--oldEndIndex];
      } else if (isSameVnode(oldStartVnode, newStartVnode)) {
        // 头头对比
        patchVnode(oldStartVnode, newStartVnode);
        oldStartVnode = oldChildren[++oldStartIndex];
        newStartVnode = newChildren[++newStartIndex];
      } else if (isSameVnode(oldEndVnode, newEndVnode)) {
        //尾尾对比
        patchVnode(oldEndVnode, newEndVnode);
        oldEndVnode = oldChildren[--oldEndIndex];
        newEndVnode = newChildren[--newEndIndex];
      } else if (isSameVnode(oldEndVnode, newStartVnode)) {
        //头尾对比
        patchVnode(oldEndVnode, newStartVnode);
        // 插入到头指针的前面
        el.insertBefore(oldEndVnode.el, oldStartVnode.el);
        oldEndVnode = oldChildren[--oldEndIndex];
        newStartVnode = newChildren[++newStartIndex];
      } else if (isSameVnode(oldStartVnode, newEndVnode)) {
        // 尾头对比
        patchVnode(oldStartVnode, newEndVnode);
        // 插入到尾指针的后面
        el.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling);
        oldStartVnode = oldChildren[++oldStartIndex];
        newEndVnode = newChildren[--newEndIndex];
      } else {
        let moveIndex = map[newStartVnode.key];
        if (moveIndex !== undefined) {
          let moveVnode = oldChildren[moveIndex];
          el.insertBefore(moveVnode.el, oldStartVnode.el);
          oldChildren[moveIndex] = undefined; //不能直接删除
          patchVnode(moveVnode, newStartVnode);
        } else {
          // 在老节点中找不到新节点的情况直接在老节点中插入新节点
          el.insertBefore(createElm(newStartVnode), oldStartVnode.el);
        }
        newStartVnode = newChildren[++newStartIndex];
      }
    }
    // ++++++++++++++++++++
    // 新DOM多了 插入
    // ++++++++++++++++++++
    if (newStartIndex <= newEndIndex) {
      for (let i = newStartIndex; i <= newEndIndex; i++) {
        let childEl = createElm(newChildren[i]);
        // 新DOM可能向后追加，还有可能是向前追加
        let anchor = newChildren[newEndIndex + 1] ? newChildren[newEndIndex + 1].el : null;
        // el.appendChild(childEl);
        el.insertBefore(childEl, anchor); //anchor 为null的时候则会认为是appendChild
      }
    }
    // ++++++++++++++++++++
    // 老DOM多了 删除
    // ++++++++++++++++++++
    if (oldStartIndex <= oldEndIndex) {
      for (let i = oldStartIndex; i <= oldEndIndex; i++) {
        if (oldChildren[i]) {
          let childEl = oldChildren[i].el;
          el.removeChild(childEl);
        }
      }
    }
  }

  function initLifeCycle(Vue) {
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
  function mountComponent(vm, el) {
    vm.$el = el;

    // +++++++++++++生命周期+++++++++++++++++
    // callHook(vm,'beforeMount')
    // +++++++++++++生命周期+++++++++++++++++

    const updateComponent = () => {
      // _update:虚拟节点渲染成真实节点
      // _render:解析DOM节点渲染成虚拟节点
      vm._update(vm._render());
    };
    new Watcher(vm, updateComponent, true); //true标识的是一个渲染Watcher

    // +++++++++++++生命周期+++++++++++++++++
    // callHook(vm,'mounted')
    // +++++++++++++生命周期+++++++++++++++++
  }

  function callHook(vm, hook) {
    const handlers = vm.$options[hook];
    if (handlers) {
      handlers.forEach(handler => handler.call(vm));
    }
  }

  const strats = {};
  const LIFECYCLE = ["beforeCreate", "created"];
  LIFECYCLE.forEach(hook => {
    strats[hook] = function (p, c) {
      if (c) {
        if (p) {
          return p.concat(c);
        } else {
          return [c];
        }
      } else {
        return p;
      }
    };
  });
  strats.components = function (parentVal, childVal) {
    const res = Object.create(parentVal);
    if (childVal) {
      for (let key in childVal) {
        res[key] = childVal[key];
      }
    }
    return res;
  };
  function mergeOptions(parent, child) {
    const options = {};
    for (let key in parent) {
      mergeField(key);
    }
    for (let key in child) {
      if (!parent.hasOwnProperty(key)) {
        mergeField(key);
      }
    }
    function mergeField(key) {
      //策略模式 用策略模式减少if/else
      if (strats[key]) {
        options[key] = strats[key](parent[key], child[key]);
      } else {
        options[key] = child[key] || parent[key];
      }
    }
    return options;
  }

  function initMixin(Vue) {
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

  function initGlobalAPI(Vue) {
    Vue.options = {
      _base: Vue
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
      Sub.options = mergeOptions(Vue.options, options);
      return Sub;
    };
    //全局组件
    Vue.options.components = {}; //全局的指令 Vue.options.directives
    Vue.component = function (id, definition) {
      definition = typeof definition === "function" ? definition : Vue.extend(definition);
      Vue.options.components[id] = definition;
    };
  }

  function Vue(options) {
    this._init(options);
  }
  initMixin(Vue); //扩展init方法
  initLifeCycle(Vue); //vm._update vm._render
  initGlobalAPI(Vue); //全局api的实现
  initStateMixin(Vue); //实现了nextTick $watch

  return Vue;

}));
//# sourceMappingURL=vue.js.map
