import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl, supabaseAuthHeaders } from "@/lib/server/supabaseStorageAuth";

describe("Supabase Storage server authentication", () => {
  it("uses a new secret key only as apikey", () => {
    expect(supabaseAuthHeaders("sb_secret_example")).toEqual({
      apikey: "sb_secret_example",
    });
  });

  it("keeps Authorization for legacy JWT keys", () => {
    const key = "header.payload.signature";
    expect(supabaseAuthHeaders(key)).toEqual({
      apikey: key,
      authorization: `Bearer ${key}`,
    });
  });

  it("normalizes a bare project reference and a hostname", () => {
    expect(normalizeSupabaseUrl("jmvxuhgjejzpezvawzfw")).toBe(
      "https://jmvxuhgjejzpezvawzfw.supabase.co",
    );
    expect(normalizeSupabaseUrl("jmvxuhgjejzpezvawzfw.supabase.co")).toBe(
      "https://jmvxuhgjejzpezvawzfw.supabase.co",
    );
  });

  it("rejects insecure HTTP URLs", () => {
    expect(() => normalizeSupabaseUrl("http://example.supabase.co")).toThrow(
      "SUPABASE_URL deve usare HTTPS.",
    );
  });
});
