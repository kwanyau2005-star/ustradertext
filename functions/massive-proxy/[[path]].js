const DEFAULT_UPSTREAM = "http://44.219.45.87:8081";

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function corsHeaders(origin = "*") {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,HEAD,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

function sanitizeSecret(value) {
  return String(value || "")
    .trim()
    .replace(/^["'`]+/, "")
    .replace(/["'`]+$/, "");
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = request.headers.get("Origin") || "*";

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    return json({ error: "method_not_allowed" }, 405, corsHeaders(origin));
  }

  const proxyKey = sanitizeSecret(env.MASSIVE_PROXY_KEY);
  if (!proxyKey) {
    return json(
      { error: "missing_server_secret", message: "Cloudflare secret MASSIVE_PROXY_KEY is not set." },
      500,
      corsHeaders(origin),
    );
  }

  const upstreamBase = sanitizeSecret(env.UPSTREAM_REST_BASE || DEFAULT_UPSTREAM).replace(/\/$/, "");
  const upstreamPath = url.pathname.replace(/^\/massive-proxy/, "") || "/";
  const upstreamUrl = `${upstreamBase}${upstreamPath}${url.search}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: request.method,
      headers: {
        "X-Proxy-Key": proxyKey,
        "Accept": "application/json",
        "User-Agent": "us-trading-dashboard-cloudflare/1.0",
      },
    });

    const headers = new Headers(upstreamRes.headers);
    headers.set("cache-control", "no-store");
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      headers.set(k, v);
    }

    return new Response(request.method === "HEAD" ? null : upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (error) {
    return json(
      { error: "proxy_failed", message: String(error?.message || error) },
      502,
      corsHeaders(origin),
    );
  }
}
