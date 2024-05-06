import watcher from "./watcher";

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
    this.subs.forEach((watcher) => watcher.update());
  }
}

Dep.target = null;
let stack = [];

export function pushTarget(watcher) {
  stack.push(watcher);
  Dep.target = watcher;
}

export function popTarget() {
  stack.pop();
  // Dep.target指向null
  Dep.target = stack[stack.length - 1];
}

export default Dep;
