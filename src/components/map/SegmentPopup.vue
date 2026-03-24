<script setup lang="ts">
interface CutIntersection {
  osm_node_id: number;
  latitude: number;
  longitude: number;
  intersection_type: string;
  name: string | null;
  streets: string[];
  highway_types: string[];
}

defineProps<{
  sequence?: number;
  shapeId?: string;
  speed?: number;
  historicSpeed?: number;
  temporalRange?: string;
  cutIntersection?: CutIntersection | null;
}>();

// Mapeo de tipos de vía a nombres legibles
const highwayTypeLabels: Record<string, string> = {
  motorway: "Autopista",
  motorway_link: "Enlace autopista",
  trunk: "Vía troncal",
  trunk_link: "Enlace troncal",
  primary: "Primaria",
  primary_link: "Enlace primaria",
  secondary: "Secundaria",
  secondary_link: "Enlace secundaria",
  tertiary: "Terciaria",
  tertiary_link: "Enlace terciaria",
  residential: "Residencial",
  unclassified: "Sin clasificar",
  service: "Servicio",
  living_street: "Zona residencial",
  pedestrian: "Peatonal",
  busway: "Vía de buses",
};

function formatHighwayType(type: string): string {
  return highwayTypeLabels[type] || type;
}
</script>

<template>
  <div class="segment-popup">
    <div class="header">Shape {{ shapeId }} - Segmento {{ sequence }}</div>
    <div class="section-container">
      <div class="section">
        <div class="section-icons">
          <span class="material-icons">schedule</span>
        </div>
        <div class="section-data">
          <span>{{ temporalRange }}</span>
        </div>
      </div>
      <div class="section">
        <div class="section-icons">
          <span class="material-icons">directions_bus</span>
          <span class="material-icons">double_arrow</span>
        </div>
        <div class="section-data speed">
          <b>Velocidad:</b>
          <span>{{ speed ? `${speed} km/h` : "No registrada" }}</span>
        </div>
        <div class="section-data speed">
          <b>Histórico:</b>
          <span>{{ historicSpeed ? `${historicSpeed} km/h` : "No calculada" }}</span>
        </div>
      </div>

      <!-- Sección de intersección -->
      <div class="section intersection-section">
        <div class="section-icons">
          <span class="material-icons">{{ cutIntersection ? 'traffic' : 'straighten' }}</span>
        </div>
        <div class="section-data">
          <div v-if="cutIntersection" class="intersection-info">
            <div class="intersection-badge">
              <span class="material-icons">traffic</span>
              <span>Corte en semáforo</span>
            </div>
            <div v-if="cutIntersection.streets && cutIntersection.streets.length > 0" class="intersection-detail">
              <b>Calles:</b>
              <span>{{ cutIntersection.streets.join(", ") }}</span>
            </div>
            <div v-if="cutIntersection.highway_types && cutIntersection.highway_types.length > 0" class="intersection-detail">
              <b>Tipo vías:</b>
              <span>{{ cutIntersection.highway_types.map(formatHighwayType).join(", ") }}</span>
            </div>
            <div class="intersection-detail coordinates">
              <b>Ubicación:</b>
              <span>{{ cutIntersection.latitude.toFixed(5) }}, {{ cutIntersection.longitude.toFixed(5) }}</span>
            </div>
          </div>
          <div v-else class="intersection-info">
            <div class="intersection-badge fallback">
              <span class="material-icons">straighten</span>
              <span>Corte a 500m (sin semáforo)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.intersection-section {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
  margin-top: 4px;
}

.intersection-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.intersection-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #4CAF50;
  font-weight: 500;
  font-size: 0.9em;
}

.intersection-badge .material-icons {
  font-size: 16px;
}

.intersection-badge.fallback {
  color: #9E9E9E;
}

.intersection-detail {
  font-size: 0.85em;
  color: rgba(255, 255, 255, 0.85);
}

.intersection-detail b {
  color: rgba(255, 255, 255, 0.6);
  margin-right: 4px;
}

.intersection-detail.coordinates {
  font-family: monospace;
  font-size: 0.8em;
  color: rgba(255, 255, 255, 0.6);
}
</style>
