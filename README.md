### 使用rollup打包工具简易地实现 Vue2 中响应式数据原理、计算属性computed、watch监听事件、diff算法

#### 下面是src中各个文件做了哪些事情

> ##### **state:**
>
> - 调用initData方法 初始化data数据并对data中的数据进行数据劫持（怎样进行数据劫持在后续文件中会详细说明）
> - 调用initComputed方法 初始化计算属性（在initComputed的方法中 创建计算watcher并对计算watcher进行脏值检测）
> - 调用initWatcher方法 初始化watch （在initStateMixin方法中 在Vue原型上挂载了$watch方法，该方法是watch的核心）
>
> **init：**
>
> - 在Vue原型对象上挂载_init、$mount方法
>
> **globalAPI:**
>
> - mixin实现原理（在其内部运用了**策略模式和发布订阅模式**）
> - 组件的创建以及为什么组件原型对象到最后会指向Vue原型对象
>
> **lifecycle：**
>
> - 该文件提供解析AST语法书树所需要的**_**c、**_**v、**_**s等函数
> - **_**update函数首次执行，直接将AST语法树解析成真实DOM节点，并将此真实DOM树挂载到vm实例上（vm.$el）
> - export mountComponent方法 （创建渲染watcher），该方法进行根组件挂载（根组件实例.$mount）的时候就会执行
>
> **compiler文件夹：**
>
> - 将真实DOM解析成AST语法树
>
> **vdom文件夹：**
>
> - **index：**
>   - 描述了**_**c、**_**v做了哪些属性（类似于React中的React.createElement方法）
>   - 子组件的挂载（由此可见每一个子组件都有相对应的渲染watcher）
>
> - **patch：**
>   - path文件就是diff算法的核心内容，内部提供了将虚拟节点渲染成真实DOM的**createElm**方法、对比标签中的属性patchProps方法、组件DOM节点的patch方法，
>     - createElm：该方法就是将真实节点和虚拟节点对应起来（是否想起lifecycle文件夹的vm.$el,就是经过对比所得到新的DOM节点覆盖vm.$el上的真实DOM节点）
>     - patchProps：该方法主要就是在进行diff算法的时候，新老标签中的属性对比（老标签有的属性新标签中没有则删除此属性，新标签有的属性老标签中国没有则添加此属性 ）
>     - patch：该方法的先进行元素标签和属性key值的对比，然后进行**双指针算法**（头头对比，头尾对比，尾尾对比，尾头对比，乱序对比）
>
> **observe文件夹：**
>
> - **array：**
>   - 重写数组中的方法（七个变异方法），因为这些方法是可以修改数组本身的（响应式数据是通过Object.defineProperty进行数据劫持的，而它劫持的就是属性，它无法劫持到对象，当数组通过那些方法修改data中的数据时，并不会重新执行vm.**_**update(vm.**_**render)进行渲染，所以需要在其数组原型上添加一些逻辑当数组中执行那些方法时判断数据是否发生变化，若发生变化，则执行vm.**_**update(vm.**_**render)进行渲染）
> - **dep：**
>   - dep文件主要就是export Dep类，在对data中的数据进行数据劫持的时候，会对每个data中的属性创建一个dep实例化对象（在src/observe/index.js中的数据劫持defineReactive方法中new Dep()）,如果data中的数据在视图层中被使用就会执行**dep.depend()**方法，该方法就是让属性收集当前所在组件的**Watcher**（注：Watcher类和Dep类之间的关系是多对多的关系，调用dep.depend()方法时，会先让Watcher收集dep，然后在Watcher类中向dep实例对象中传递组件的Watcher，也就是说**一个组件的所有data属性都记住使用过该data属性的所有Watcher类的实例对象，一个组件的Watcher记住当前组件中的在模板中使用过的所有data属性所对应的Dep类的实例对象**）
> - **index:**
>   - 创建Observe类，该类主要遍历data中的数据并对所有的属性进行劫持（如果属性值为数组或对象则会执行**childOb.dep.depend()**让数组和对象收集当前得到watcher）
>   - 注：当视图中的响应式数据发生变化就是触发在当前文件的**defineReactive**方法中的数据劫持set方法的dep.notify()方法，dep.notify实则是调用updateComponent方法中的vm.**_**update(vm.**_**render)（在src/lifecycle文件中将updateComponent传递给渲染Watcher）
> - **watcher:**
>   - watcher文件主要就是export Watcher类，暴露的Wacher类实例分为**渲染watcher和计算watcher**
>     - 渲染watcher：渲染watcher的主要作用是收集属性dep 当视图中的响应式数据发生改变时，就会执行dep.notify()方法，进而进行当前组件的重新渲染
>     - 计算watcher：在计算属性中的响应式数据会把watcher在Dep类中维护成一个栈型结构，方便后续响应式数据更新
>   - 计算watcher进行脏值检测以及$nextTick的实现（降级优化）
>   - Watcher与Dep之间的关系可以参考上文dep文件
