import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleCircularMirrorGet, parseSingleByteRange } from "@/routes/api/circulars/mirror";

const path = `circulars/${"a".repeat(64)}.pdf`;
const projectUrl = "https://jmvxuhgjejzpezvawzfw.supabase.co";

function request(range?: string, attachmentPath = path, authenticated = true) {
  return new Request(
    `https://voto.test/api/circulars/mirror?path=${encodeURIComponent(attachmentPath)}`,
    {
      headers: {
        ...(range ? { Range: range } : {}),
        ...(authenticated ? { Authorization: "Bearer test-user-token" } : {}),
      },
    },
  );
}

function installFetchMock(storageResponse: Response, attachmentPath = path) {
  const fetchMock = vi.fn();
  const signedUrl = `${projectUrl}/storage/v1/object/sign/${attachmentPath}?token=test`;
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ path: attachmentPath, signedUrl }), {
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
    expect(response.headers.get("cache-control")).toBe("private, max-age=300");
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

  it("richiede una sessione per firmare il file", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleCircularMirrorGet(request(undefined, path, false));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rifiuta un PDF oltre 25 MB anche quando arriva una risposta parziale", async () => {
    const largePath = `circulars/${"b".repeat(64)}.pdf`;
    installFetchMock(
      new Response(new Uint8Array([1]), {
        status: 206,
        headers: {
          "content-range": `bytes 0-0/${25 * 1024 * 1024 + 1}`,
          "content-length": "1",
        },
      }),
      largePath,
    );

    const response = await handleCircularMirrorGet(request("bytes=0-0", largePath));

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
    const streamPath = `circulars/${"c".repeat(64)}.pdf`;
    installFetchMock(
      new Response(source, {
        status: 200,
        headers: { "content-length": "3", "accept-ranges": "bytes" },
      }),
      streamPath,
    );

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Il server ha bufferizzato il PDF intero")), 250);
    });
    const pendingResponse = handleCircularMirrorGet(request(undefined, streamPath));
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

  it("inoltra la sessione a ogni richiesta Range senza riusare la firma tra identità", async () => {
    const cachedPath = `circulars/${"d".repeat(64)}.pdf`;
    const cachedSignedUrl = `${projectUrl}/storage/v1/object/sign/${cachedPath}?token=cache`;
    const signedResponse = () =>
      new Response(JSON.stringify({ path: cachedPath, signedUrl: cachedSignedUrl }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(signedResponse())
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2]), {
          status: 206,
          headers: {
            "content-range": "bytes 0-1/4",
            "content-length": "2",
            "accept-ranges": "bytes",
          },
        }),
      )
      .mockResolvedValueOnce(signedResponse())
      .mockResolvedValueOnce(
        new Response(new Uint8Array([3, 4]), {
          status: 206,
          headers: {
            "content-range": "bytes 2-3/4",
            "content-length": "2",
            "accept-ranges": "bytes",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const first = await handleCircularMirrorGet(request("bytes=0-1", cachedPath));
    const second = await handleCircularMirrorGet(request("bytes=2-3", cachedPath));

    expect(first.status).toBe(206);
    expect(second.status).toBe(206);
    await Promise.all([first.arrayBuffer(), second.arrayBuffer()]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/functions/v1/mirror-circular");
    expect(
      new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers).get("authorization"),
    ).toBe("Bearer test-user-token");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(cachedSignedUrl);
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/functions/v1/mirror-circular");
    expect(String(fetchMock.mock.calls[3]?.[0])).toBe(cachedSignedUrl);
  });
});
