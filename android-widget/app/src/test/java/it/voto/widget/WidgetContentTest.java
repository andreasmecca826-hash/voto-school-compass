package it.voto.widget;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class WidgetContentTest {
  private String[] values(String assignment, String state) {
    String[] values = new String[12];
    values[0] = "Media 8";
    values[1] = "9 — Matematica";
    values[3] = "Assenze: 1";
    values[6] = "Compiti aperti: 1";
    values[7] = assignment;
    values[11] = state;
    return values;
  }

  @Test public void hidesSensitiveAssignmentDetailsByDefault() {
    String rendered = WidgetContent.select(7, values("Tema · Matematica · 2026-11-20", "authenticated"), true);

    assertEquals("Compito in scadenza", rendered);
    assertFalse(rendered.contains("Matematica"));
    assertFalse(rendered.contains("2026-11-20"));
  }

  @Test public void showsAnEmptyStateForAccountsWithoutAssignments() {
    assertEquals(
        "Nessun compito in scadenza",
        WidgetContent.select(7, values("Nessun compito in scadenza", "authenticated"), true)
    );
  }

  @Test public void neverShowsPrivateDataWhenSignedOut() {
    assertEquals("Accedi a VOTO", WidgetContent.select(1, values("Titolo compito", "signed_out"), false));
  }

  @Test public void appliesResultsOnlyToTheAccountThatRequestedThem() {
    assertTrue(WidgetData.canApplyResult("account-a", "account-a"));
    assertFalse(WidgetData.canApplyResult("account-a", "account-b"));
    assertFalse(WidgetData.canApplyResult("account-a", ""));
  }
}
