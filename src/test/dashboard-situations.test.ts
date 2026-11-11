import { describe, expect, it } from "vitest";
import {
  attendanceMicrocopy,
  bulletinMicrocopy,
  interrogazioniMicrocopy,
  notesMicrocopy,
} from "@/lib/voto/dashboard-situations";
import type { Attendance } from "@/lib/voto/types";
import type { Interrogazione } from "@/lib/voto/interrogazioni";

const attendance = (absenceHours: number, absenceDays = 0): Attendance => ({
  absenceDays,
  absenceHours,
  delays: 0,
  earlyExits: 0,
  annualHours: 990,
  absenceLimitHours: 264,
});

const interrogation = (id: string, completed = false, date = "2026-12-01"): Interrogazione => ({
  id,
  subject: `Materia ${id}`,
  date,
  completed,
  checklist: [],
});

describe("frasi contestuali dei moduli dashboard", () => {
  it("distingue assenze entro la soglia, vicino al limite e oltre il limite", () => {
    expect(attendanceMicrocopy(attendance(0), 0)).toMatch(/zero|assenze/i);
    expect(attendanceMicrocopy(attendance(220, 20), 0)).toMatch(/restano|limite|soglia/i);
    expect(attendanceMicrocopy(attendance(270, 30), 0)).toMatch(/superato/i);
  });

  it("distingue note non lette, già lette e assenti", () => {
    expect(notesMicrocopy(2, 1, 0)).toMatch(/nota|registro/i);
    expect(notesMicrocopy(2, 0, 0)).toMatch(/lette|consultate/i);
    expect(notesMicrocopy(0, 0, 0)).toMatch(/note/i);
  });

  it("distingue comunicazioni in Bacheca non lette, già lette e assenti", () => {
    expect(bulletinMicrocopy(2, 1, 0)).toMatch(/comunicazione|bacheca/i);
    expect(bulletinMicrocopy(2, 0, 0)).toMatch(/lette|consultato|Bacheca/i);
    expect(bulletinMicrocopy(0, 0, 0)).toMatch(/Bacheca|comunicazioni/i);
  });

  it("distingue interrogazioni aperte, senza data o già completate", () => {
    expect(interrogazioniMicrocopy([interrogation("una")], 0)).toMatch(/interrogazione/i);
    expect(interrogazioniMicrocopy([interrogation("senza-data", false, "")], 0)).toMatch(
      /senza data|manca la data/i,
    );
    expect(interrogazioniMicrocopy([interrogation("fatta", true)], 0)).toMatch(
      /nessuna interrogazione|agenda libera/i,
    );
  });
});
