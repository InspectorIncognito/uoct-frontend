<script setup lang="ts">
import AxlesAPI, { type Axle } from "@/components/api/AxlesAPI";
import CustomButton from "@/components/form/CustomButton.vue";
import CustomInput from "@/components/form/CustomInput.vue";
import { computed, onMounted, ref } from "vue";

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
const procesando = ref(false);
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
    const axisName = submitData.name;
    exitoMsg.value = `Eje creado con ID ${
      data?.id || ""
    }. Procesando geometría...`.trim();
    console.log("Eje creado:", data);

    // Procesar el eje: ejecuta el comando de Django add_single_axis
    procesando.value = true;
    try {
      await AxlesAPI.processAxis({
        axis_name: axisName,
        distance_threshold: 500.0,
      });
      exitoMsg.value = `Eje "${axisName}" creado y procesado correctamente.`;
      console.log("Eje procesado exitosamente:", axisName);
      // Limpiar formulario después de crear y procesar
      resetForm();
    } catch (processErr: any) {
      console.error("Error al procesar el eje:", processErr);
      errorMsg.value = processErr?.response?.data
        ? `Eje creado pero error al procesar: ${JSON.stringify(
            processErr.response.data,
          )}`
        : `Eje creado pero error al procesar la geometría`;
    } finally {
      procesando.value = false;
    }
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

// ========== DELETE SECTION ==========
const axlesList = ref<Axle[]>([]);
const selectedAxleId = ref<number | null>(null);
const loadingAxles = ref(false);
const deletingAxle = ref(false);
const deleteErrorMsg = ref("");
const deleteSuccessMsg = ref("");

const fetchAxles = async () => {
  loadingAxles.value = true;
  deleteErrorMsg.value = "";
  try {
    const { data } = await AxlesAPI.getAll();
    console.log("Respuesta API getAll:", data);
    // Filter out any invalid entries that don't have an id
    const validAxles = (Array.isArray(data) ? data : []).filter(
      (a: Axle) => a && a.id !== null && a.id !== undefined,
    );
    console.log("Ejes válidos:", validAxles);
    axlesList.value = validAxles;
  } catch (err: any) {
    console.error("Error al cargar ejes:", err);
    deleteErrorMsg.value = "Error al cargar la lista de ejes";
  } finally {
    loadingAxles.value = false;
  }
};

const selectedAxle = computed(() => {
  if (selectedAxleId.value === null) return null;
  return axlesList.value.find((a) => a.id === selectedAxleId.value) || null;
});

const handleDelete = async () => {
  if (!selectedAxleId.value) {
    alert("Seleccione un eje para eliminar");
    return;
  }

  const axle = selectedAxle.value;
  const confirmMsg = axle?.has_shapes
    ? `¿Está seguro de eliminar el eje "${axle.name}"?\n\nEsto eliminará también ${axle.shapes_count} shape(s) y todos los datos asociados (segmentos, velocidades, alertas, etc.).`
    : `¿Está seguro de eliminar el eje "${axle?.name}"?`;

  if (!confirm(confirmMsg)) {
    return;
  }

  deletingAxle.value = true;
  deleteErrorMsg.value = "";
  deleteSuccessMsg.value = "";

  try {
    const { data } = await AxlesAPI.delete(selectedAxleId.value);
    deleteSuccessMsg.value = data?.message || "Eje eliminado exitosamente";
    console.log("Eje eliminado:", data);
    selectedAxleId.value = null;
    // Refresh the list
    await fetchAxles();
  } catch (err: any) {
    console.error("Error al eliminar eje:", err);
    deleteErrorMsg.value = err?.response?.data?.error
      ? err.response.data.error
      : "Error al eliminar el eje";
  } finally {
    deletingAxle.value = false;
  }
};

// Load axles on mount
onMounted(() => {
  fetchAxles();
});
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
            :hideLabel="true"
          />
        </div>

        <!-- Calles -->
        <div class="form-group">
          <label class="form-label">Calles</label>

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
            <CustomButton
              type="button"
              text="+ Agregar Calle"
              :method="addStreet"
              class="add-street-button"
            />
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
            :hideLabel="true"
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
            :disabled="cargando || procesando"
          >
            {{
              procesando
                ? "Procesando geometría..."
                : cargando
                ? "Guardando..."
                : "Guardar"
            }}
          </button>
        </div>
      </form>

      <!-- Separator -->
      <hr class="section-divider" />

      <!-- Delete Section -->
      <div class="delete-section">
        <h2 class="section-title">Eliminar Eje</h2>
        <p class="section-description">
          Seleccione un eje de la lista para eliminarlo. Esta acción eliminará
          también todos los datos asociados (shapes, segmentos, velocidades,
          alertas, etc.).
        </p>

        <div class="form-group">
          <label for="axle-select" class="form-label">Eje a eliminar</label>
          <div class="select-wrapper">
            <select
              id="axle-select"
              v-model="selectedAxleId"
              class="axle-select"
              :disabled="loadingAxles || deletingAxle"
            >
              <option :value="null" disabled>
                {{ loadingAxles ? "Cargando ejes..." : "Seleccione un eje" }}
              </option>
              <option
                v-for="axle in axlesList"
                :key="axle.id ?? `axle-${Math.random()}`"
                :value="axle.id"
              >
                {{ axle.name }}
                {{
                  axle.has_shapes
                    ? `(${axle.shapes_count} shapes)`
                    : "(sin procesar)"
                }}
              </option>
            </select>
            <button
              type="button"
              class="refresh-btn"
              @click="fetchAxles"
              :disabled="loadingAxles"
              title="Actualizar lista"
            >
              ↻
            </button>
          </div>
        </div>

        <!-- Selected Axle Info -->
        <div v-if="selectedAxle" class="axle-info">
          <h4>Información del eje seleccionado:</h4>
          <ul>
            <li><strong>Nombre:</strong> {{ selectedAxle.name }}</li>
            <li><strong>Ciudad:</strong> {{ selectedAxle.city }}</li>
            <li>
              <strong>Calles:</strong> {{ selectedAxle.streets.join(", ") }}
            </li>
            <li>
              <strong>Estado:</strong>
              <span
                :class="
                  selectedAxle.has_shapes
                    ? 'status-processed'
                    : 'status-pending'
                "
              >
                {{
                  selectedAxle.has_shapes
                    ? `Procesado (${selectedAxle.shapes_count} shapes)`
                    : "Sin procesar"
                }}
              </span>
            </li>
          </ul>
        </div>

        <div v-if="deleteErrorMsg || deleteSuccessMsg" class="status-messages">
          <p v-if="deleteErrorMsg" class="error-msg">{{ deleteErrorMsg }}</p>
          <p v-if="deleteSuccessMsg" class="success-msg">
            {{ deleteSuccessMsg }}
          </p>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="delete-button"
            @click="handleDelete"
            :disabled="!selectedAxleId || deletingAxle"
          >
            {{ deletingAxle ? "Eliminando..." : "Eliminar Eje" }}
          </button>
        </div>
      </div>
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
  border-left: 4px solid #31304d;
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
  color: #31304d;
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
  color: #31304d;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.osm-link:hover {
  color: #31304d;
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
.add-street-button {
  align-self: flex-start;
  width: auto;
  padding: 6px 12px;
  font-size: 14px;
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

/* Delete Section Styles */
.section-divider {
  border: none;
  border-top: 2px solid #e9ecef;
  margin: 40px 0;
}

.delete-section {
  margin-top: 0;
}

.section-title {
  color: #dc3545;
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 12px;
}

.section-description {
  color: #6c757d;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.select-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.axle-select {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-size: 14px;
  color: #495057;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.axle-select:focus {
  outline: none;
  border-color: #31304d;
  box-shadow: 0 0 0 3px rgba(49, 48, 77, 0.1);
}

.axle-select:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

.refresh-btn {
  background: #31304d;
  color: white;
  border: none;
  border-radius: 8px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: background 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #4a4970;
}

.refresh-btn:disabled {
  background: #adb5bd;
  cursor: not-allowed;
}

.axle-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.axle-info h4 {
  color: #31304d;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.axle-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.axle-info li {
  color: #495057;
  font-size: 13px;
}

.axle-info strong {
  color: #31304d;
}

.status-processed {
  color: #198754;
  font-weight: 500;
}

.status-pending {
  color: #ffc107;
  font-weight: 500;
}

.delete-button {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;
}

.delete-button:hover:not(:disabled) {
  background: #c82333;
}

.delete-button:disabled {
  background: #f5c6cb;
  cursor: not-allowed;
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
