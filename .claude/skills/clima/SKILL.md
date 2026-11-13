---
name: clima
description: Consulta el clima actual y el pronóstico de los próximos días para una ciudad usando la API gratuita de Open-Meteo (sin API key). Úsala cuando el usuario pregunte por el clima, la temperatura, si va a llover, el pronóstico o el tiempo en un lugar, o invoque /clima.
---

# Clima

Obtiene el clima actual y el pronóstico de una ciudad con el script `clima.ps1` que está en esta misma carpeta. Usa Open-Meteo (geocodificación + pronóstico), que es gratuito y no necesita API key.

## Cómo usarla

1. Determina la ciudad:
   - Si el usuario la indicó (o la pasó como argumento a `/clima`), úsala.
   - Si no indicó ninguna, usa **Popayán, Colombia** por defecto: ejecuta el script sin `-Ciudad` (ya toma Popayán con país `CO`) y menciónalo en la respuesta.
2. Determina cuántos días de pronóstico quiere (por defecto 3, máximo 16).
3. Ejecuta el script con la herramienta PowerShell:

   ```powershell
   & ".claude/skills/clima/clima.ps1" -Ciudad "Medellín" -Dias 3
   ```

   Parámetros opcionales:
   - `-Pais "CO"`: código ISO del país, para desambiguar ciudades con el mismo nombre.
   - `-Json`: devuelve los datos crudos en JSON en lugar del resumen en texto.

4. Responde en español con un resumen breve: condición actual, temperatura y sensación térmica, humedad, viento y el pronóstico día por día (máx/mín y probabilidad de lluvia). Añade una recomendación corta si aplica (llevar paraguas, abrigo, protector solar).

## Errores

- Si el script dice que no encontró la ciudad, pide al usuario que la escriba de otra forma o que indique el país.
- Si falla la conexión, informa del error tal cual; no inventes datos del clima.
