package it.voto.school;

final class AppIconComponents {
    private AppIconComponents() {}

    static String componentClassName(String packageName, String iconId, String labelId) {
        if (!isCurrentIconId(iconId) || !isCurrentLabelId(labelId)) return null;
        if ("voto".equals(labelId)) {
            if ("voto".equals(iconId)) return packageName + ".MainActivityIconVoto";
            if ("famiglia".equals(iconId)) return packageName + ".MainActivityIconFamiglia";
            return packageName + ".MainActivityIconClasseviva";
        }
        if ("didup-famiglia".equals(labelId)) {
            if ("voto".equals(iconId)) return packageName + ".MainActivityIconVotoDidupFamiglia";
            if ("famiglia".equals(iconId)) {
                return packageName + ".MainActivityIconFamigliaDidupFamiglia";
            }
            return packageName + ".MainActivityIconClassevivaDidupFamiglia";
        }
        if ("voto".equals(iconId)) return packageName + ".MainActivityIconVotoClasseviva";
        if ("famiglia".equals(iconId)) {
            return packageName + ".MainActivityIconFamigliaClasseviva";
        }
        return packageName + ".MainActivityIconClassevivaClasseviva";
    }

    static String legacyComponentClassName(String packageName, String iconId) {
        if ("libro".equals(iconId)) return packageName + ".MainActivityIconLibro";
        if ("stella".equals(iconId)) return packageName + ".MainActivityIconStella";
        return null;
    }

    static String[] iconIds() {
        return new String[] {"voto", "famiglia", "classeviva"};
    }

    static String[] labelIds() {
        return new String[] {"voto", "didup-famiglia", "classeviva"};
    }

    static String[] legacyIconIds() {
        return new String[] {"libro", "stella"};
    }

    static String migrateIconId(String iconId) {
        if ("libro".equals(iconId) || "stella".equals(iconId)) return "voto";
        return isCurrentIconId(iconId) ? iconId : null;
    }

    static String migrateLabelId(String labelId) {
        if (labelId == null) return "voto";
        return isCurrentLabelId(labelId) ? labelId : null;
    }

    static boolean isCurrentIconId(String iconId) {
        return "voto".equals(iconId) || "famiglia".equals(iconId) || "classeviva".equals(iconId);
    }

    static boolean isCurrentLabelId(String labelId) {
        return "voto".equals(labelId) ||
            "didup-famiglia".equals(labelId) ||
            "classeviva".equals(labelId);
    }
}
