<script setup lang="ts">
const props = defineProps({
  to: String,
  name: String,
  icon: String,
  external: {
    type: Boolean,
    default: false,
  },
  isButton: {
    type: Boolean,
    default: false,
  },
  cb: {
    type: Function,
    default: () => {
      return null;
    },
  },
});
</script>

<template>
  <div v-if="props.isButton && props.cb" class="navigation-button clickable" @click="() => props.cb()">
    <span class="material-icons">{{ props.icon }}</span>
  </div>
  <a v-else-if="props.external" target="_blank" :href="props.to">
    <div class="navigation-button">
      <span class="material-icons">arrow_forward_ios</span>
      <span class="material-icons">{{ props.icon }}</span>
      <span class="section-label">{{ props.name }}</span>
    </div>
  </a>
  <router-link :to="props.to" v-else>
    <div class="navigation-button">
      <span class="material-icons">arrow_forward_ios</span>
      <span class="material-icons">{{ props.icon }}</span>
      <span class="section-label">{{ props.name }}</span>
    </div>
  </router-link>
</template>

<style scoped>
a:-webkit-any-link {
  text-decoration: none;
}
.navigation-button {
  transition: color 0.2s ease;
}
.navigation-button:hover {
  color: #f0ece5;
}
.navigation-button:active {
  color: #606266;
}

.navigation-button {
  user-select: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  font-family: Inter, sans-serif;
  font-size: 20px;
  font-weight: bold;
  color: #b6bbc4;
  text-underline: none;
}
.navigation-button.clickable {
  cursor: pointer;
}
.section-label {
  padding-left: 8px;
}
</style>
