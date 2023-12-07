import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import App from "./App.vue";
import router from "./router";
import axios from "axios";
import VueAxios from "vue-axios";

import "./assets/base.css";
import "element-plus/dist/index.css";
import es from "element-plus/es/locale/lang/es";
import APIService from "@/components/api/APIService";
import { createI18n } from "vue-i18n";
import esLocaleMessages from "@/locales/es.json";

const app = createApp(App);

const i18n = createI18n({
  legacy: false,
  locale: import.meta.env.VITE_I18N_LOCALE,
  fallbackLocale: import.meta.env.VITE_I18N_FALLBACK_LOCALE,
  messages: {
    es: esLocaleMessages,
  },
});
app.use(ElementPlus, {
  locale: es,
});
app.use(createPinia());
app.use(router);
app.use(VueAxios, axios);
app.use(i18n);

APIService.init(app);

app.mount("#app");
