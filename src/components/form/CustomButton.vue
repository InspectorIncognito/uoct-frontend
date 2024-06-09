<script setup lang="ts">
defineProps({
  type: String,
  text: String,
  method: Function,
});
</script>

<template>
  <button v-if="type === 'submit'" class="custom-button submit" type="submit" block>
    {{ text }}
  </button>
  <button v-else class="custom-button" @click="method" type="button">
    {{ text }}
  </button>
</template>

<style scoped>
.custom-button {
  height: 24px;
  width: 100px;
}
.custom-button.submit {
  height: 36px;
  width: 100%;
  margin-top: 16px;
  background: #31304d;
  color: #ffffff;
  border-radius: 8px;
  border: none;

  -webkit-box-shadow: 0 4px 2px 0 rgba(0, 0, 0, 0.75);
  -moz-box-shadow: 0 4px 2px 0 rgba(0, 0, 0, 0.75);
  box-shadow: 0 4px 2px 0 rgba(0, 0, 0, 0.75);
}

.custom-button.submit:active {
  transform: translateY(2px);
  -webkit-box-shadow: 0 2px 1px 0 rgba(0, 0, 0, 0.75);
  -moz-box-shadow: 0 2px 1px 0 rgba(0, 0, 0, 0.75);
  box-shadow: 0 2px 1px 0 rgba(0, 0, 0, 0.75);
}
</style>
