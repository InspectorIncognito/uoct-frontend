<script setup lang="ts">
import AxlesAPI, { type Axle } from "@/components/api/AxlesAPI";
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

  errorMsg.value = "";
  exitoMsg.value = "";
  if (!formData.value.nombre.trim()) {
    errorMsg.value = "Falta el nombre del eje.";
    return;
  }
  if (callesValidas.length === 0) {
    errorMsg.value = "Agrega al menos una calle.";
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
    exitoMsg.value = `Eje creado con ID ${data?.id || ""}. Procesando geometría...`.trim();
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
        ? `Eje creado pero error al procesar: ${JSON.stringify(processErr.response.data)}`
        : `Eje creado pero error al procesar la geometría`;
    } finally {
      procesando.value = false;
    }
  } catch (err: any) {
    console.error(err);
    errorMsg.value = err?.response?.data ? JSON.stringify(err.response.data) : "Error al crear el eje";
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
    // API returns paginated response: { count, next, previous, results }
    // We need to fetch all pages
    let allAxles: Axle[] = [];
    let nextUrl: string | null = null;

    // First request
    const { data: firstPage } = await AxlesAPI.getAll();
    console.log("Respuesta API getAll (página 1):", firstPage);

    if (firstPage?.results) {
      allAxles = [...firstPage.results];
      nextUrl = firstPage.next;

      // Fetch remaining pages if any
      while (nextUrl) {
        console.log("Cargando página siguiente:", nextUrl);
        const { data: nextPage } = await AxlesAPI.getPage(nextUrl);
        if (nextPage?.results) {
          allAxles = [...allAxles, ...nextPage.results];
          nextUrl = nextPage.next;
        } else {
          break;
        }
      }
    } else if (Array.isArray(firstPage)) {
      // If API returns array directly (no pagination)
      allAxles = firstPage;
    }

    // Filter out any invalid entries that don't have an id
    const validAxles = allAxles.filter((a: Axle) => a && a.id !== null && a.id !== undefined);
    console.log("Total ejes cargados:", validAxles.length);
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
    deleteErrorMsg.value = "Selecciona un eje para eliminar.";
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
    deleteErrorMsg.value = err?.response?.data?.error ? err.response.data.error : "Error al eliminar el eje";
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
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Ejes viales</h1>
        <p>
          Crea un eje a partir de calles de OpenStreetMap para que empiece a medirse, o elimina uno existente junto con
          todos sus datos.
        </p>
      </div>
    </header>

    <div class="axes-grid">
      <!-- CREATE -->
      <section class="tile ax-card" aria-labelledby="ax-new">
        <h2 id="ax-new" class="caps ax-title">Nuevo eje</h2>
        <div class="ax-cols">
          <form class="ax-form" novalidate @submit.prevent="handleSubmit">
            <CustomInput
              type="text"
              name="nombre"
              label="Nombre del eje"
              placeholder="Ej: Eje Alameda"
              :value="formData.nombre"
              @input="updateNombre"
            />

            <fieldset class="streets">
              <legend class="ax-label">Calles</legend>
              <ol class="streets-list">
                <li v-for="(street, index) in formData.calles" :key="index" class="street-row">
                  <span class="street-idx num" aria-hidden="true">
                    {{ String(index + 1).padStart(2, "0") }}
                  </span>
                  <CustomInput
                    type="text"
                    :name="`calle-${index}`"
                    :label="`Calle ${index + 1}`"
                    hide-label
                    placeholder="Nombre exacto en OpenStreetMap"
                    :value="street"
                    @input="(value) => updateStreet(index, value)"
                  />
                  <button
                    v-if="formData.calles.length > 1"
                    type="button"
                    class="btn btn--icon"
                    :aria-label="`Quitar calle ${index + 1}`"
                    title="Quitar calle"
                    @click="removeStreet(index)"
                  >
                    <span class="material-icons" aria-hidden="true">close</span>
                  </button>
                </li>
              </ol>
              <button type="button" class="btn ax-add" @click="addStreet">
                <span class="material-icons" aria-hidden="true">add</span>
                Agregar calle
              </button>
            </fieldset>

            <CustomInput
              type="text"
              name="ciudad"
              label="Ciudad"
              placeholder="Provincia de Santiago"
              :value="formData.ciudad"
              @input="updateCiudad"
            />

            <div v-if="errorMsg || exitoMsg" class="ax-status" role="status">
              <p v-if="errorMsg" class="ax-msg ax-msg--error">{{ errorMsg }}</p>
              <p v-if="exitoMsg" class="ax-msg ax-msg--ok">{{ exitoMsg }}</p>
            </div>

            <div class="ax-actions">
              <button class="btn btn--primary" type="submit" :disabled="cargando || procesando">
                <span v-if="cargando || procesando" class="material-icons spin" aria-hidden="true"
                  >progress_activity</span
                >
                {{ procesando ? "Procesando geometría" : cargando ? "Guardando" : "Crear y procesar eje" }}
              </button>
            </div>
          </form>

          <aside class="ax-help" aria-label="Instrucciones">
            <dl>
              <dt class="caps">Nombre del eje</dt>
              <dd>Nombre con que se guardará en la base de datos para identificar este eje vial.</dd>
              <dt class="caps">Calles</dt>
              <dd>
                Deben coincidir exactamente con los nombres en
                <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>.
                Los tramos separados por hasta 510 metros se conectan automáticamente.
              </dd>
              <dt class="caps">Ciudad</dt>
              <dd>Relación que contiene el eje vial. Por defecto, “Provincia de Santiago”.</dd>
            </dl>
          </aside>
        </div>
      </section>

      <!-- DELETE -->
      <section class="tile ax-card" aria-labelledby="ax-del">
        <h2 id="ax-del" class="caps ax-title">Eliminar eje</h2>

        <div class="ax-field">
          <label for="axle-select" class="ax-label">Eje a eliminar</label>
          <div class="ax-select-row">
            <div class="ax-select">
              <select id="axle-select" v-model="selectedAxleId" :disabled="loadingAxles || deletingAxle">
                <option :value="null" disabled>
                  {{ loadingAxles ? "Cargando ejes…" : "Selecciona un eje" }}
                </option>
                <option v-for="(axle, index) in axlesList" :key="axle.id ?? `axle-${index}`" :value="axle.id">
                  {{ axle.name }}
                  {{ axle.has_shapes ? `(${axle.shapes_count} shapes)` : "(sin procesar)" }}
                </option>
              </select>
              <span class="material-icons" aria-hidden="true">expand_more</span>
            </div>
            <button
              type="button"
              class="btn btn--icon"
              :disabled="loadingAxles"
              aria-label="Actualizar lista de ejes"
              title="Actualizar lista"
              @click="fetchAxles"
            >
              <span class="material-icons" :class="{ spin: loadingAxles }" aria-hidden="true"> refresh </span>
            </button>
          </div>
        </div>

        <dl v-if="selectedAxle" class="ax-info">
          <div>
            <dt class="caps">Nombre</dt>
            <dd>{{ selectedAxle.name }}</dd>
          </div>
          <div>
            <dt class="caps">Ciudad</dt>
            <dd>{{ selectedAxle.city }}</dd>
          </div>
          <div class="ax-info-wide">
            <dt class="caps">Calles</dt>
            <dd>{{ selectedAxle.streets.join(", ") }}</dd>
          </div>
          <div>
            <dt class="caps">Estado</dt>
            <dd :class="selectedAxle.has_shapes ? 'is-ok' : 'is-pending'">
              {{ selectedAxle.has_shapes ? `Procesado · ${selectedAxle.shapes_count} shapes` : "Sin procesar" }}
            </dd>
          </div>
        </dl>

        <p class="ax-warning">
          <span class="material-icons" aria-hidden="true">warning</span>
          Se borran también sus shapes, segmentos, velocidades, alertas y demás datos relacionados. No se puede
          deshacer.
        </p>

        <div v-if="deleteErrorMsg || deleteSuccessMsg" class="ax-status" role="status">
          <p v-if="deleteErrorMsg" class="ax-msg ax-msg--error">{{ deleteErrorMsg }}</p>
          <p v-if="deleteSuccessMsg" class="ax-msg ax-msg--ok">{{ deleteSuccessMsg }}</p>
        </div>

        <div class="ax-actions">
          <button
            type="button"
            class="btn btn--danger"
            :disabled="!selectedAxleId || deletingAxle"
            @click="handleDelete"
          >
            <span class="material-icons" :class="{ spin: deletingAxle }" aria-hidden="true">
              {{ deletingAxle ? "progress_activity" : "delete" }}
            </span>
            {{ deletingAxle ? "Eliminando" : "Eliminar eje" }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.axes-grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--gap);
  align-items: start;
}
.ax-card {
  padding: var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}
.ax-title {
  margin: 0;
}
.ax-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(200px, 0.8fr);
  gap: var(--s-8);
}
.ax-form {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}
.ax-label {
  color: var(--ink-3);
  font-size: var(--t-micro);
  letter-spacing: var(--track-caps);
  text-transform: uppercase;
  font-variation-settings: "wdth" 87.5;
  padding: 0;
  margin-bottom: 6px;
}
.streets {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
.streets-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.street-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--s-2);
}
.street-idx {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.ax-add {
  margin-top: var(--s-3);
  margin-left: 32px;
}
.ax-help {
  border-left: 1px solid var(--rule);
  padding-left: var(--s-6);
}
.ax-help dl {
  margin: 0;
}
.ax-help dt {
  color: var(--ink-3);
  font-size: var(--t-micro);
  margin-top: var(--s-4);
}
.ax-help dt:first-child {
  margin-top: 0;
}
.ax-help dd {
  margin: 4px 0 0;
  color: var(--ink-2);
  font-size: var(--t-small);
  max-width: 44ch;
}
.ax-status {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.ax-msg {
  margin: 0;
  padding: var(--s-2) var(--s-3);
  font-size: var(--t-small);
  background: var(--tile-2);
  word-break: break-word;
}
.ax-msg--error {
  color: var(--severe-ink);
}
.ax-msg--ok {
  color: var(--ink);
}
.ax-actions {
  display: flex;
  justify-content: flex-end;
}

.ax-field {
  display: flex;
  flex-direction: column;
}
.ax-select-row {
  display: flex;
  gap: var(--s-2);
}
.ax-select {
  position: relative;
  flex: 1;
  min-width: 0;
}
.ax-select select {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 var(--s-3);
  appearance: none;
  background: var(--ground);
  border: 0;
  box-shadow: 0 0 0 1px var(--rule-strong) inset;
  border-radius: var(--radius);
  font-size: var(--t-small);
  cursor: pointer;
}
.ax-select select:hover {
  box-shadow: 0 0 0 1px var(--ink-2) inset;
}
.ax-select select:disabled {
  color: var(--ink-3);
  cursor: not-allowed;
}
.ax-select .material-icons {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--ink-3);
}
.ax-select-row .btn {
  width: 40px;
  height: 40px;
}
.ax-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-3) var(--s-4);
  margin: 0;
  padding: var(--s-4);
  background: var(--tile-2);
}
.ax-info-wide {
  grid-column: 1 / -1;
}
.ax-info dt {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.ax-info dd {
  margin: 2px 0 0;
  font-size: var(--t-small);
}
.ax-info .is-ok {
  color: var(--ok-ink);
}
.ax-info .is-pending {
  color: var(--now-line);
}
.ax-warning {
  display: flex;
  gap: var(--s-2);
  margin: 0;
  font-size: var(--t-small);
  color: var(--ink-2);
}
.ax-warning .material-icons {
  font-size: 18px;
  color: var(--severe-ink);
}

@media (max-width: 1180px) {
  .axes-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .ax-cols {
    grid-template-columns: 1fr;
  }
  .ax-help {
    border-left: 0;
    padding-left: 0;
    border-top: 1px solid var(--rule);
    padding-top: var(--s-4);
  }
}
</style>
