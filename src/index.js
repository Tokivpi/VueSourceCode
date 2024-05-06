import { initMixin } from "./init";
import { initLifeCycle } from "./lifecycle";
import { initStateMixin } from "./state";
import { initGlobalAPI } from "./globalAPI";
import { compileToFunction } from "./compiler";

function Vue(options) {
  this._init(options);
}

initMixin(Vue); //扩展init方法
initLifeCycle(Vue); //vm._update vm._render
initGlobalAPI(Vue); //全局api的实现
initStateMixin(Vue); //实现了nextTick $watch

export default Vue;
