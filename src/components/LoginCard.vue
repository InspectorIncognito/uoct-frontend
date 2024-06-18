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
  <div class="login-card">
    <div class="title">Inicio de sesión</div>
    <form class="login-form" :model="model" :rules="rules" ref="form" @submit.prevent="login">
      <CustomInput
        icon="person"
        name="username"
        placeholder="Nombre de usuario"
        type="text"
        @input="(newValue) => (model.username = newValue)"
      />
      <CustomInput
        icon="key"
        name="password"
        placeholder="Contraseña"
        type="password"
        @input="(newValue) => (model.password = newValue)"
      />
      <CustomButton type="submit" text="Iniciar sesión"></CustomButton>
    </form>
  </div>
</template>

<style scoped>
.login-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 36px 0;
  border-radius: 8px;
  border: 1px solid grey;
  background: #ffffff;
  height: auto;
  width: 400px;
}

.login-card .title {
  font-size: 28px;
  font-weight: bold;
  font-family: Roboto, serif;
  color: #222222;
  margin-bottom: 16px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
</style>
