// Runs before static assets (run_worker_first) only to canonicalise the URL:
// www.yummlab.site -> yummlab.site, and plain http -> https. Everything else
// is handed to the asset server unchanged, so public/_headers still applies.
const CANONICAL_HOST = "yummlab.site";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (LOCAL_HOSTS.has(url.hostname)) return env.ASSETS.fetch(request);

    const host = url.hostname === `www.${CANONICAL_HOST}` ? CANONICAL_HOST : url.hostname;
    if (host !== url.hostname || url.protocol === "http:") {
      url.hostname = host;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
