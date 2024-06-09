<script setup lang="ts">
import { ref } from "vue";

defineProps({
  type: {
    type: String,
    default: "text",
  },
  placeholder: {
    type: String,
    default: "Default placeholder",
  },
  name: {
    type: String,
    default: "custom-input",
  },
  icon: {
    type: String || null,
    default: null,
  },
  error: {
    type: String || null,
    default: "default error msg.",
  },
});
defineEmits(["input"]);

const showPassword = ref(false);
function toggleShowPassword() {
  showPassword.value = !showPassword.value;
}
function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
</script>

<template>
  <div class="custom-input-block">
    <label :for="name">{{ capitalize(name) }}</label>
    <div class="custom-input-container">
      <span v-if="icon != null" class="material-icons filled">{{ icon }}</span>
      <input
        :name="name"
        v-if="type === 'text'"
        class="custom-input"
        :type="type"
        :placeholder="placeholder"
        @input="$emit('input', $event.target.value)"
      />
      <input
        v-else-if="type === 'password'"
        class="custom-input"
        :type="showPassword ? 'text' : 'password'"
        :placeholder="placeholder"
        @input="$emit('input', $event.target.value)"
      />
      <span v-if="type === 'password'" class="visibility material-icons" @click="toggleShowPassword">{{
        showPassword ? "visibility" : "visibility_off"
      }}</span>
    </div>
    <div v-if="error != null" class="error-msg">{{ error }}</div>
  </div>
</template>

<style scoped>
input,
input:focus {
  font-family: Roboto, serif;
  border: none;
  outline: none;
  box-shadow: none;
}
label {
  font-family: "Roboto", serif;
  text-align: left;
}
.custom-input {
  border-radius: 4px;
  font-size: 14px;
  height: 32px;
  width: 300px;
}
.custom-input-container {
  padding: 0 8px;
  border: 2px solid gray;
  border-radius: 4px;
  width: 300px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 4px 0;
}
.custom-input-container span {
  user-select: none;
}
.visibility {
  cursor: pointer;
}
.custom-input-block {
  display: flex;
  flex-direction: column;
  justify-content: left;
}

.error-msg {
  display: none;
  font-family: Roboto, serif;
  font-size: 16px;
  color: firebrick;
}
.error-msg.active {
  display: block;
}
</style>
