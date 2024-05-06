import { isSameVnode } from "./index";

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
export function createElm(vnode) {
  let { tag, data, children, text } = vnode;
  if (typeof tag === "string") {
    // 创建真实元素 也要区分是组件还是元素
    if (createComponent(vnode)) {
      return vnode.componentInstance.$el;
    }

    // 将真实节点和虚拟节点对应起来
    vnode.el = document.createElement(tag);
    // 给标签附上属性
    patchProps(vnode.el, {}, data);
    children.forEach((child) => {
      // 会将组件创建的元素插入到父元素中
      vnode.el.appendChild(createElm(child));
    });
  } else {
    // 将文本节点的真实节点和虚拟节点对应起来
    vnode.el = document.createTextNode(text);
  }
  return vnode.el;
}

export function patchProps(el, oldProps = {}, props = {}) {
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

export function patch(oldVnode, vnode) {
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
  let el = (vnode.el = oldVnode.el); //复用老节点的元素
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
      let anchor = newChildren[newEndIndex + 1]
        ? newChildren[newEndIndex + 1].el
        : null;
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
