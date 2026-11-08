import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleCircularMirrorGet, parseSingleByteRange } from "@/routes/api/circulars/mirror";

const path = `circulars/${"a".repeat(64)}.pdf`;
const projectUrl = "https://jmvxuhgjejzpezvawzfw.supabase.co";
const signedUrl = `${projectUrl}/storage/v1/object/sign/${path}?token=test`;

function request(range?: string) {
  return new Request(`https://voto.test/api/circulars/mirror?path=${encodeURIComponent(path)}`, {
    ...(range ? { headers: { Range: range } } : {}),
  });
}

function installFetchMock(storageResponse: Response) {
  const fetchMock = vi.fn();
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ path, signedUrl }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  fetchMock.mockResolvedValueOnce(storageResponse);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("proxy Range dell’anteprima circolari", () => {
  it("accetta solo un singolo byte range", () => {
    expect(parseSingleByteRange(null)).toEqual({ kind: "none" });
    expect(parseSingleByteRange("bytes=0-65535")).toEqual({
      kind: "valid",
      value: "bytes=0-65535",
    });
    expect(parseSingleByteRange("bytes=-1024")).toEqual({
      kind: "valid",
      value: "bytes=-1024",
    });
    expect(parseSingleByteRange("bytes=0-10,20-30")).toEqual({ kind: "invalid" });
    expect(parseSingleByteRange("bytes=10-0")).toEqual({ kind: "invalid" });
  });

  it("inoltra Range e restituisce il partial content senza cambiare i byte", async () => {
    const fetchMock = installFetchMock(
      new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 206,
        headers: {
          "content-range": "bytes 0-3/10",
          "content-length": "4",
          "accept-ranges": "bytes",
        },
      }),
    );

    const response = await handleCircularMirrorGet(request("bytes=0-3"));

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-3/10");
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    const storageOptions = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined;
    expect(new Headers(storageOptions?.headers).get("range")).toBe("bytes=0-3");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3, 4]);
  });

  it("rifiuta range multipli senza contattare Supabase", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleCircularMirrorGet(request("bytes=0-1,4-5"));

    expect(response.status).toBe(416);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rifiuta un PDF oltre 25 MB anche quando arriva una risposta parziale", async () => {
    installFetchMock(
      new Response(new Uint8Array([1]), {
        status: 206,
        headers: {
          "content-range": `bytes 0-0/${25 * 1024 * 1024 + 1}`,
          "content-length": "1",
        },
      }),
    );

    const response = await handleCircularMirrorGet(request("bytes=0-0"));

    expect(response.status).toBe(413);
  });

  it("restituisce una risposta prima che il body upstream sia stato consumato", async () => {
    let releaseChunk: (() => void) | undefined;
    let released = false;
    let announcePull!: () => void;
    const pullStarted = new Promise<void>((resolve) => {
      announcePull = resolve;
    });
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        announcePull();
        return new Promise<void>((resolve) => {
          releaseChunk = () => {
            if (released) return;
            released = true;
            controller.enqueue(new Uint8Array([7, 8, 9]));
            controller.close();
            resolve();
          };
        });
      },
    });
    installFetchMock(
      new Response(source, {
        status: 200,
        headers: { "content-length": "3", "accept-ranges": "bytes" },
      }),
    );

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Il server ha bufferizzato il PDF intero")), 250);
    });
    const pendingResponse = handleCircularMirrorGet(request());
    try {
      const response = await Promise.race([pendingResponse, timeout]);
      expect(response.status).toBe(200);
      const body = response.arrayBuffer();
      await pullStarted;
      releaseChunk?.();
      expect([...new Uint8Array(await body)]).toEqual([7, 8, 9]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      releaseChunk?.();
      await pendingResponse.catch(() => undefined);
    }
  });
});
