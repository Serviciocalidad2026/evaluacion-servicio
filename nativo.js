// Puente entre la página del técnico y las funciones nativas de Android.
// Lo compila esbuild (npm run preparar) y queda como www/nativo.js.
import { registerPlugin } from "@capacitor/core";
import { BackgroundGeolocation } from "@capgo/background-geolocation";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// Complemento propio de la app (android_extra/AjustesCelularPlugin.java)
const AjustesCelular = registerPlugin("AjustesCelular");

window.CottechNativo = {
  iniciarGps(opciones, alRecibir) {
    return BackgroundGeolocation.start(
      {
        backgroundMessage: opciones.mensaje,
        backgroundTitle: opciones.titulo,
        requestPermissions: true,
        stale: false,
        distanceFilter: 0
      },
      (ubicacion, error) => alRecibir(ubicacion || null, error || null)
    );
  },
  detenerGps() {
    return BackgroundGeolocation.stop();
  },
  abrirAjustes() {
    return BackgroundGeolocation.openSettings();
  },
  estadoCelular() {
    return AjustesCelular.estado();
  },
  pedirBateriaSinRestriccion() {
    return AjustesCelular.pedirBateriaSinRestriccion();
  },
  abrirInicioAutomatico() {
    return AjustesCelular.abrirInicioAutomatico();
  },
  // Guarda el PDF en la memoria temporal de la app y abre "Compartir"
  // (el técnico elige: guardarlo, mandarlo por WhatsApp, Drive, etc.).
  async compartirPdf(nombre, base64) {
    const limpio = String(nombre || "orden.pdf").replace(/[^A-Za-z0-9_.-]/g, "_");
    const archivo = await Filesystem.writeFile({ path: limpio, data: base64, directory: Directory.Cache });
    await Share.share({ title: limpio, dialogTitle: "Guardar o enviar el PDF", files: [archivo.uri] });
  }
};
