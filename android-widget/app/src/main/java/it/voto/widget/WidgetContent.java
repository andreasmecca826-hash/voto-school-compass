package it.voto.widget;

final class WidgetContent {
  private WidgetContent() {}

  static String select(int mode, String[] values, boolean hideSensitive) {
    String state = values.length > 11 ? values[11] : "";
    if ("signed_out".equals(state)) return "Accedi a VOTO";
    if ("loading".equals(state) || "error".equals(state)) return values[0];
    if (hideSensitive) {
      if (mode == 6) return values[6];
      if (mode == 7) {
        return "Nessun compito in scadenza".equals(values[7])
            ? values[7]
            : "Compito in scadenza";
      }
      return "Apri VOTO per i dettagli";
    }
    if (mode == 0) return values[0];
    if (mode == 1) return values[1];
    if (mode == 2) return values[3];
    if (mode == 3) return values[4];
    if (mode == 4) return values[5];
    if (mode == 6) return values[6];
    if (mode == 7) return values[7];
    if (mode == 8) return values[8];
    if (mode == 9) return values[9];
    if (mode == 10) return values[10];
    return values[0] + "\n" + values[6] + "\n" + values[7] + "\n"
        + values[3] + " · " + values[4] + " · " + values[5];
  }
}
