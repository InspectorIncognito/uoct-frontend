# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Operadores de la sala de control de la UOCT** (Unidad Operativa de Control de Tránsito, Santiago). Monitorean el mapa en vivo de velocidades por segmento, revisan las alertas de congestión y las confirman con las cámaras CCTV de la UOCT que aparecen en el mapa. Tienen que detectar rápido dónde se degradó el tránsito.
- **Ingenieros y analistas de tránsito.** Consultan las velocidades registradas (rango de fechas) y las agregadas por mes, filtran por tipo de día y segmento temporal, ordenan las tablas y descargan CSV para analizarlos fuera de la app.
- **Equipo de investigación (tesis de detección automática de incidentes, AID).** Usa la app para validar la detección, ajustar el umbral de alertas y crear nuevos ejes viales.

No hay un rol de administrador separado confirmado. Configurar el umbral y crear ejes son funciones de la app; no está definido qué rol las ejecuta.

## Product Purpose

Herramienta operativa de la UOCT para vigilar la velocidad del tránsito en ejes viales de Santiago y detectar congestión anómala. La app calcula la velocidad de los buses (desde su GPS) en cada segmento de un eje, la compara con la velocidad histórica del mismo tipo de día y segmento temporal, y lanza una alerta de congestión cuando la velocidad actual cae por debajo de `velocidad histórica / umbral`.

Éxito: un operador ve en segundos dónde hay congestión anómala, puede verificarla (cámara, comparación con el histórico) y confía en las alertas; un analista saca los datos que necesita sin fricción.

## Positioning

- La velocidad no viene de sensores fijos ni de datos de terceros: se deriva del GPS de los buses, por segmento de eje (shape + secuencia).
- La alerta compara cada segmento contra su propio histórico (mismo tipo de día, misma ventana de 15 minutos), no contra un límite fijo.
- Los segmentos se cortan en intersecciones semaforizadas ("Corte en semáforo"), con las calles y tipos de vía de OpenStreetMap.
- Las alertas tienen retroalimentación humana: los operadores las califican como útiles o no útiles, y ese conteo se muestra en cada alerta.

## Operating Context

- Se usa en escritorio o notebook (monitor normal de oficina o del puesto de trabajo). Celular, tablet y video wall no son objetivos confirmados.
- Interfaz solo en español.
- Las horas se muestran en zona horaria America/Santiago, con cambio de horario automático; en las tablas se puede elegir entre hora local de Chile y UTC.
- El mapa se actualiza solo cada 15 minutos (al segundo 59 de los minutos 0, 15, 30 y 45) y avisa con una notificación "Mapa actualizado".
- El tiempo se divide en segmentos temporales de 15 minutos (96 por día). Los tipos de día distinguen el comportamiento del tránsito (p. ej., laboral y fin de semana).
- La retroalimentación sobre las alertas (votos útil / no útil) se captura en un formulario externo, enlazado desde el ítem "Alertas" del menú (`VITE_FORM_URL`).
- El acceso requiere inicio de sesión (autenticación por token); sin sesión, toda ruta redirige al login.

## Capabilities and Constraints

Funciones confirmadas (rutas):

- `/login`: inicio de sesión.
- `/map`: mapa Mapbox centrado en Santiago con segmentos coloreados por velocidad, popup por segmento (shape, secuencia, ventana horaria, velocidad actual y velocidad histórica, intersección de corte con calles, tipos de vía y coordenadas), marcadores de alerta de congestión con votos útil / no útil, marcadores de cámaras CCTV con su ID de la UOCT, leyenda de la escala de velocidad y hora de la última actualización.
- `/speeds`: tabla de velocidades registradas, con filtros por rango de fecha y hora, tipo de día y segmento temporal; ordenamiento en servidor; descarga CSV en hora local o UTC.
- `/historicSpeeds`: tabla de velocidades agregadas por mes, con filtros por mes, tipo de día y segmento temporal; descarga CSV.
- `/configuration`: umbral de alertas (fórmula `speed < historic_speed / umbral`).
- `/place-streets`: creación de un nuevo eje vial a partir de nombre, calles (deben coincidir con OpenStreetMap; se unen tramos separados por hasta 510 m) y ciudad (por defecto "Provincia de Santiago").
- Enlace externo "Alertas" al formulario de retroalimentación.

Stack existente: Vue 3 + TypeScript + Vite, Element Plus, Mapbox GL JS (token por variable de entorno), Pinia, vue-router, vue-i18n (solo `es`), axios contra una API REST propia. El rediseño debe mantener las funciones, las rutas y la integración con la API.

Escala de velocidad del mapa: hoy son 8 rangos (de < 5 km/h a > 30 km/h) más "Sin datos". El usuario confirmó que tanto los rangos como los colores se pueden redefinir.

Terminología de dominio que usan los usuarios: eje, shape, segmento / secuencia, segmento temporal, tipo de día, velocidad histórica, umbral, corte en semáforo, cámara CCTV.

## Brand Commitments

Ninguna identidad institucional es obligatoria: no hay logos, manual de marca ni tipografía institucional que respetar. El nombre de referencia es "UOCT"; el título actual de la página es "UOCT Map", pero no está confirmado como nombre de producto.

## Evidence on Hand

- Todos los datos (velocidades, alertas, cámaras, geometrías) son reales y vienen de la API; el repositorio no tiene fixtures ni capturas.
- Único asset en el repo: `public/favicon.ico`.
- No hay métricas de desempeño de la detección, testimonios ni cifras de uso confirmadas. El trabajo futuro no debe inventarlas.

## Product Principles

1. **Lo anómalo se encuentra primero.** Un segmento o alerta que se degradó debe poder localizarse en segundos, sin buscarlo.
2. **Cada número dice qué es.** Toda velocidad lleva unidad, ventana temporal, zona horaria y referencia histórica; la ausencia de datos se muestra como ausencia, nunca como cero.
3. **Alertas que se pueden verificar.** Cada alerta ofrece la evidencia para juzgarla (histórico, cámara cercana, retroalimentación previa); la confianza se gana, no se asume.
4. **Un vocabulario para operar y analizar.** El mapa en vivo y las tablas históricas hablan el mismo idioma de dominio, para que el operador y el analista se entiendan.
