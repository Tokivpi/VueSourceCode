### 使用rollup打包工具简易地实现 Vue2 中响应式数据原理、计算属性computed、watch监听事件、diff算法

#### 下面是各个文件做了哪些事情

> ##### **state:**
>
> - 调用initData方法 初始化data数据并对data中的数据进行数据劫持（怎样进行数据劫持在后续文件中会详细说明）
> - 调用initComputed方法 初始化计算属性（在initComputed的方法中 创建计算watcher并对计算watcher进行脏值检测）
> - 调用initWatcher方法 初始化watch （在initStateMixin方法中 在Vue原型上挂载了$watch方法，该方法是watch的核心）
>
> **observe文件夹：**
>
> - **array：**
>   - 重写数组中的方法（七个变异方法），因为这些方法是可以修改数组本身的（响应式数据是通过Object.defineProperty进行数据劫持的，而它劫持的就是属性，它无法劫持到对象，当数组通过那些方法修改data中的数据时，并不会重新执行vm._update(vm._render)进行渲染，所以需要在其数组原型上添加一些逻辑当数组中执行那些方法时判断数据是否发生变化，若发生变化，则执行vm._update(vm._render)进行渲染）
> - **dep：**

