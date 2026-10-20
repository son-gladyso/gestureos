# GestureOS

[简体中文](README.zh-CN.md) · [English](../../README.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [繁體中文](README.zh-TW.md)

**Convierte una pinza con los dedos, una mano abierta o un puño en una interacción con una escena de partículas en el navegador.**

GestureOS es un pequeño entorno experimental para desarrolladores de programación creativa y cualquier persona interesada en la interacción mediante cámara. Combina el seguimiento de manos de MediaPipe con efectos visuales de partículas y mantiene las reglas de los gestos separadas del renderizado, para que puedas explorar tanto el efecto como su funcionamiento.

Los fotogramas de la cámara permanecen en el navegador y este proyecto no los sube a ningún servidor. La demo utiliza MediaPipe desde una CDN durante la ejecución, por lo que el primer inicio requiere conexión a la red.

[Probar en local](#run-locally) · [Escenarios de gestos](#what-to-try) · [Solución de problemas](#troubleshooting) · [Contribuir](#help-improve-gestureos)

<a id="why-try-it"></a>

## ¿Por qué probarlo?

Explora la interacción mediante cámara sin crear desde cero una canalización de seguimiento de manos. GestureOS conecta un clasificador de gestos pequeño e inspeccionable con una escena de partículas en el navegador para que puedas experimentar con la interacción y comprender sus reglas.

- Prueba tres estados de gesto explícitos: pinza, mano abierta y puño, con un estado alternativo de seguimiento.
- Inspecciona el clasificador independientemente de la cámara y del bucle de renderizado.
- Mantén los fotogramas de la cámara en tu navegador, teniendo en cuenta que las bibliotecas de ejecución se siguen cargando desde una CDN.

Esta es una escena experimental en el navegador, no un sistema operativo alternativo ni una herramienta para controlar otras aplicaciones de escritorio. El comportamiento de los gestos depende de la posición de la cámara, la iluminación y la claridad con la que se vea tu mano.

<a id="what-to-try"></a>

## Qué probar

| Escenario | Qué observar | Por qué importa |
| --- | --- | --- |
| Pasar de una mano abierta a un puño | El estado detectado y la respuesta correspondiente de las partículas | Relaciona una acción física con una respuesta visible en el navegador. |
| Acercar el pulgar y el índice | La clasificación de pinza | Explora un gesto pequeño y explícito en lugar de un vocabulario de comandos opaco. |
| Mantener una postura cerca de un límite de detección | Los cambios de estado al variar las distancias entre puntos de referencia | Comprende por qué importan la distancia a la cámara y la elección de umbrales. |
| Cambiar una regla del clasificador | Una prueba específica y la escena en directo | Desarrolla el comportamiento de la interacción sin mezclarlo con el bucle de renderizado. |

El clasificador utiliza umbrales de distancia entre puntos de referencia, no un modelo de gestos personalizado y entrenado. Sus umbrales se pueden inspeccionar, pero eso no demuestra su precisión entre distintos usuarios, cámaras o distancias de observación.

<a id="try-the-interaction"></a>

## Prueba la interacción

Sigue [Ejecución en local](#run-locally), permite el acceso a la cámara y prueba una mano abierta, un puño y una pinza con el pulgar y el índice. Compara el estado detectado con la respuesta visible de la escena. Si el seguimiento es irregular, cambia la iluminación o la distancia antes de interpretarlo como un resultado del clasificador.

Este README todavía no incluye una demostración grabada con una cámara real. Los pasos anteriores permiten inspeccionar la aplicación real; no afirman que se hayan validado todas las cámaras o todos los navegadores.

<a id="requirements"></a>

## Requisitos

- Node.js 20+ (el proyecto utiliza actualmente Node 24 en las verificaciones locales)
- Un navegador moderno con acceso a la cámara
- HTTPS o `localhost` (requisito de las API de cámara)

<a id="run-locally"></a>

## Ejecución en local

1. Instala las dependencias:

```bash
npm install
```

2. Sirve esta carpeta con un servidor estático local. Por ejemplo:

```bash
npx http-server . -p 8080
```

3. Abre `http://localhost:8080` y permite que esta página utilice la cámara.

**Tu primera comprobación satisfactoria:** la página muestra una interacción controlada por la cámara y cambiar entre mano abierta, puño y pinza produce cambios observables en el estado o la escena. Si la página se carga pero el seguimiento no funciona, utiliza los pasos de solución de problemas de abajo; cargar la página por sí solo no constituye una prueba de aceptación de la cámara.

El comando del servidor estático utiliza `npx` y puede descargar `http-server` si aún no está disponible. Los scripts de MediaPipe que se cargan durante la ejecución y las fuentes web también utilizan servidores externos; el procesamiento local de la cámara no implica un primer inicio completamente sin conexión.

<a id="quality-commands"></a>

## Comandos de calidad

- `npm run lint`: comprobaciones de ESLint
- `npm run format:check`: comprobación de Prettier
- `npm test`: pruebas unitarias + comprobaciones de integridad
- `npm run check`: lint + formato + pruebas

<a id="project-structure"></a>

## Estructura del proyecto

- `index.html`: estructura de la aplicación y disposición de la interfaz
- `styles.css`: sistema visual y animaciones
- `script.js`: bucle de ejecución, partículas, gestos y ciclo de vida de la cámara
- `gesture-config.js`: constantes de ejecución inmutables
- `gesture-helpers.js`: funciones de utilidad compartidas
- `gesture-detector.js`: lógica pura de clasificación de gestos
- `gesture-policies.js`: decisiones de políticas de calidad/cámara y correspondencia de errores
- `tests/run-tests.mjs`: comprobaciones unitarias de configuración, utilidades, detector y políticas
- `scripts/quality-check.mjs`: comprobaciones estrictas de UTF-8 e integridad estructural

<a id="troubleshooting"></a>

## Solución de problemas

- Si la cámara falla, verifica los permisos y cierra otras aplicaciones que la estén utilizando.
- Si ejecutas la aplicación en un servidor remoto, utiliza HTTPS.
- Si no se cargan los scripts de la CDN, comprueba el acceso de red a `cdn.jsdelivr.net`.

<a id="common-questions"></a>

### Preguntas frecuentes

**¿Puede controlar mi escritorio u otras aplicaciones?** No. La interacción se limita a esta demo en el navegador.

**¿Puedo abrir `index.html` directamente?** Utiliza el servidor local indicado en la documentación. Las API de cámara requieren un contexto seguro adecuado, como `localhost` o HTTPS.

**¿Por qué cambia un gesto cuando me acerco?** La clasificación utiliza distancias normalizadas entre puntos de referencia y umbrales fijos. La posición de la cámara, la visibilidad de la mano y la postura pueden afectar al resultado; es un límite útil para probar, no una prueba de que exista un sistema de control universal.

**¿Tengo que compartir vídeo de la cámara para comunicar un error?** No. Empieza por indicar las versiones del navegador y del sistema operativo, la postura, las condiciones de iluminación, el estado esperado y el observado, y una prueba con puntos de referencia sintéticos si es posible.

<a id="repository-scope"></a>

## Alcance del repositorio

Este repositorio contiene el código para el navegador, la lógica determinista de clasificación de gestos, las pruebas y las comprobaciones de calidad. Se excluyen intencionadamente los binarios locales, el estado del editor, los registros, las carpetas de dependencias y las páginas experimentales temporales.

<a id="help-improve-gestureos"></a>

## Ayuda a mejorar GestureOS

Se agradecen las contribuciones pequeñas y concretas. Algunos buenos puntos de partida son los casos límite del clasificador, los errores de permisos de cámara más claros, la accesibilidad mediante teclado y la documentación que ayude a reproducir una interacción.

1. Lee el mapa de módulos anterior y elige un comportamiento que mejorar.
2. Para cambios en el clasificador o las políticas, añade un caso específico en `tests/run-tests.mjs`.
3. Ejecuta `npm run check` y describe qué comprobaciones de navegador/cámara has realizado realmente.
4. Abre una solicitud de incorporación de cambios explicando el problema observado, la modificación y las limitaciones que persisten.

| Primera contribución | Por dónde empezar | Qué incluir en la PR |
| --- | --- | --- |
| Un caso límite mal clasificado | `gesture-detector.js`, `tests/run-tests.mjs` | Puntos de referencia sintéticos y el estado esperado; explica por qué debería cambiar la regla. |
| Un fallo de cámara más claro | `gesture-policies.js`, `script.js` | La condición de fallo, el mensaje esperado y una prueba de regresión de la política. |
| Instrucciones más fáciles de usar | `index.html`, `README.md` | Una interacción o un paso de configuración reproducible; distingue las comprobaciones en dispositivos reales de la revisión estática. |

Para cambios de renderizado, conserva la posibilidad de probar la lógica de clasificación de forma independiente. Para cambios de cámara, incluye los casos de denegación de permisos, cámara no disponible y reintento cuando corresponda.

Para cambios de interacción más amplios, abre primero una [issue](https://github.com/son-gladyso/gestureos/issues) para discutir el alcance. Utiliza entradas de prueba sintéticas siempre que sea posible; no adjuntes grabaciones de la cámara de otra persona sin permiso.
