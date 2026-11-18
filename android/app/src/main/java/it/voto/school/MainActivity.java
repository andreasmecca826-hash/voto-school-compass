package it.voto.school;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AppIconPlugin.class);
<<<<<<< HEAD
=======
        registerPlugin(DidupSyncPlugin.class);
>>>>>>> e48bbe463b01a481c3470249d2dc18f7ca72f677
        super.onCreate(savedInstanceState);
    }
}
