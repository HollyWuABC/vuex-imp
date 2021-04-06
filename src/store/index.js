import Vue from 'vue'
// import Vuex from 'vuex'
import Vuex from '../vuex'

Vue.use(Vuex); // 这里用的use 证明 在Vuex这里有个install 方法

export default new Vuex.Store({
  modules: { // 可以给状态划分模块 递归
    a:{
      state: {
        count: 200
      },
      mutations:{
        change(state){
          console.log('----')
        }
      },
      modules:{
        b:{
          state:{
            count:3000
          }
        }
      }
    }
  },
  state: {
    count: 100
  },
  getters: {
    newCount(state) {
      return state.count + 100;
    }
  },
  mutations: { // 同步操作
    change(state) {
      state.count += 10;
    }
  },
  actions: { // 异步操作
    change({commit}) {
      setTimeout(()=> {
        commit('change');
      }, 1000);
    }
  },
  
})
