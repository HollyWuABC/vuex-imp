let Vue;
// 外部用 new Vuex.Store 生成实例  因此这里也有一个Store构造函数


// 用于收集模块中的父子级关系
class ModuleCollection{
    constructor(options) { // vuex 空数组[] 表示根  [a, b] 表示 a模块下有b模块
        this.regiser([], options);
    }
    regiser(path, rawModule) {
        // path初始为一个空数组 rawModule就是个对象
        let newModule = {
            _raw: rawModule, // 有state， getter的那个对象
            _children: {}, // 表示包含的模块
            state: rawModule.state // 自己的模块的状态
        };
        if (path.length === 0) { // 根module
            this.root = newModule;
        } else {
            // path => [a, b]
            let parent = path.slice(0, -1).reduce((root, current) => {
                return root._children[current];
            }, this.root);
            parent._children[path[path.length - 1]] = newModule;
        }
        if (rawModule.modules) { // 表示有子模块
            forEach(rawModule.modules, (childName, module) => {
                // 把对应的子模块挂在父模块下 ['a', 'b']
                this.regiser(path.concat(childName), module); // [a]
            });
        }
    }
}
function installModule(store, rootState, path, rootModule) {
    // 把所有的子模块 的state 依次的挂在自己的模块上
    // rootState.a = {count: 200}
    // rootState.a.b = {count: 300}
    if (path.length > 0) {
        let parent = path.slice(0, -1).reduce((root, current) => {
            return root[current];
        }, rootState);
        // 手动实现响应式
        Vue.set(parent, path[path.length - 1], rootModule.state);
    }
    if (rootModule._raw.getters) {
        forEach(rootModule._raw.getters, (getterName, getterFn) => {
            Object.defineProperty(store.getters, getterName, {
                get: () => getterFn(rootModule.state)
            });
        });
    }
    if(rootModule._raw.actions){
        forEach(rootModule._raw.actions,(actionName,actionFn)=>{
            let entry = store.actions[actionName] || (store.actions[actionName]=[]) ;
            entry.push(()=>{// 这里是把所有的actions都push到rootState的actions数组
                actionFn.call(store,store);
            })
        });
    }
    if(rootModule._raw.mutations){
        forEach(rootModule._raw.mutations,(mutationName,mutationFn)=>{
            let entry = store.mutations[mutationName] || (store.mutations[mutationName]=[]) ;
            entry.push(()=>{ // 这里是把所有的mutations都push到rootState的mutations数组
                mutationFn.call(store,rootModule.state);
            })
        });
    }
    
    // 递归 所有的子模块全都调用installModule方法
    forEach(rootModule._children, (childName, module) => {
        installModule(store, rootState, path.concat(childName), module);
    });
}


class Store{ // 构造函数实例中有 state getter mutations actions
    constructor(options) {
        let state = options.state;
        this.getters = {};
        this.mutations = {};
        this.actions = {};
        //  这里的state 要实现响应式 可以利用vue的data来实现

        // vuex的核心 就是借用了vue的实例
        this._vm = new Vue({
            data: {
                state
            }
        });

        // 把模块直接的关系进行整理 根据用户传入的参数 维护了一个对象
        // root._children => a._children => b
        // 无论是父模块 还是子模块
        this.modules = new ModuleCollection(options);

        // 所有的mutations都是共用的  即把子的mutation跟父的mutation放一起

        // installModule 主要是用来统一处理getters mutations actions 
        // 参数： this是store实例, [] 是path，this.modules.root 当前的根模块 里面是内容是{_row, _children, state}
        installModule(this, state, [], this.modules.root);


        // if (options.getters) {
        //     let getters = options.getters; // {newCount: fn} 遍历取到options中所有的getters 挂到this.getters 上
        //     forEach(getters, (getterName, getterFn) => {
        //         Object.defineProperty(this.getters, getterName, {
        //             // vue 的computed的实现
        //             get: () => getterFn(state)
        //         })
        //     });
        // }
        // let mutations = options.mutations;
        // forEach(mutations, (mutationName, mutationFn) => { // 将options中的mutations都挂到this.mutations 上
        //     // this.mutations.change = () => {change(state)}
        //     this.mutations[mutationName] = () => {
        //         mutationFn.call(this, state);
        //     }
        // });

        // let actions = options.actions;
        // // 将options上的actions都挂在this.actions 上
        // forEach(actions, (actinoName, actionFN) => {
        //     this.actions.[actinoName] = () => {
        //         actionFN.call(this, this); // actionFn(this, store); // store 在this上
        //     }
        // });

        // 如果直接用原型上的commit跟dispatch ，不知道this的指向，所以可以在实例上定义commit跟dispatch
        let {commit, dispatch} = this; // 这两个是原型上的方法，在这里取出是为了防止被下面的this.commit 跟this.dispatch 覆盖 
        this.commit = (type) => {
            commit.call(this, type);
        }
        this.dispatch = (type) => {
            dispatch.call(this, type);
        }
    }

    get state() { // 获取 这个跟Object.defineProperty 中的get一样
        return this._vm.state;
    }
    commit(type) {
        this.mutations[type].forEach(fn => fn());
    }

    // commit 对应的方法
    dispatch(type) {
        this.actions[type].forEach(fn => fn());
    }
}

// 封装遍历对象的方法
function forEach(obj, callback) {
    Object.keys(obj).forEach(item => callback(item, obj[item]))
}


// 外部调用是用的use 所以在vuex里面就有一个install 方法

let install = (_Vue) => {
    Vue = _Vue; // 保留_Vue的实例  多次use就只需要用一个
    Vue.mixin({
        beforeCreate() {
            // 在这里需要把根组件的store实例拿过来，给每个组件都增加一个store属性
            // 判断是否是根组件（只有根组件有store实例）
            if (this.$options && this.$options.store) {
                this.$store = this.$options.store;
            } else { // 对于子组件的处理 利用vue的渲染是深度优先的原理  父--> 子 --> 孙
                this.$store = this.$parent && this.$parent.$store;
            }
        },
    })
};

export default {
    Store,
    install
}