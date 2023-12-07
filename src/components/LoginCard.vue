<template>
  <el-row>
    <el-col :span="6" :offset="9">
      <el-card>
        <el-row justify="center">
          <h2>{{ t("login.title") }}</h2>
        </el-row>
        <el-form class="login-form" :model="model" :rules="rules" ref="form" @submit.prevent="login">
          <el-form-item prop="username">
            <el-input v-model="model.username" :placeholder="t('username')"></el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="model.password" :placeholder="t('password')" type="password"></el-input>
          </el-form-item>
          <el-row justify="center">
            <el-form-item>
              <el-button :loading="loading" class="login-button" type="primary" native-type="submit" block>{{
                t("login.loginButton")
              }}</el-button>
            </el-form-item>
          </el-row>
        </el-form>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();
const store = useAuthStore();

const form = ref(null);
const model = ref({
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
  form.value.validate(async (valid, fields) => {
    if (!valid) {
      return;
    }

    loading.value = true;
    store
      .login(model.value)
      .then(() => {
        ElMessage({ message: t("login.success"), type: "success" });
        router.push({ name: "home" });
      })
      .catch(() => {
        ElMessage({ message: t("login.fail"), type: "error" });
      })
      .finally(() => {
        loading.value = false;
      });
  });
};
</script>
