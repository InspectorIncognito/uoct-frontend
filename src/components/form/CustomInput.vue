<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps({
  type: {
    type: String,
    default: "text",
  },
  placeholder: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "custom-input",
  },
  label: {
    type: String,
    default: null,
  },
  icon: {
    type: String,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
  hideLabel: {
    type: Boolean,
    default: false,
  },
  value: {
    type: String,
    default: undefined,
  },
  autocomplete: {
    type: String,
    default: undefined,
  },
});
const emit = defineEmits(["input"]);
function onInput(event: Event) {
  emit("input", (event.target as HTMLInputElement).value);
}

const showPassword = ref(false);
function toggleShowPassword() {
  showPassword.value = !showPassword.value;
}
function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
const inputType = computed(() => (props.type === "password" ? (showPassword.value ? "text" : "password") : props.type));
const labelText = computed(() => props.label ?? capitalize(props.name));
</script>

<template>
  <div class="field">
    <label v-if="!hideLabel" :for="name" class="field-label">{{ labelText }}</label>
    <div class="field-box" :class="{ 'has-error': error }">
      <span v-if="icon" class="material-icons field-icon" aria-hidden="true">{{ icon }}</span>
      <input
        :id="name"
        :name="name"
        class="field-input"
        :type="inputType"
        :placeholder="placeholder"
        :value="value"
        :autocomplete="autocomplete"
        :aria-label="hideLabel ? placeholder || labelText : undefined"
        :aria-invalid="error ? true : undefined"
        @input="onInput"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="field-toggle"
        :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        @click="toggleShowPassword"
      >
        <span class="material-icons" aria-hidden="true">
          {{ showPassword ? "visibility" : "visibility_off" }}
        </span>
      </button>
    </div>
    <div v-if="error" class="field-error">{{ error }}</div>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.field-label {
  color: var(--ink-3);
  font-size: var(--t-micro);
  letter-spacing: var(--track-caps);
  text-transform: uppercase;
  font-variation-settings: "wdth" 87.5;
}
.field-box {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  height: 40px;
  padding: 0 var(--s-3);
  background: var(--ground);
  box-shadow: 0 0 0 1px var(--rule-strong) inset;
  border-radius: var(--radius);
  transition: box-shadow var(--dur) var(--ease-out);
}
.field-box:hover {
  box-shadow: 0 0 0 1px var(--ink-2) inset;
}
.field-box:focus-within {
  box-shadow: 0 0 0 1px var(--now-line) inset;
}
.field-box.has-error {
  box-shadow: 0 0 0 1px var(--severe-ink) inset;
}
.field-icon {
  font-size: 18px;
  color: var(--ink-3);
}
.field-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: var(--t-small);
}
.field-input::placeholder {
  color: var(--ink-3);
}
.field-toggle {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
}
.field-toggle:hover {
  color: var(--ink);
}
.field-toggle .material-icons {
  font-size: 18px;
}
.field-error {
  color: var(--severe-ink);
  font-size: var(--t-small);
}
</style>
