# Carpeta app_nativa · App Android del técnico

Esta carpeta va en el repositorio de GitHub Pages, junto a `tecnico.html`.

**No hay que tocarla ni compilar nada en la PC.** GitHub fabrica la app sola con el archivo `.github/workflows/app-android.yml`. Los pasos están en **GUIA_APP_ANDROID_v2.5.md**.

## Qué hay aquí

| Archivo | Para qué sirve |
|---|---|
| `package.json` | Lista de piezas: Capacitor 8 y el complemento de GPS en segundo plano. |
| `capacitor.config.json` | Nombre (Cottech Técnico) e identificador (`com.cottech.tecnico`) de la app. **No cambies el identificador**: si cambia, Android la toma como otra app y no se actualiza. |
| `preparar.mjs` | Convierte `../tecnico.html` en la app: librerías sin señal, número de versión, permisos y código nativo. |
| `src/nativo.js` | Puente entre la página y Android: GPS en segundo plano y ajustes del celular. |
| `android_extra/` | Código Java propio: ajuste de batería e inicio automático. |
| `iconos.py` | Pone `Icono.png` como ícono de la app. |

## Si algún día quieres compilar en tu PC (opcional)

Necesitas:
- Node 22 o superior.
- Android Studio Otter 2025.2.1 o superior.
- JDK 21.

Desde esta carpeta ejecuta:
```
npm install
npm run preparar
npm run abrir
```
La app que compiles en tu PC **no** se puede instalar encima de la de GitHub si no la firmas con la misma llave (`cottech-firma.jks`, alias `cottech`).
