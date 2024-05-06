import { newArrayProto } from "./array";
import Dep from "./dep";

class Observe {
  constructor(data) {
    // 给每个对象都增加收集功能
    this.dep = new Dep();

    // 方便array.js文件中调用observeArray方法
    Object.defineProperty(data, "__ob__", {
      value: this,
      enumerable: false, //将__ob__变成不可枚举（循环的时候无法获取到）
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
    Object.keys(data).forEach((key) => defineReactive(data, key, data[key]));
  }

  // 观测数组
  observeArray(data) {
    // 对数组中存在对象进行数据劫持
    data.forEach((item) => observe(item));
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
export function defineReactive(target, key, value) {
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
    },
  });
}

export function observe(data) {
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
