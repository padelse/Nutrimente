# Mi Plan Nutricional — versión 2

PWA personal preparada para crecer con nuevos planes semanales y recetas.

## Estructura de datos

- `recipes.json`: base de datos independiente de recetas. Cada receta tiene un ID único.
- `plans.json`: planes semanales. Cada día solo guarda los IDs de las recetas que utiliza.
- `index.html`: interfaz.
- `app.js`: lógica de navegación, selector de planes y buscador.
- `styles.css`: diseño.
- `manifest.json` + `sw.js`: instalación como PWA y caché offline.
- `icon-180.png`: icono.

## Añadir una nueva semana

Añade una nueva entrada en `plans.json`, por ejemplo:

`"week-2": { "id": "week-2", "name": "Semana 2", ... }`

El selector de la aplicación la detectará automáticamente. No es necesario modificar `index.html` ni `app.js`.

## Añadir una receta

Añade una nueva receta en `recipes.json` con un ID único. Después usa ese ID en `comida` o `cena` dentro de `plans.json`.

Si una receta ya existe, reutiliza su ID en lugar de duplicarla.

## Importante al modificar datos publicados

Después de subir cambios a GitHub Pages, el Service Worker puede conservar temporalmente una versión anterior en caché. Si la aplicación no muestra los cambios inmediatamente, cerrar/reabrir Safari o actualizar la aplicación suele resolverlo; la versión incluye limpieza automática del caché anterior al activarse.

## Desarrollo local

Como la aplicación carga JSON mediante `fetch`, no conviene abrir `index.html` directamente con doble clic. Para probarla localmente:

`python3 -m http.server 8000`

y abrir `http://localhost:8000`.

## Publicación

Sube todos los archivos a la raíz de un repositorio de GitHub y activa GitHub Pages desde:

Settings → Pages → Deploy from a branch → main / root.


## Navegación fija

La barra con las flechas de navegación de los días permanece visible mientras se hace scroll por la semana, por lo que no es necesario volver arriba para cambiar de día.

## Versión 3

- Las flechas cambian el día seleccionado y desplazan automáticamente ese día hasta la parte superior, debajo de la barra de navegación.
- El botón Hoy siempre muestra el día real de la semana actual; no depende del día seleccionado en la vista Plan.
- Los planes son recurrentes y solo utilizan los nombres de los días de la semana, sin fechas concretas.
- Las recetas tienen grupos: almuerzo-entrante, almuerzo-principal, cena-entrante y cena-principal.
- Los favoritos se guardan en el iPhone mediante `localStorage`, por lo que permanecen al cerrar/reabrir la PWA en el mismo dispositivo y navegador.
- Se añade una sección Favoritos independiente.

### Grupos de recetas
Los grupos de la primera semana se han asignado según su posición en el plan: primera receta = entrante y segunda receta = principal, tanto para almuerzo como para cena. Una receta puede tener varios grupos si aparece en distintos contextos.

## Navegación de recetas
El botón «Volver» devuelve a la vista desde la que se abrió la receta: Hoy, Plan, Recetas o Favoritos.
