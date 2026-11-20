<script setup lang="ts">
defineProps({
  type: String,
  text: String,
  method: Function,
  loading: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <button v-if="type === 'submit'" class="btn btn--primary custom-button" type="submit" :disabled="loading">
    <span v-if="loading" class="material-icons spin" aria-hidden="true">progress_activity</span>
    {{ text }}
  </button>
  <button v-else class="btn custom-button" type="button" @click="method && method()">
    {{ text }}
  </button>
</template>

<style scoped>
.custom-button {
  height: 44px;
  width: 100%;
}
</style>
