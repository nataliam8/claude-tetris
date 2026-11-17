# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Descripción

Juego de bloques que caen, hecho con JavaScript vanilla, HTML5 Canvas y CSS. No tiene dependencias, ni `package.json`, ni build, ni linter, ni tests. El código, la interfaz y la documentación están en español.

## Ejecutar

Se sirve como sitio estático desde la raíz del repo:

```bash
python -m http.server 8000   # luego abrir http://localhost:8000
npx serve .
```

También funciona abriendo `index.html` directamente (`start index.html` en Windows). Como no hay tests automatizados, los cambios se verifican cargando la página en un navegador.

## Arquitectura

Son tres archivos: `index.html` (DOM y los dos canvas), `style.css` y `game.js`, que contiene toda la lógica en un único script clásico (no es un módulo ES) con `'use strict'`.

Conceptos de `game.js` que conviene tener claros:

- **Estado global mutable**: todo el estado de la partida vive en variables `let` a nivel de módulo (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropAccum`, `dropInterval`, `animId`…). `init()` reinicia todo y lo usa también el botón de reinicio.
- **Un mismo índice para tipo, color y celda**: cada pieza en `PIECES[i]` se codifica con el valor `i` en sus celdas no vacías, y ese valor es también el índice en `COLORS`. Al fijar una pieza (`merge`), el tablero guarda directamente ese índice (`0` = vacía). Si se agrega una pieza, hay que añadirla en la misma posición en `PIECES` y en `COLORS`; `randomPiece()` usa `PIECES.length - 1`, así que la nueva pieza sale automáticamente con la misma probabilidad que las demás. El índice 8 es la tuerca (anillo 3×3 con el centro vacío).
- **Colisiones**: `collide(shape, ox, oy)` es la única comprobación de validez. Se usa para mover, rotar (`tryRotate`, con desplazamientos laterales `[0,-1,1,-2,2]`), calcular la pieza fantasma (`ghostY`), la caída automática y detectar game over en `spawn()`. Las filas con `y < 0` se permiten, por encima del tablero.
- **Ciclo de una pieza**: `lockPiece()` → `merge()` → `clearLines()` (actualiza puntuación, nivel y `dropInterval`) → `spawn()` (pasa `next` a `current`, genera una nueva `next` y llama a `endGame()` si la nueva pieza ya colisiona).
- **Bucle**: `loop()` funciona con `requestAnimationFrame` y acumula el tiempo en `dropAccum` hasta llegar a `dropInterval`. La pausa y el game over cancelan el bucle con `cancelAnimationFrame(animId)`. Para reanudar se reinicia `lastTime` y se vuelve a llamar a `loop`.
- **Dibujo**: `draw()` vuelve a dibujar todo en cada frame (cuadrícula, tablero, fantasma con alfa 0.2 y pieza actual). `drawNext()` solo se ejecuta en `spawn()`. El HUD se actualiza con `updateHUD()` en cada tecla y al limpiar líneas.

## Restricciones al modificar

- Las dimensiones del `<canvas id="board">` en `index.html` deben valer `COLS × BLOCK` por `ROWS × BLOCK` (hoy 300×600). Si cambian `COLS`, `ROWS` o `BLOCK`, hay que actualizar ambos archivos.
- El canvas de vista previa (120×120) asume piezas de hasta 4×4 con bloques de 30px (`NB` en `drawNext`).
- Los ids del DOM que usa `game.js` (`board`, `next-canvas`, `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`) deben seguir existiendo en `index.html`.
- Los controles aparecen en tres lugares: el `keydown` de `game.js`, el panel de `index.html` y la tabla del `README.md`. Si cambian, hay que mantenerlos sincronizados.
