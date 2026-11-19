package it.voto.school;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AppIconPlugin.class);
        registerPlugin(DidupSyncPlugin.class);
        registerPlugin(LocalLlmPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
