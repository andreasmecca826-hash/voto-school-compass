package it.voto.school;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class AppIconComponentsTest {
    @Test
    public void mapsIconAndLabelChoicesToKnownLauncherAliases() {
        assertEquals(
            "it.voto.school.MainActivityIconVoto",
            AppIconComponents.componentClassName("it.voto.school", "voto", "voto")
        );
        assertEquals(
            "it.voto.school.MainActivityIconFamigliaDidupFamiglia",
            AppIconComponents.componentClassName(
                "it.voto.school",
                "famiglia",
                "didup-famiglia"
            )
        );
        assertEquals(
            "it.voto.school.MainActivityIconClassevivaClasseviva",
            AppIconComponents.componentClassName(
                "it.voto.school",
                "classeviva",
                "classeviva"
            )
        );
        assertNull(
            AppIconComponents.componentClassName("it.voto.school", "unlisted", "voto")
        );
        assertNull(
            AppIconComponents.componentClassName("it.voto.school", "voto", "free-text")
        );
    }

    @Test
    public void migratesRemovedIconChoicesAndLabels() {
        assertEquals("voto", AppIconComponents.migrateIconId("libro"));
        assertEquals("voto", AppIconComponents.migrateIconId("stella"));
        assertEquals("famiglia", AppIconComponents.migrateIconId("famiglia"));
        assertNull(AppIconComponents.migrateIconId("unlisted"));

        assertEquals("voto", AppIconComponents.migrateLabelId(null));
        assertEquals("didup-famiglia", AppIconComponents.migrateLabelId("didup-famiglia"));
        assertNull(AppIconComponents.migrateLabelId("free-text"));
    }
}
