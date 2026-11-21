// Runs before static assets (run_worker_first) to canonicalise the URL
// (www.yummlab.site -> yummlab.site, plain http -> https) and to hand member
// pages to their own Workers. Everything else goes to the asset server
// unchanged, so public/_headers still applies.
const CANONICAL_HOST = "yummlab.site";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

// Path prefix -> service binding (wrangler.toml [[services]]). Each member page
// lives in its own repo and Worker; the request is forwarded with its URL as is.
const MEMBER_PAGES = {
  "/de-faults": "DE_FAULTS",
};

function memberBinding(pathname) {
  for (const [prefix, binding] of Object.entries(MEMBER_PAGES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return binding;
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!LOCAL_HOSTS.has(url.hostname)) {
      const host = url.hostname === `www.${CANONICAL_HOST}` ? CANONICAL_HOST : url.hostname;
      if (host !== url.hostname || url.protocol === "http:") {
        url.hostname = host;
        url.protocol = "https:";
        return Response.redirect(url.toString(), 301);
      }
    }

    const binding = memberBinding(url.pathname);
    if (binding) return env[binding].fetch(request);
    return env.ASSETS.fetch(request);
  },
};
