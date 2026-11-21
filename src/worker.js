// Runs before static assets (run_worker_first) to canonicalise the URL
// (www.yummlab.site -> yummlab.site, plain http -> https) and to hand member
// pages to their own Workers. Everything else goes to the asset server
// unchanged, so public/_headers still applies.
import "../public/i18n.js"; // sets globalThis.YUMM_I18N, the same copy the page uses

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

/* ---------- Thai page ---------- */
// /th/ is index.html with the Thai copy filled in here, so crawlers that index
// the raw HTML get Thai text, a Thai <title> and a canonical of their own.
const TH_PATH = "/th/";
const TH = globalThis.YUMM_I18N.th;

function setAttr(name, value) {
  return { element: (el) => el.setAttribute(name, value) };
}

async function thaiPage(request, env) {
  // A fresh GET without conditional headers: the asset server's 304/ETag
  // describe /index.html, not this rewritten body.
  const assetUrl = new URL("/", request.url);
  const asset = await env.ASSETS.fetch(new Request(assetUrl, { method: request.method }));
  if (!asset.ok) return asset;

  const thUrl = `https://${CANONICAL_HOST}${TH_PATH}`;
  const res = new HTMLRewriter()
    .on("html", setAttr("lang", "th"))
    .on("title", { element: (el) => el.setInnerContent(TH["meta.title"]) })
    .on('meta[name="description"]', setAttr("content", TH["meta.desc"]))
    .on('meta[property="og:title"]', setAttr("content", TH["meta.title"]))
    .on('meta[property="og:description"]', setAttr("content", TH["meta.desc"]))
    .on('meta[property="og:url"]', setAttr("content", thUrl))
    .on('meta[property="og:locale"]', setAttr("content", "th_TH"))
    .on('meta[property="og:locale:alternate"]', setAttr("content", "en_US"))
    .on('link[rel="canonical"]', setAttr("href", thUrl))
    .on("[data-i18n]", {
      element(el) {
        const value = TH[el.getAttribute("data-i18n")];
        if (typeof value === "string") el.setInnerContent(value);
      },
    })
    .on("[data-i18n-aria]", {
      element(el) {
        const value = TH[el.getAttribute("data-i18n-aria")];
        if (typeof value === "string") el.setAttribute("aria-label", value);
      },
    })
    .transform(asset);

  const headers = new Headers(res.headers);
  headers.delete("ETag");
  return new Response(res.body, { status: res.status, headers });
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

    if (url.pathname === "/th") {
      url.pathname = TH_PATH;
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === TH_PATH) return thaiPage(request, env);

    const binding = memberBinding(url.pathname);
    if (binding) return env[binding].fetch(request);
    return env.ASSETS.fetch(request);
  },
};
