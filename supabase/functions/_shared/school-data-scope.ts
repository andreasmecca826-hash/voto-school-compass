export type OwnedSchoolSnapshot = {
  user_id: string;
  snapshot: unknown;
};

export function perUserAttachmentPath(userId: string, path: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^circulars\/[a-f0-9]{64}\.(pdf|docx)$/.test(path)) {
    throw new Error("Invalid per-user attachment path.");
  }
  return `users/${userId}/${path}`;
}

export function emptySchoolSnapshot(updatedAt = new Date().toISOString()) {
  return {
    student: { name: "", className: "", schoolYear: "" },
    updatedAt,
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
}

export function schoolSnapshotForUser(
  userId: string,
  ownedRow: OwnedSchoolSnapshot | null,
  legacyOwnerId: string | null,
  legacySnapshot: unknown,
) {
  if (ownedRow?.user_id === userId && isRecord(ownedRow.snapshot)) return ownedRow.snapshot;
  if (legacyOwnerId === userId && isRecord(legacySnapshot)) return legacySnapshot;
  return emptySchoolSnapshot();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
