package com.cottech.tecnico;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ajustes del celular para que Android no cierre la app durante la jornada.
 * - estado(): dice si la app ya está "sin restricciones" de batería y la marca del celular.
 * - pedirBateriaSinRestriccion(): muestra la ventana del sistema "Permitir / No permitir".
 * - abrirInicioAutomatico(): abre la pantalla de "Inicio automático" (Xiaomi, Tecno, Infinix...)
 *   o, si el celular no la tiene, la pantalla de información de la app.
 */
@CapacitorPlugin(name = "AjustesCelular")
public class AjustesCelularPlugin extends Plugin {

    @PluginMethod
    public void estado(PluginCall call) {
        Context ctx = getContext();
        boolean sinRestriccion = false;
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            sinRestriccion = pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }
        JSObject r = new JSObject();
        r.put("bateriaSinRestriccion", sinRestriccion);
        r.put("fabricante", Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase());
        r.put("versionAndroid", Build.VERSION.SDK_INT);
        call.resolve(r);
    }

    @PluginMethod
    public void pedirBateriaSinRestriccion(PluginCall call) {
        Context ctx = getContext();
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            i.setData(Uri.parse("package:" + ctx.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Exception e) {
            abrirDetallesApp(ctx);
        }
        call.resolve();
    }

    @PluginMethod
    public void abrirInicioAutomatico(PluginCall call) {
        Context ctx = getContext();
        // Pantallas conocidas de "inicio automático". Si ninguna existe en este celular,
        // se abre la información de la app (ahí está Batería / Permisos).
        String[][] pantallas = {
            {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
            {"com.transsion.phonemaster", "com.cyin.himgr.autostart.AutoStartActivity"},
            {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
            {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"}
        };
        for (String[] p : pantallas) {
            try {
                Intent i = new Intent();
                i.setComponent(new ComponentName(p[0], p[1]));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
                call.resolve();
                return;
            } catch (Exception e) {
                // no existe en este celular: se prueba la siguiente
            }
        }
        abrirDetallesApp(ctx);
        call.resolve();
    }

    private void abrirDetallesApp(Context ctx) {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            i.setData(Uri.parse("package:" + ctx.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Exception e) {
            // sin pantalla de ajustes disponible: no se hace nada
        }
    }
}
