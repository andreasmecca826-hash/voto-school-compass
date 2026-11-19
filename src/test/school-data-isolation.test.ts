import { describe, expect, it } from "vitest";
import {
  perUserAttachmentPath,
  schoolSnapshotForUser,
} from "../../supabase/functions/_shared/school-data-scope";

describe("isolamento snapshot scolastici", () => {
  const accountA = { user_id: "account-a", snapshot: { assignments: ["compito A"] } };
  const emptyFields = {
    student: { name: "", className: "", schoolYear: "" },
    subjects: [],
    assignments: [],
    notifications: [],
    diary: [],
    attendance: {
      absenceDays: 0,
      absenceHours: 0,
      delays: 0,
      earlyExits: 0,
      annualHours: 0,
      absenceLimitHours: 0,
    },
    attendanceEvents: [],
  };

  it("non restituisce lo snapshot di un altro account", () => {
    expect(schoolSnapshotForUser("account-b", accountA, "account-a", accountA.snapshot)).toEqual({
      ...emptyFields,
      updatedAt: expect.any(String),
    });
  });

  it("mantiene l'accesso legacy soltanto per il proprietario esistente", () => {
    expect(schoolSnapshotForUser("account-a", null, "account-a", accountA.snapshot)).toEqual(
      accountA.snapshot,
    );
    expect(schoolSnapshotForUser("account-b", null, "account-a", accountA.snapshot)).toEqual({
      ...emptyFields,
      updatedAt: expect.any(String),
    });
  });

  it("fornisce uno snapshot vuoto quando l'account non ha ancora sincronizzato dati", () => {
    expect(schoolSnapshotForUser("account-b", null, null, null)).toEqual({
      ...emptyFields,
      updatedAt: expect.any(String),
    });
  });

  it("isola i path degli allegati e non condivide lo stesso oggetto tra account", () => {
    const path = `circulars/${"a".repeat(64)}.pdf`;
    const first = perUserAttachmentPath("11111111-1111-4111-8111-111111111111", path);
    const second = perUserAttachmentPath("22222222-2222-4222-8222-222222222222", path);

    expect(first).not.toBe(second);
    expect(first).toContain("users/11111111-1111-4111-8111-111111111111/");
    expect(second).toContain("users/22222222-2222-4222-8222-222222222222/");
  });
});
