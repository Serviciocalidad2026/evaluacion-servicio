// Puente entre la página del técnico y las funciones nativas de Android.
// Lo compila esbuild (npm run preparar) y queda como www/nativo.js.
import { registerPlugin } from "@capacitor/core";
import { BackgroundGeolocation } from "@capgo/background-geolocation";

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
  }
};
