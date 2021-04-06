<template>
  <div id="app">
    {{this.$store.state.count}}
    {{this.$store.getters.newCount}}
    <button @click="change">add</button>

    {{ this.$store.state.a.b.count}}
  </div>
</template>

<script>

export default {
  name: 'App',
  components: {
  },
  mounted() {
    console.log('this.$store', this.$store);
  },
  methods: {
    change() {
      this.$store.dispatch('change');
    }
  },
}
</script>

<style>
</style>
