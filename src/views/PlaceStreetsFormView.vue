<script setup lang="ts">
import AxlesAPI from "@/components/api/AxlesAPI";
import CustomButton from "@/components/form/CustomButton.vue";
import CustomInput from "@/components/form/CustomInput.vue";
import { ref } from "vue";

interface FormData {
  nombre: string; // eje / axis name
  calles: string[]; // streets
  ciudad: string; // city
}

const formData = ref<FormData>({
  nombre: "",
  calles: [""],
  ciudad: "Provincia de Santiago",
});

const addStreet = () => {
  formData.value.calles.push("");
};

const removeStreet = (index: number) => {
  if (formData.value.calles.length > 1) {
    formData.value.calles.splice(index, 1);
  }
};

const updateStreet = (index: number, value: string) => {
  formData.value.calles[index] = value;
};

const updateNombre = (value: string) => {
  formData.value.nombre = value;
};

const updateCiudad = (value: string) => {
  formData.value.ciudad = value;
};

const cargando = ref(false);
const errorMsg = ref("");
const exitoMsg = ref("");

// Envía los datos al backend (endpoint asumido POST /axles/)
const handleSubmit = async () => {
  const callesValidas = formData.value.calles.filter((c) => c.trim() !== "");

  if (!formData.value.nombre.trim()) {
    alert("Ingrese el nombre del eje");
    return;
  }
  if (callesValidas.length === 0) {
    alert("Ingrese al menos una calle");
    return;
  }

  const submitData = {
    name: formData.value.nombre.trim(),
    streets: callesValidas,
    city: formData.value.ciudad.trim() || "Provincia de Santiago",
  };

  cargando.value = true;
  errorMsg.value = "";
  exitoMsg.value = "";
  try {
    const { data } = await AxlesAPI.create(submitData);
    exitoMsg.value = `Eje creado con ID ${data?.id || ""}`.trim();
    console.log("Eje creado:", data);
    // Opcional: limpiar formulario después de crear
    resetForm();
  } catch (err: any) {
    console.error(err);
    errorMsg.value = err?.response?.data
      ? JSON.stringify(err.response.data)
      : "Error al crear el eje";
  } finally {
    cargando.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    nombre: "",
    calles: [""],
    ciudad: "Provincia de Santiago",
  };
};
</script>

<template>
  <div class="place-streets-form">
    <div class="form-container">
      <h1 class="form-title">Nuevo Eje</h1>

      <!-- Instrucciones -->
      <div class="instructions">
        <h2 class="instructions-title">Instrucciones</h2>
        <ul class="instructions-list">
          <li>
            <strong>Nombre del eje:</strong> Nombre que se guardará en la base
            de datos para identificar este eje vial.
          </li>
          <li>
            <strong>Calles:</strong> Nombres de las calles que conforman el eje.
            Deben coincidir exactamente con los nombres en
            <a
              href="https://www.openstreetmap.org/"
              target="_blank"
              rel="noopener noreferrer"
              class="osm-link"
              >OpenStreetMap</a
            >. Las calles pueden tener separaciones de hasta 510 metros que
            serán conectadas automáticamente.
          </li>
          <li>
            <strong>Ciudad:</strong> Nombre de la relación que contiene el eje
            vial (por defecto: "Provincia de Santiago").
          </li>
        </ul>
      </div>

      <form @submit.prevent="handleSubmit" class="form">
        <!-- Nombre del Eje -->
        <div class="form-group">
          <label for="nombre" class="form-label">Nombre del eje</label>
          <CustomInput
            type="text"
            name="nombre"
            placeholder="Nombre del eje"
            :value="formData.nombre"
            @input="updateNombre"
          />
        </div>

        <!-- Calles -->
        <div class="form-group">
          <div class="streets-header">
            <label class="form-label">Calles</label>
            <CustomButton
              type="button"
              text="+ Agregar Calle"
              :method="addStreet"
            />
          </div>

          <div class="streets-list">
            <div
              v-for="(street, index) in formData.calles"
              :key="index"
              class="street-item"
            >
              <CustomInput
                type="text"
                :name="`calle-${index}`"
                placeholder="Nombre de la calle"
                :value="street"
                @input="(value) => updateStreet(index, value)"
              />
              <button
                v-if="formData.calles.length > 1"
                type="button"
                class="remove-street-btn"
                @click="removeStreet(index)"
                title="Quitar calle"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Ciudad -->
        <div class="form-group">
          <label for="ciudad" class="form-label">Ciudad</label>
          <CustomInput
            type="text"
            name="ciudad"
            placeholder="Provincia de Santiago"
            :value="formData.ciudad"
            @input="updateCiudad"
          />
        </div>

        <div v-if="errorMsg || exitoMsg" class="status-messages">
          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
          <p v-if="exitoMsg" class="success-msg">{{ exitoMsg }}</p>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <CustomButton type="button" text="Limpiar" :method="resetForm" />
          <button
            class="custom-button submit"
            type="submit"
            :disabled="cargando"
          >
            {{ cargando ? "Guardando..." : "Guardar" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.place-streets-form {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.form-container {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
  margin-top: 20px;
}

.form-title {
  color: #31304d;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 24px;
  text-align: center;
}

.instructions {
  background: #f8f9fa;
  border-left: 4px solid #0066cc;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 32px;
}

.instructions-title {
  color: #31304d;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.instructions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.instructions-list li {
  color: #495057;
  font-size: 14px;
  line-height: 1.6;
  padding-left: 20px;
  position: relative;
}

.instructions-list li::before {
  content: "•";
  color: #0066cc;
  font-weight: bold;
  font-size: 18px;
  position: absolute;
  left: 0;
}

.instructions-list strong {
  color: #31304d;
  font-weight: 600;
}

.osm-link {
  color: #0066cc;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.osm-link:hover {
  color: #0052a3;
  text-decoration: underline;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  color: #31304d;
  font-weight: 500;
  font-size: 16px;
}

.streets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.streets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.street-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.remove-street-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  flex-shrink: 0;
}

.remove-street-btn:hover {
  background: #c82333;
}

.form-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.form-actions > * {
  flex: 1;
}

.status-messages {
  margin-top: -8px;
}
.error-msg {
  color: #dc3545;
  font-size: 14px;
}
.success-msg {
  color: #198754;
  font-size: 14px;
}

/* Responsive design */
@media (max-width: 768px) {
  .place-streets-form {
    padding: 12px;
  }

  .form-container {
    padding: 24px;
  }

  .form-title {
    font-size: 24px;
    margin-bottom: 20px;
  }

  .instructions {
    padding: 16px;
    margin-bottom: 24px;
  }

  .instructions-title {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .instructions-list li {
    font-size: 13px;
  }

  .streets-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
