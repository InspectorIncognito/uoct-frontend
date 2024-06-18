<script setup lang="ts">
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { onMounted, ref } from "vue";
import MapAPI from "@/components/api/MapAPI";
import { get_datetime_format } from "@/utils/gps_utils";
import { ElNotification } from "element-plus";

const style = ref("mapbox://styles/mapbox/dark-v10");
const elSwitch = ref(false);

const mapContainer = ref<HTMLElement>();
const map = ref(null);
const popup = ref(null);
const currentGeoJson = ref(null);

const geoJsonSourceId = "geojson-source";
const geoJsonLayerId = "geojson-layer";
const selectedGeoJsonSourceId = "selected-geojson-source";
const selectedGeoJsonLayerId = "selected-geojson-layer";

const date_range = ref([]);

function initializeMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: "mapbox://styles/mapbox/dark-v10",
    center: [-70.65387, -33.443018],
    zoom: 14,
  });
  map.value.dragRotate.disable();
}

function getPopupContent(feature) {
  return `
    <h3>
    Segmento ${feature.properties.sequence} de Shape(${feature.properties.shape_id})
    </h3>
    <h3>
    ${
      Number(feature.properties.speed) >= 0
        ? `Velocidad: ${Math.round(Number(feature.properties.speed) * 10) / 10} km/h`
        : "No se registró una velocidad"
    }

    </h3>
`;
}

function onFeatureClick(e) {
  const feature = e.features[0];

  if (!popup.value) {
    popup.value = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
    });
  }
  popup.value.setLngLat(e.lngLat).setHTML(getPopupContent(feature)).addTo(map.value);
  map.value.getSource(selectedGeoJsonSourceId).setData({
    type: "FeatureCollection",
    features: [feature],
  });
}

function onMouseEnterFeature() {
  map.value.getCanvas().style.cursor = "pointer";
}
function onMouseLeaveFeature() {
  map.value.getCanvas().style.cursor = "";
}
async function updateGeoJson() {
  const response = await MapAPI.getMapData();

  if (map.value && map.value.getSource(geoJsonSourceId)) {
    map.value.removeLayer(geoJsonLayerId);
    map.value.removeSource(geoJsonSourceId);
  }

  map.value.addSource(geoJsonSourceId, {
    type: "geojson",
    data: response.data,
  });

  map.value.addLayer({
    id: geoJsonLayerId,
    type: "line",
    source: geoJsonSourceId,
    paint: {
      "line-color": ["get", "color"],
      "line-width": 4,
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
  });

  if (!map.value.getSource(selectedGeoJsonSourceId)) {
    map.value.addSource(selectedGeoJsonSourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    /*
    map.value.addLayer({
      id: selectedGeoJsonLayerId,
      type: "line",
      source: selectedGeoJsonSourceId,
      paint: {
        "line-color": "#ff0000",
        "line-width": 5,
      },
    });
     */
  }
  currentGeoJson.value = response.data;
  map.value.on("click", geoJsonLayerId, onFeatureClick);
  map.value.on("mouseenter", geoJsonLayerId, onMouseEnterFeature);
  map.value.on("mouseleave", geoJsonLayerId, onMouseLeaveFeature);
}

onMounted(() => {
  initializeMap();
});
const toggleView = () => {
  elSwitch.value = !elSwitch.value;
  style.value = elSwitch.value ? "mapbox://styles/mapbox/dark-v10" : "mapbox://styles/mapbox/streets-v12";
  map.value.setStyle(style.value);
};

function updateMap(newData: object) {
  new mapboxgl.Marker().setLngLat([-70.65387, -33.443018]).addTo(map.value);
}

function get_by_range() {
  if (date_range.value !== []) {
    const start_date: string = get_datetime_format(date_range.value[0]);
    const end_date: string = get_datetime_format(date_range.value[1]);
    console.log(start_date, end_date);
    MapAPI.get_by_range(start_date, end_date, true)
      .then((response) => {
        updateMap(response.data);
        //console.log(mapData.value);
      })
      .catch((e) => {
        console.log(e);
      });
  } else console.log("Nada");
}

function getMapData() {
  updateGeoJson().then(() => {
    ElNotification({
      title: "Alerta",
      message: "Mapa actualizado",
      type: "success",
    });
  });
}
</script>
<template>
  <div class="test-section">
    <span class="material-icons">bug_report</span>
    <el-button :onclick="getMapData">Test endpoint</el-button>
  </div>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.test-section {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  position: absolute;
  top: 0;
  z-index: 10;
  color: greenyellow;
}
.map-container {
  flex: 1;
  height: 100vh;
}

body {
  margin: 0;
  padding: 0;
}
</style>
