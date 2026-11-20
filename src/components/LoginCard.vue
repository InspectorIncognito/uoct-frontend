<script setup>
import { reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import CustomInput from "@/components/form/CustomInput.vue";
import CustomButton from "@/components/form/CustomButton.vue";

const { t } = useI18n();
const router = useRouter();
const store = useAuthStore();

const form = ref(null);
const model = reactive({
  username: "",
  password: "",
});
const loading = ref(false);
const rules = {
  username: [
    {
      required: true,
      message: t("login.validation.username.required"),
      trigger: "blur",
    },
    {
      min: 4,
      message: t("login.validation.username.minLength"),
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: t("login.validation.password.required"), trigger: "blur" },
    {
      min: 5,
      message: t("login.validation.password.minLength"),
      trigger: "blur",
    },
  ],
};

const login = () => {
  loading.value = true;
  store
    .login(model)
    .then(() => {
      ElMessage({ message: t("login.success"), type: "success" });
      router.push({ name: "map" });
    })
    .catch(() => {
      ElMessage({ message: t("login.fail"), type: "error" });
    })
    .finally(() => {
      loading.value = false;
    });
};
</script>

<template>
  <section class="login-card tile" aria-labelledby="login-title">
    <header class="lc-head">
      <svg class="lc-mark" viewBox="0 0 18 18" aria-hidden="true">
        <rect x="0" y="0" width="5" height="5" class="m-cell" />
        <rect x="6.5" y="0" width="5" height="5" class="m-cell" />
        <rect x="13" y="0" width="5" height="5" class="m-hot" />
        <rect x="0" y="6.5" width="5" height="5" class="m-cell" />
        <rect x="6.5" y="6.5" width="5" height="5" class="m-hot" />
        <rect x="13" y="6.5" width="5" height="5" class="m-cell" />
        <rect x="0" y="13" width="5" height="5" class="m-hot" />
        <rect x="6.5" y="13" width="5" height="5" class="m-cell" />
        <rect x="13" y="13" width="5" height="5" class="m-cell" />
      </svg>
      <div>
        <h1 id="login-title" class="lc-title">UOCT</h1>
        <p class="lc-sub">Velocidad de buses en los ejes de Santiago</p>
      </div>
    </header>
    <form class="login-form" ref="form" @submit.prevent="login">
      <CustomInput
        icon="person"
        name="username"
        :label="t('username')"
        placeholder="usuario"
        type="text"
        autocomplete="username"
        @input="(newValue) => (model.username = newValue)"
      />
      <CustomInput
        icon="key"
        name="password"
        :label="t('password')"
        placeholder="••••••••"
        type="password"
        autocomplete="current-password"
        @input="(newValue) => (model.password = newValue)"
      />
      <CustomButton type="submit" :text="loading ? 'Entrando' : t('login.loginButton')" :loading="loading" />
    </form>
  </section>
</template>

<style scoped>
.login-card {
  width: min(400px, 100%);
  padding: var(--s-8);
  display: flex;
  flex-direction: column;
  gap: var(--s-8);
  box-shadow: var(--shadow-float);
}
.lc-head {
  display: flex;
  align-items: center;
  gap: var(--s-4);
}
.lc-mark {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}
.m-cell {
  fill: var(--rule-strong);
}
.m-hot {
  fill: var(--now);
}
.lc-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1;
}
.lc-sub {
  margin: 6px 0 0;
  color: var(--ink-2);
  font-size: var(--t-small);
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}
</style>
