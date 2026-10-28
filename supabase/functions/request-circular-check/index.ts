const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const repository = "andreasmecca826-hash/didup-monitor";
const workflow = "check.yml";
const branch = "main";
const cooldownMs = 3 * 60 * 1000;
const githubApi = "https://api.github.com";
let dispatchInProgress = false;
let localCooldownUntil = 0;

type WorkflowRun = {
  status?: string;
  conclusion?: string | null;
  event?: string;
  head_branch?: string;
  created_at?: string;
};

class GitHubRequestError extends Error {
  constructor(
    readonly operation: string,
    readonly status: number,
  ) {
    super("github_request_failed");
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function listRuns(token: string): Promise<WorkflowRun[]> {
  const url = new URL(`${githubApi}/repos/${repository}/actions/workflows/${workflow}/runs`);
  url.searchParams.set("branch", branch);
  url.searchParams.set("per_page", "10");
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (!response.ok) throw new GitHubRequestError("list_runs", response.status);
  const result = await response.json();
  if (!Array.isArray(result?.workflow_runs)) throw new Error("invalid_workflow_runs_response");
  return result.workflow_runs as WorkflowRun[];
}

function activeRun(runs: WorkflowRun[]) {
  return runs.find((run) =>
    ["queued", "requested", "waiting", "in_progress", "pending"].includes(run.status ?? ""),
  );
}

function retrySeconds(createdAt: string | undefined) {
  const timestamp = createdAt ? Date.parse(createdAt) : Number.NaN;
  if (!Number.isFinite(timestamp)) return 60;
  return Math.max(1, Math.ceil((timestamp + cooldownMs - Date.now()) / 1000));
}

function publicError(error: unknown, operation: string) {
  if (error instanceof GitHubRequestError) {
    console.error("circular-check GitHub API failed", {
      operation: error.operation,
      status: error.status,
    });
  } else {
    console.error("circular-check request failed", {
      operation,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  }
  return jsonResponse({ error: "Il controllo non è disponibile in questo momento." }, 502);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  }

  const token = Deno.env.get("VOTO_CIRCULAR_TRIGGER_TOKEN");
  if (!token) {
    return jsonResponse({ error: "Controllo manuale non ancora configurato." }, 503);
  }

  if (request.method === "GET") {
    const after = new URL(request.url).searchParams.get("after");
    const afterMs = after ? Date.parse(after) : Number.NaN;
    if (!Number.isFinite(afterMs)) return jsonResponse({ error: "Richiesta non valida." }, 400);
    try {
      const runs = await listRuns(token);
      const run = runs.find(
        (candidate) =>
          candidate.event === "workflow_dispatch" &&
          candidate.head_branch === branch &&
          typeof candidate.created_at === "string" &&
          Date.parse(candidate.created_at) >= afterMs,
      );
      if (!run) return jsonResponse({ status: "waiting" });
      return jsonResponse({ status: run.status ?? "unknown", conclusion: run.conclusion ?? null });
    } catch (error) {
      return publicError(error, "status");
    }
  }

  if (dispatchInProgress) {
    return jsonResponse({ error: "È già in corso un controllo.", retryAfterSeconds: 60 }, 409);
  }
  if (localCooldownUntil > Date.now()) {
    return jsonResponse(
      {
        error: "Il registro è stato controllato di recente.",
        retryAfterSeconds: Math.ceil((localCooldownUntil - Date.now()) / 1000),
      },
      429,
    );
  }

  dispatchInProgress = true;
  try {
    const runs = await listRuns(token);
    const running = activeRun(runs);
    if (running) {
      const createdAt = running.created_at ? Date.parse(running.created_at) : Number.NaN;
      const requestedAt = Number.isFinite(createdAt)
        ? new Date(createdAt - 10_000).toISOString()
        : new Date(Date.now() - 10_000).toISOString();
      return jsonResponse({ status: "started", requestedAt, joinedExisting: true }, 202);
    }

    const latest = runs.find(
      (run) => run.event === "workflow_dispatch" && run.head_branch === branch,
    );
    if (latest?.created_at) {
      const age = Date.now() - Date.parse(latest.created_at);
      if (Number.isFinite(age) && age < cooldownMs) {
        localCooldownUntil = Date.parse(latest.created_at) + cooldownMs;
        return jsonResponse(
          {
            error: "Il registro è stato controllato di recente.",
            retryAfterSeconds: retrySeconds(latest.created_at),
          },
          429,
        );
      }
    }

    const requestedAt = new Date(Date.now() - 10_000).toISOString();
    const response = await fetch(
      `${githubApi}/repos/${repository}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: githubHeaders(token),
        body: JSON.stringify({ ref: branch, inputs: { app_trigger: true } }),
      },
    );
    if (!response.ok) throw new GitHubRequestError("dispatch", response.status);
    localCooldownUntil = Date.now() + cooldownMs;
    return jsonResponse({ status: "started", requestedAt }, 202);
  } catch (error) {
    return publicError(error, "dispatch");
  } finally {
    dispatchInProgress = false;
  }
});
