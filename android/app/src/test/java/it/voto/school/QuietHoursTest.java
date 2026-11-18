package it.voto.school;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class QuietHoursTest {
    @Test
    public void includesStartAndExcludesEndForDefaultWindow() {
        assertTrue(DidupSyncVault.isWithinQuietHours(true, "00:00", "06:00", 0));
        assertTrue(DidupSyncVault.isWithinQuietHours(true, "00:00", "06:00", 359));
        assertFalse(DidupSyncVault.isWithinQuietHours(true, "00:00", "06:00", 360));
        assertFalse(DidupSyncVault.isWithinQuietHours(true, "00:00", "06:00", 1439));
    }

    @Test
    public void supportsAWindowThatCrossesMidnight() {
        assertTrue(DidupSyncVault.isWithinQuietHours(true, "22:00", "06:00", 1320));
        assertTrue(DidupSyncVault.isWithinQuietHours(true, "22:00", "06:00", 0));
        assertTrue(DidupSyncVault.isWithinQuietHours(true, "22:00", "06:00", 359));
        assertFalse(DidupSyncVault.isWithinQuietHours(true, "22:00", "06:00", 360));
        assertFalse(DidupSyncVault.isWithinQuietHours(true, "22:00", "06:00", 720));
    }

    @Test
    public void disabledOrInvalidWindowsNeverPauseTheWorker() {
        assertFalse(DidupSyncVault.isWithinQuietHours(false, "00:00", "06:00", 120));
        assertFalse(DidupSyncVault.isWithinQuietHours(true, "06:00", "06:00", 120));
        assertFalse(DidupSyncVault.isWithinQuietHours(true, "25:00", "06:00", 120));
        assertFalse(DidupSyncVault.isWithinQuietHours(true, "00:00", "06:00", 1440));
    }
}
