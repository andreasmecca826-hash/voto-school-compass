package it.voto.school;

import static org.junit.Assert.assertFalse;

import android.content.Context;

import androidx.test.platform.app.InstrumentationRegistry;
import androidx.work.WorkInfo;
import androidx.work.WorkManager;

import it.voto.widget.WidgetData;

import org.junit.Test;

import java.util.List;
import java.util.concurrent.TimeUnit;

public class WidgetRefreshSchedulingTest {
    @Test
    public void refreshQueuesBackgroundWidgetWorkWhenVotoSessionExists() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        WorkManager workManager = WorkManager.getInstance(context);
        try {
            DidupSyncVault.saveSession(context, "test-access-token", "test-refresh-token", Long.MAX_VALUE);
            WidgetData.refresh(context);
            List<WorkInfo> work = workManager
                    .getWorkInfosForUniqueWork("voto-widget-refresh")
                    .get(5, TimeUnit.SECONDS);

            assertFalse(work.isEmpty());
        } finally {
            workManager.cancelUniqueWork("voto-widget-refresh").getResult().get(5, TimeUnit.SECONDS);
            WidgetData.clearForLogout(context);
            DidupSyncVault.clearAll(context);
        }
    }
}
