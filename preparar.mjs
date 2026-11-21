// =============================================================================
// Prepara la app Android del técnico. Normalmente lo ejecuta GitHub solo
// (archivo .github/workflows/app-android.yml); también funciona en una PC.
//
// Uso:  node preparar.mjs ../tecnico.html   (o npm run preparar)
//
// 1. Copia tecnico.html a www/index.html con el número de versión de la app.
// 2. Descarga las 2 librerías (QR y escáner) para que la app abra sin señal.
// 3. Compila el puente nativo (src/nativo.js → www/nativo.js).
// 4. Crea el proyecto Android, agrega permisos, el complemento propio y la versión.
// 5. Sincroniza todo con Android (npx cap sync android).
//
// Variables opcionales:
//   APP_VERSION_CODE  número de versión (si no se da, se calcula con la fecha y hora)
//   APP_REPO          usuario/repositorio de GitHub donde se publica la app
//                     (GitHub lo da solo como GITHUB_REPOSITORY)
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const WWW = path.join(RAIZ, "www");
const PAQUETE = "com.cottech.tecnico";
export const VERSION_BASE = "2.5";
export const REPO_POR_DEFECTO = "serviciocalidad2026/evaluacion-servicio";

export const LIBRERIAS = [
  ["https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js", "lib/qrcode.min.js"],
  ["https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js", "lib/html5-qrcode.min.js"]
];

export const PERMISOS_ANDROID = [
  "android.permission.INTERNET",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_LOCATION",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.CAMERA",
  "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"
];

/** Número de versión que siempre crece: minutos desde el 1 de enero de 2026 (UTC). */
export function codigoVersionPorFecha(ahoraMs = Date.now()) {
  return Math.floor((ahoraMs - Date.UTC(2026, 0, 1)) / 60000);
}

/** Convierte tecnico.html en la página de la app: librerías locales + datos de versión + puente nativo. */
export function transformarHtml(html, { build, repo } = {}) {
  if (!html.includes("function esNativo()")) {
    throw new Error("Este tecnico.html es de una versión anterior. Usa el tecnico.html v2.5 o superior.");
  }
  if (!html.includes("function revisarActualizacionApp()")) {
    throw new Error("Este tecnico.html no tiene el aviso de actualización. Usa el tecnico.html v2.5 o superior.");
  }
  if (!Number.isInteger(build) || build <= 0) throw new Error("Número de versión inválido.");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || "")) throw new Error(`Repositorio inválido: ${repo}`);

  let salida = html;
  for (const [url, local] of LIBRERIAS) {
    if (!salida.includes(`src="${url}"`)) throw new Error(`No se encontró la librería ${url} en tecnico.html`);
    salida = salida.replace(`src="${url}"`, `src="${local}"`);
  }
  salida = salida.replace(/\s*<link rel="manifest"[^>]*>/, "");
  const posScript = salida.indexOf("<script>");
  if (posScript < 0) throw new Error("No se encontró el script principal en tecnico.html");
  const datosApp =
    `<script>window.COTTECH_APP_BUILD = ${build}; window.COTTECH_APP_REPO = ${JSON.stringify(repo)};</script>\n` +
    '<script src="nativo.js"></script>\n';
  return salida.slice(0, posScript) + datosApp + salida.slice(posScript);
}

/** Agrega al AndroidManifest los permisos que falten (sin duplicar los existentes). */
export function agregarPermisos(manifest) {
  const faltantes = PERMISOS_ANDROID.filter(p => !manifest.includes(`"${p}"`));
  if (faltantes.length === 0) return manifest;
  const lineas = faltantes.map(p => `    <uses-permission android:name="${p}" />`).join("\n");
  const pos = manifest.indexOf("<application");
  if (pos < 0) throw new Error("AndroidManifest.xml sin <application>");
  return manifest.slice(0, pos) + lineas + "\n\n    " + manifest.slice(pos);
}

/** Pone versionCode y versionName en android/app/build.gradle. */
export function fijarVersion(gradle, codigo, nombre) {
  const reCodigo = /versionCode\s*(=\s*)?\d+/;
  const reNombre = /versionName\s*(=\s*)?"[^"]*"/;
  if (!reCodigo.test(gradle) || !reNombre.test(gradle)) {
    throw new Error("No se encontró versionCode/versionName en android/app/build.gradle");
  }
  return gradle
    .replace(reCodigo, m => (m.includes("=") ? `versionCode = ${codigo}` : `versionCode ${codigo}`))
    .replace(reNombre, m => (m.includes("=") ? `versionName = "${nombre}"` : `versionName "${nombre}"`));
}

/** Copia el complemento propio (AjustesCelular) y el MainActivity que lo registra. */
export function copiarCodigoNativo(carpetaAndroid) {
  const destino = path.join(carpetaAndroid, "app", "src", "main", "java", ...PAQUETE.split("."));
  if (!fs.existsSync(destino)) throw new Error(`No existe ${destino}. ¿Cambió el appId en capacitor.config.json?`);
  // Si la plantilla trae MainActivity en Kotlin, se quita para que no haya dos clases iguales.
  fs.rmSync(path.join(destino, "MainActivity.kt"), { force: true });
  for (const archivo of ["AjustesCelularPlugin.java", "MainActivity.java"]) {
    fs.copyFileSync(path.join(RAIZ, "android_extra", archivo), path.join(destino, archivo));
  }
}

async function main() {
  const origen = process.argv[2] ? path.resolve(process.argv[2]) : path.join(RAIZ, "..", "tecnico.html");
  if (!fs.existsSync(origen)) throw new Error(`No existe ${origen}`);
  const build = process.env.APP_VERSION_CODE ? Number(process.env.APP_VERSION_CODE) : codigoVersionPorFecha();
  const repo = (process.env.APP_REPO || process.env.GITHUB_REPOSITORY || REPO_POR_DEFECTO).trim();
  const nombreVersion = `${VERSION_BASE}.${build}`;
  console.log(`Versión de la app: ${nombreVersion} · Publicación: github.com/${repo}`);

  fs.rmSync(WWW, { recursive: true, force: true });
  fs.mkdirSync(path.join(WWW, "lib"), { recursive: true });

  console.log("1/5 · Copiando la app del técnico…");
  fs.writeFileSync(path.join(WWW, "index.html"), transformarHtml(fs.readFileSync(origen, "utf8"), { build, repo }), "utf8");
  const icono = path.join(path.dirname(origen), "Icono.png");
  if (fs.existsSync(icono)) fs.copyFileSync(icono, path.join(WWW, "Icono.png"));

  console.log("2/5 · Descargando librerías para uso sin señal…");
  for (const [url, local] of LIBRERIAS) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`No se pudo descargar ${url} (HTTP ${r.status}). Revisa la conexión a internet.`);
    fs.writeFileSync(path.join(WWW, local), Buffer.from(await r.arrayBuffer()));
  }

  console.log("3/5 · Compilando el puente nativo…");
  const esbuild = await import("esbuild");
  await esbuild.build({
    entryPoints: [path.join(RAIZ, "src", "nativo.js")],
    bundle: true,
    format: "iife",
    minify: true,
    outfile: path.join(WWW, "nativo.js")
  });

  const carpetaAndroid = path.join(RAIZ, "android");
  if (!fs.existsSync(carpetaAndroid)) {
    console.log("4/5 · Creando el proyecto Android…");
    execSync("npx cap add android", { cwd: RAIZ, stdio: "inherit" });
  } else {
    console.log("4/5 · Proyecto Android ya existe: se actualiza.");
  }
  const rutaManifest = path.join(carpetaAndroid, "app", "src", "main", "AndroidManifest.xml");
  fs.writeFileSync(rutaManifest, agregarPermisos(fs.readFileSync(rutaManifest, "utf8")), "utf8");
  const rutaGradle = ["build.gradle", "build.gradle.kts"]
    .map(n => path.join(carpetaAndroid, "app", n))
    .find(r => fs.existsSync(r));
  if (!rutaGradle) throw new Error("No se encontró android/app/build.gradle");
  fs.writeFileSync(rutaGradle, fijarVersion(fs.readFileSync(rutaGradle, "utf8"), build, nombreVersion), "utf8");
  copiarCodigoNativo(carpetaAndroid);
  fs.writeFileSync(path.join(RAIZ, "version_app.txt"), `${build}\n${nombreVersion}\n`, "utf8");

  console.log("5/5 · Sincronizando con Android…");
  execSync("npx cap sync android", { cwd: RAIZ, stdio: "inherit" });

  console.log(`\n✔ Listo (versión ${nombreVersion}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error("\n✘ " + err.message);
    process.exit(1);
  });
}
