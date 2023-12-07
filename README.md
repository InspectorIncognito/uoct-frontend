# Project frontend template

User interface 

## 1. Configuración

Para ejecutar el proyecto es necesario tener instalado previamente [nodejs](https://nodejs.org/en/).

El proyecto está montado sobre vite + vuejs + typescript.

### Activar autoformateado con Eslint en Pycharm

Para mantener el código en un formato estandar se utiliza Eslint, pero para que se ejecute sin tener que invertir tiempo
en ello, se debe activar el autoejecutado al guardar. Para realizar esto se deben seguir los siguientes pasos:

- Abrir la ventana de configuración del proyecto
- Buscar la cadena de texto `run eslint --fix on save`. El buscador destacará la sección donde aparece, a la izquierda
  del texto hay un checkbox que debe ser activado.
- Ahora, cada vez que se guarde un archivo que tenga la extensión `js, ts, jsx, tsx, html, vue` se ejecutará el
  comando `eslint --fix` sobre el archivo a guardar.

### Variables de entorno

Para ejecutar el proyecto, es necesario definir un conjunto de variables de entorno, esto se puede lograr creando un
archivo de nombre `env.development` con el siguiente contenido:

```
NODE_ENV=development

VITE_BASE_URL=http://endpoint_to_api

VITE_I18N_LOCALE=es
VITE_I18N_FALLBACK_LOCALE=en
```

### Project install

To install project you need to call the command `npm install`.

### Compiles and hot-reloads for development

Starts a local web server with Hot Module Replacement (HMR) for development: `npm run dev`

### Compiles and minifies for production

Builds the project, and outputs to the folder `./dist`: `npm run build`

### Run production preview

Start a local web server that serves the built solution from `./dist` for previewing: `npm run preview`

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).

## 2. Dependencias:

- Element-plus: librería para componentes visuales
- Axios:
- pinia:
- i18n:
- router: