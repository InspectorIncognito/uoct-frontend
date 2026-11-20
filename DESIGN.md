---
name: UOCT, Velocidad de buses
description: Diagrama espacio-tiempo de la red de buses de Santiago sobre papel milimetrado nocturno.
colors:
  abyssal: "#1B2632"
  blue-fantastic: "#2C3B4D"
  tile-raised: "#34465B"
  tile-pressed: "#3D5168"
  palladian: "#EEE9DF"
  oatmeal: "#C9C1B1"
  oatmeal-dim: "#B8B2A5"
  burning-flame: "#FFB162"
  truffle-trouble: "#A35139"
  truffle-ink: "#EDA087"
  slate-ok: "#9FB3C8"
  rule: "rgba(238, 233, 223, 0.12)"
  rule-strong: "rgba(238, 233, 223, 0.26)"
  paper-tile: "#DCD5C7"
  paper-tile-raised: "#D2CABA"
  ink-muted-light: "#4A535F"
  flame-line-light: "#8A4B15"
  truffle-ink-light: "#8E4530"
  historic-light: "#5B6470"
  rule-light: "rgba(27, 38, 50, 0.13)"
  rule-strong-light: "rgba(27, 38, 50, 0.3)"
  speed-bin-1: "#C4553A"
  speed-bin-2: "#E8854A"
  speed-bin-3: "#D7B07A"
  speed-bin-4: "#B3AD9F"
  speed-bin-5: "#8D9CAD"
  speed-bin-6: "#6F88A5"
  speed-bin-7: "#56769B"
  speed-nodata: "#5D6166"
  speed-bin-1-light: "#8E3F2A"
  speed-bin-2-light: "#B8582F"
  speed-bin-3-light: "#C98F4E"
  speed-bin-4-light: "#A39C8C"
  speed-bin-5-light: "#8797A8"
  speed-bin-6-light: "#6D84A0"
  speed-bin-7-light: "#4F6A8C"
  speed-nodata-light: "#CFCCC6"
typography:
  numeral-l:
    fontFamily: "Martian Mono Variable, Martian Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "3.25rem"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.03em"
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 100"
  numeral-m:
    fontFamily: "Martian Mono Variable, Martian Mono, ui-monospace, monospace"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "\"tnum\""
  numeral-s:
    fontFamily: "Martian Mono Variable, Martian Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "Martian Mono Variable, Martian Mono, ui-monospace, monospace"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Martian Mono Variable, Martian Mono, ui-monospace, monospace"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.04em"
  body:
    fontFamily: "Martian Mono Variable, Martian Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 100"
  body-small:
    fontFamily: "Martian Mono Variable, Martian Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\""
  label:
    fontFamily: "Martian Mono Variable, Martian Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
    fontVariation: "\"wdth\" 87.5"
  micro:
    fontFamily: "Martian Mono Variable, Martian Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.02em"
    fontVariation: "\"wdth\" 87.5"
rounded:
  none: "0px"
  control: "2px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "20px"
  s-6: "24px"
  s-8: "32px"
  gap: "8px"
  bar: "56px"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.palladian}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "36px"
  button-hover:
    backgroundColor: "{colors.tile-raised}"
    textColor: "{colors.palladian}"
  button-active:
    backgroundColor: "{colors.tile-pressed}"
  button-primary:
    backgroundColor: "{colors.burning-flame}"
    textColor: "{colors.abyssal}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "36px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.truffle-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "36px"
  button-danger-hover:
    backgroundColor: "{colors.truffle-trouble}"
    textColor: "{colors.palladian}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.oatmeal}"
    rounded: "{rounded.control}"
    size: "36px"
  input:
    backgroundColor: "{colors.abyssal}"
    textColor: "{colors.palladian}"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  tile:
    backgroundColor: "{colors.blue-fantastic}"
    textColor: "{colors.palladian}"
    rounded: "{rounded.none}"
    padding: "16px"
  tile-inverse:
    backgroundColor: "{colors.oatmeal}"
    textColor: "{colors.abyssal}"
    rounded: "{rounded.none}"
    padding: "16px"
  tile-severe:
    backgroundColor: "{colors.truffle-trouble}"
    textColor: "{colors.palladian}"
    rounded: "{rounded.none}"
    padding: "16px"
  nav-bar:
    backgroundColor: "{colors.abyssal}"
    textColor: "{colors.palladian}"
    height: "56px"
    padding: "0 16px"
  nav-tab:
    textColor: "{colors.oatmeal-dim}"
    typography: "{typography.label}"
    padding: "0 12px"
  nav-tab-active:
    textColor: "{colors.palladian}"
  segmented-on:
    backgroundColor: "{colors.palladian}"
    textColor: "{colors.abyssal}"
    height: "28px"
  now-flag:
    backgroundColor: "{colors.burning-flame}"
    textColor: "{colors.abyssal}"
    typography: "{typography.micro}"
    padding: "1px 6px"
  map-popup:
    backgroundColor: "{colors.blue-fantastic}"
    textColor: "{colors.palladian}"
    rounded: "{rounded.none}"
    width: "288px"
---

# Design System: UOCT, Velocidad de buses

## Overview

**Creative North Star: "Papel milimetrado de noche"**

UOCT es un diagrama espacio-tiempo, no un muro de KPIs. Todo lo temporal comparte un mismo eje del día de 96 intervalos de 15 minutos y una sola línea AHORA, para que el operador vea la congestión desplazarse a lo largo de un eje en vez de leer números aislados. El mundo es papel milimetrado de ingeniería trabajado de noche: un suelo Abyssal con una retícula tenue de 16 px (un intervalo) y una retícula mayor cada 64 px (una hora), sobre el cual se apoyan tiles Blue Fantastic cortados en ángulo recto sobre una grilla bento estricta. Las leyendas van en mayúsculas mono de ancho reducido, con reglas finas, marcas de escala y denominadores en todas partes.

La densidad es alta y deliberada: es una herramienta de sala de control, el tema oscuro es la escena principal y el claro es la misma hoja invertida (papel Palladian, tiles de avena, tinta Abyssal). Una sola familia tipográfica, Martian Mono variable, carga todo, desde el numeral gigante hasta la marca de eje; la jerarquía sale del tamaño, del peso y del eje de ancho `wdth`, nunca de una segunda fuente. El color es escaso y semántico: Burning Flame es el AHORA, Truffle es lo grave, y la escala de velocidades hace que lo lento se lea caliente y lo normal retroceda hacia pizarra.

La paleta nace de las referencias fijadas por el usuario: `desing-refs/colors_ref.jpeg` (Palladian #EEE9DF, Oatmeal #C9C1B1, Blue Fantastic #2C3B4D, Burning Flame #FFB162, Truffle Trouble #A35139, Abyssal #1B2632) y la gramática de tiles de `desing-refs/dsshboard_ref.jpeg` (grilla bento, mayúsculas mono cuadradas, numerales grandes con denominador). Se rechazan de forma explícita las tarjetas redondeadas y suaves, el brillo (glow) y los gráficos de línea genéricos desconectados entre sí.

**Key Characteristics:**
- Un eje del día (96 × 15 min) y una línea AHORA compartidos por matriz, curva, mapa y regla del login.
- Suelo con retícula milimetrada; tiles planos de esquina viva sobre grilla de 12 columnas con 8 px de separación.
- Monoespaciada única (Martian Mono Variable) con cifras tabulares y mayúsculas de ancho 87.5.
- Numerales grandes siempre acompañados de su denominador o su unidad ("/ 13.6 KM/H", "/ 679 SEG.").
- Color reservado para significado: AHORA, severidad y la escala de velocidad; todo lo demás es tinta y regla.
- Tema oscuro por defecto; el claro invierte la hoja sin cambiar la gramática.

## Colors

Una hoja nocturna azul-pizarra con tinta crema, y dos únicos acentos cálidos que significan algo.

### Primary
- **Burning Flame** (burning-flame): el color del AHORA. Línea y bandera AHORA en la matriz y la curva, barra del intervalo actual, subrayado de la pestaña activa, relleno de la cuenta regresiva, botón primario, selección de texto, celdas de rango en el calendario y el color primario de Element Plus. En tema claro, cuando actúa como trazo o texto sobre papel, se oscurece a **Brasa de línea** (flame-line-light) para mantener contraste; el relleno sigue siendo Burning Flame. Un velo translúcido (`--now-wash`, 14 % en oscuro, 32 % en claro) marca columnas resaltadas, avisos y la opción seleccionada de un desplegable.

### Secondary
- **Truffle Trouble** (truffle-trouble): congestión severa y alertas. Relleno del tile de alertas activas, marcadores de alerta en el mapa, cuadros de alerta en listas, barras del ranking de tramos lentos, botón de peligro al pasar el cursor.
- **Truffle legible** (truffle-ink / truffle-ink-light): la misma severidad cuando va como texto sobre tile: porcentajes bajo el histórico, errores de campo, contorno del botón de peligro.

### Tertiary
- **Pizarra OK** (slate-ok): lectura "en o sobre el histórico" en el lector de celdas; color de éxito de Element Plus. En claro se resuelve a Blue Fantastic.

### Neutral
- **Abyssal** (abyssal): suelo del tema oscuro, barra superior, fondo hundido de los controles, tinta del tema claro y texto sobre Burning Flame.
- **Blue Fantastic** (blue-fantastic): superficie de todo tile, popup y tarjeta de mapa en oscuro.
- **Tile elevado / Tile presionado** (tile-raised, tile-pressed): hover y active de filas y botones, fondo de popovers, menús y notificaciones.
- **Palladian** (palladian): tinta principal en oscuro, suelo en claro, fondo de la cabecera invertida de los popups y del segmento activo del conmutador.
- **Oatmeal** (oatmeal): tinta secundaria, referencia histórica (línea discontinua de la curva) y el tile invertido "bajo su histórico".
- **Oatmeal tenue** (oatmeal-dim): tinta terciaria: rótulos de campos, marcas de eje, rangos, texto auxiliar.
- **Regla / Regla fuerte** (rule, rule-strong): filetes de 1 px entre filas y secciones; contorno de botones, controles y popovers. Sus pares claros son rule-light y rule-strong-light.
- **Papel claro** (paper-tile, paper-tile-raised, ink-muted-light, historic-light): tiles, hover, tinta terciaria e histórico del tema claro.

### Escala de velocidad
Siete intervalos compartidos por el mapa, la matriz espacio-tiempo, la distribución y cada leyenda (`src/utils/speedScale.ts`), en km/h (< 5 … ≥ 30) o en % del histórico (< 50 % … ≥ 130 %). Oscuro: speed-bin-1 a speed-bin-7; claro: speed-bin-1-light a speed-bin-7-light. Sin datos: speed-nodata, dibujado además con un rayado a 135° (`--nodata-hatch`) en las leyendas.

### Named Rules
**The Lento Caliente Rule.** Lo lento se lee caliente y lo normal retrocede. Solo los dos intervalos más lentos van saturados (terracota y naranja); la velocidad típica cae en el medio apagado y el tráfico rápido se hunde en pizarra. Lo anómalo es lo primero que encuentra el ojo.

**The Un Solo Ahora Rule.** El Burning Flame exacto pertenece al AHORA y a la acción primaria. La escala de velocidad usa sus propios naranjas derivados y nunca el valor exacto de la llama, para que la línea AHORA no se confunda con una celda lenta.

**The Color Con Significado Rule.** Un color que no sea tinta, regla, tile o suelo debe significar AHORA, severidad o un intervalo de la escala. No hay acentos decorativos.

## Typography

**Display Font:** Martian Mono Variable (con Martian Mono, ui-monospace, SFMono-Regular, Menlo, monospace)
**Body Font:** Martian Mono Variable
**Label/Mono Font:** Martian Mono Variable a ancho `wdth` 87.5

**Character:** Una sola monoespaciada de ingeniería, autoalojada vía `@fontsource-variable/martian-mono`. Las cifras tabulares alinean toda columna de números, y el eje de ancho estrecha los rótulos en mayúsculas para que las leyendas se lean como la rotulación de un plano.

### Hierarchy
- **Numeral L** (400, 3.25rem, 0.95): el número principal de un tile numeral; baja a Numeral M bajo 760 px.
- **Numeral M** (400, 2.25rem, 1): velocidad en el popup de segmento.
- **Numeral S** (400, 1.5rem, 1.1): lecturas de la tarjeta de estado del mapa.
- **Headline** (500, 1.375rem): el único h1 de cada página ("Estado de la red", "Velocidades registradas"). La tarjeta de login usa 1.75rem para la marca.
- **Title** (600, 0.9375rem, +0.04em): nombre de marca en la barra y velocidad destacada en el lector de celdas.
- **Body** (400, 0.8125rem, 1.5): prosa y texto base; párrafos a 72ch como máximo.
- **Body small** (400, 0.75rem): cuerpo de tablas, lecturas, nombres de tramo, contenido de notificaciones.
- **Label** (500, 0.6875rem, 0.08em, MAYÚSCULAS, `wdth` 87.5): títulos de tile, pestañas, botones, cabeceras de tabla, rótulos de la barra.
- **Micro** (400, 0.625rem, MAYÚSCULAS en rótulos de campo): marcas de eje, rangos, metadatos de fila. Es el piso de tamaño del sistema.

### Named Rules
**The Denominador Rule.** Un numeral grande nunca va solo: lleva su denominador o su unidad a la derecha, en Body small y mayúsculas ("/ 13.6 KM/H", "/ 679 SEG."), y un pie separado por filete con la comparación.

**The Una Familia Rule.** La jerarquía se construye con tamaño, peso, mayúsculas y el eje `wdth`. No se introduce una segunda familia.

## Layout

El suelo es la hoja milimetrada: retícula menor de 16 px y mayor de 64 px dibujada con gradientes de 1 px sobre `body`. Las páginas se centran a un máximo de 1760 px con 8 px de margen lateral; los tiles se disponen en una grilla de 12 columnas separada por 8 px (`--gap`), y el suelo se ve entre ellos como junta.

El panel ubica la matriz espacio-tiempo en 8/12 a la izquierda, y a la derecha en 4/12 una grilla 2×2 de tiles numerales sobre el ranking de tramos lentos; debajo, tres tiles de 4/12 (distribución, alertas, cobertura). Bajo 1240 px los numerales pasan a una fila de cuatro y la matriz ocupa el ancho completo; bajo 760 px todo se apila a una columna y los numerales vuelven a 2×2. Las páginas de datos (Velocidades, Mensual, Umbral, Ejes) repiten una misma pila: cabecera de página, tile de parámetros con acciones empujadas a la derecha, tile de tabla con pie de metadatos y paginador.

El ritmo interno parte de una base de 4 px (4, 8, 12, 16, 20, 24, 32). Los tiles usan 16 px de relleno (12 px en móvil); las filas de lista usan 9 px verticales con filete superior. La barra superior mide 56 px y en móvil (≤ 720 px) se parte en dos filas de 48 px: marca, lecturas y acciones arriba, pestañas desplazables con desvanecido al borde abajo.

## Elevation & Depth

El sistema es plano. Los tiles no tienen sombra: se separan del suelo por tono (Blue Fantastic sobre Abyssal) y la retícula visible entre ellos. Los controles se hunden en vez de elevarse: su fondo es el suelo, con contorno de 1 px en inset. La única sombra, `--shadow-float`, es ambiental y está reservada a lo que realmente flota sobre otra superficie: tarjetas y popups sobre el mapa, notificaciones, popovers y la tarjeta de login, que es el único objeto sobre la hoja vacía.

### Shadow Vocabulary
- **Flotante** (`box-shadow: 0 12px 32px -8px rgba(8, 12, 18, 0.55), 0 2px 6px rgba(8, 12, 18, 0.35)`; en claro `0 12px 32px -10px rgba(27, 38, 50, 0.28), 0 2px 6px rgba(27, 38, 50, 0.12)`): superficies sobre el mapa y superposiciones.
- **Contorno en inset** (`box-shadow: 0 0 0 1px <regla fuerte> inset`): borde de campos y selectores; pasa a Oatmeal al hover y a la línea AHORA al foco.
- **Anillo de fijación** (`box-shadow: 0 0 0 2px <tinta>, 0 0 0 3px <suelo>`): celda fijada en la matriz; es un contorno, no una sombra.

### Named Rules
**The Plano Por Defecto Rule.** Un tile en reposo nunca lleva sombra ni brillo. Si algo necesita destacarse, cambia de tono (tile invertido, tile severo) o gana un filete, no se levanta.

## Shapes

Esquina viva. Los tiles, popups, tarjetas de mapa, marcadores y grupos de control del mapa van a 0 px. Los controles interactivos (botones, campos, selectores, conmutadores) llevan un redondeo mínimo de 2 px, apenas para que el borde no vibre. Las formas de datos son rectángulos: celdas de la matriz, barras de la curva, muestras de leyenda de 14 × 8 px, banderas de alerta de 10 × 10 px. La marca UOCT es una grilla de 3 × 3 cuadrados con tres celdas en Burning Flame. Los íconos son Material Symbols Sharp (terminales rectos, peso 300, sin relleno), coherentes con la mono.

## Components

### Buttons
Rotulación técnica: rectángulos de contorno fino con texto Label en mayúsculas.
- **Shape:** esquina casi viva (2 px), alto 36 px, relleno horizontal 16 px, ícono de 18 px con 8 px de separación.
- **Default:** fondo transparente, contorno de regla fuerte, tinta principal.
- **Hover / Active:** el contorno pasa a Oatmeal y el fondo a tile elevado; active a tile presionado. Transición de 180 ms con la curva `--ease-out`. Foco: contorno de 2 px en la línea AHORA con 2 px de separación.
- **Primary:** relleno y contorno Burning Flame, texto Abyssal; al hover el contorno pasa a tinta. Uno por vista como máximo (Entrar, Guardar, Descargar).
- **Danger:** contorno Truffle y texto Truffle legible; al hover se rellena en Truffle.
- **Icon:** cuadrado de 36 px; en la barra superior va sin contorno hasta el hover.
- **Deshabilitado:** texto terciario, contorno de regla, sin relleno; un botón primario ocupado muestra un ícono girando y el texto en gerundio.

### Chips
- **Conmutador segmentado (KM/H / % HIST.):** segmentos de 28 px unidos por un contorno de regla fuerte; el activo se invierte (fondo tinta, texto suelo).
- **Muestras de leyenda:** rectángulo de color de 14 × 8 px seguido del rango en Micro; "Sin datos" con rayado.

### Cards / Containers
- **Corner Style:** esquina viva (0 px).
- **Background:** Blue Fantastic en oscuro, papel claro en claro. Variantes: invertido (Oatmeal con tinta Abyssal) para la comparación con el histórico, severo (Truffle con tinta Palladian) para alertas activas.
- **Shadow Strategy:** ninguna en reposo (ver Elevation & Depth).
- **Border:** ninguno; las secciones internas se separan con filetes de regla de 1 px.
- **Internal Padding:** 16 px; cabecera con título en Label y, a la derecha, la escala o el conteo en Micro terciario.

### Inputs / Fields
- **Style:** fondo hundido en el color del suelo, contorno de regla fuerte en inset, 2 px de radio, alto 36 a 40 px; rótulo encima en Micro mayúsculas terciario con 6 px de separación. Íconos de 18 px en tinta terciaria.
- **Focus:** el contorno inset pasa a la línea AHORA; el cursor de texto también usa la línea AHORA.
- **Error / Disabled:** contorno y mensaje en Truffle legible; deshabilitado en tinta terciaria sobre tile.
- **Campo de umbral:** un número grande de 4rem sin caja, solo con subrayado de 2 px que pasa a la línea AHORA al foco.
- **Element Plus:** selectores, calendarios, tablas, notificaciones y mensajes están re-cortados vía variables `--el-*` en `base.css`; el primario de Element Plus es el AHORA y los popovers usan tile elevado con contorno fuerte.

### Navigation
- **Barra superior** fija de 56 px sobre el suelo con filete inferior fuerte, dividida por filetes verticales en cuatro zonas: marca (grilla 3 × 3 + "UOCT" + subtítulo en Label), pestañas, lecturas en vivo y acciones.
- **Pestañas:** Label en tinta terciaria; hover y activa en tinta principal; la activa se subraya con una barra Burning Flame de 2 px que crece desde la izquierda.
- **Lecturas en vivo:** pares rótulo Micro / valor Body small tabular (Intervalo, Actualizado, Próxima) con una barra de progreso de 36 × 2 px que se llena en Burning Flame hasta la próxima actualización.
- **Móvil:** dos filas de 48 px; las pestañas se desplazan horizontalmente con desvanecido en el borde derecho.

### Tile numeral
Título Label arriba; numeral L con su denominador al pie del tile; pie en Label separado por un filete al 22 % del color de texto. Admite las variantes invertida y severa. Carga con esqueleto; error con texto y botón Reintentar, nunca un spinner sobre el contenido.

### Matriz espacio-tiempo (componente firma)
Tramos × 96 intervalos pintados en canvas con la escala de velocidad, eje de km a la izquierda, y directamente debajo, sobre el mismo eje x, la curva del día: barras de hoy en Oatmeal al 55 % (la del intervalo actual en Burning Flame) contra el histórico como línea escalonada discontinua de 1.5 px. Una línea AHORA de 2 px atraviesa matriz y curva, con su bandera Burning Flame y la hora en Micro. Sobre la matriz, el lector de celda (tramo invertido en tinta, hora, velocidad, % del histórico en pizarra o Truffle); al pasar el cursor la columna se lava en el velo AHORA y la fila recibe un contorno de 1 px; al hacer clic la celda queda fijada con el anillo de fijación y ofrece abrirla en el mapa. Pie con clave de barras, histórico y AHORA.

### Mapa
El mapa base de Mapbox se re-entinta capa por capa con la paleta del mundo (`BASEMAP_INK`: tierra en el suelo, calles en Blue Fantastic, agua más profunda en oscuro; papel en claro) para que los tramos coloreados por la escala sean lo único con color. Un riel acoplado al borde izquierdo (376 px, tile plano con filete, se pliega con una pestaña y desplaza la cámara) lleva las lecturas del intervalo y dos listas, Alertas y Más lentos vs. histórico, cuyas filas resaltan el tramo al pasar el cursor y lo enfocan al hacer clic. La leyenda flota abajo y es además la distribución de la red: una barra apilada con la proporción de segmentos por rango y el conteo junto a cada muestra; un clic en un rango lo aísla en el mapa. Los dos rangos más lentos se dibujan más anchos y encima en los cruces, y desde zoom 13 un cheurón marca el sentido de cada tramo. Al pasar el cursor, un lector invertido sigue al puntero (eje, segmento, velocidad / histórico, %). Los conmutadores de capas (Alertas, Cámaras) flotan arriba a la derecha; los popups tienen cabecera invertida (fondo tinta, texto suelo), cuerpo en tile, numeral M con denominador y cierre de 32 px. Marcadores de alerta: cuadro Truffle de 28 px con borde Palladian de 2 px e ícono relleno; marcadores de cámara: cuadro de tile con contorno de regla fuerte.

### Carga y movimiento
Esqueletos con brillo lento (1.4 s) en lugar de spinners sobre datos; transiciones de estado de 180 ms con `cubic-bezier(0.16, 1, 0.3, 1)`; con `prefers-reduced-motion` toda animación y transición se anula.

## Do's and Don'ts

### Do:
- **Do** colocar toda vista temporal sobre el eje de 96 intervalos de 15 minutos y mostrar la línea AHORA en Burning Flame con su bandera horaria.
- **Do** acompañar cada numeral grande con su denominador o unidad y un pie de comparación separado por filete.
- **Do** usar la escala de `speedScale.ts` (y sus leyendas) para toda codificación de velocidad, en mapa, matriz y gráficos por igual.
- **Do** separar tiles del suelo solo por tono y la junta de 8 px; separar secciones internas con filetes de 1 px.
- **Do** rotular títulos de tile, pestañas, botones y cabeceras de tabla en Label: mayúsculas, 0.08em, `wdth` 87.5.
- **Do** mantener cada vista en tema oscuro y claro a la vez, leyendo colores solo de las variables de `base.css`.
- **Do** mostrar carga con esqueletos y errores con texto más un botón Reintentar dentro del tile.

### Don't:
- **Don't** redondear tiles ni tarjetas ni darles sombra o brillo en reposo; radio 0 px en superficies y 2 px solo en controles.
- **Don't** usar el Burning Flame exacto en datos ni como decoración; es el AHORA y la acción primaria.
- **Don't** introducir un gráfico de línea aislado con su propio eje temporal; si es temporal, comparte el eje del día.
- **Don't** agregar una segunda familia tipográfica ni bajar texto por debajo de Micro (0.625rem).
- **Don't** usar íconos redondeados o rellenos fuera de los marcadores de alerta; los íconos son Material Symbols Sharp de peso 300.
- **Don't** dejar color en el mapa base: el color del mapa pertenece a los tramos y a los marcadores.
