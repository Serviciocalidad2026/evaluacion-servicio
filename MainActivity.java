package com.cottech.tecnico;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // El complemento propio se registra ANTES de super.onCreate (así lo pide Capacitor).
        registerPlugin(AjustesCelularPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
