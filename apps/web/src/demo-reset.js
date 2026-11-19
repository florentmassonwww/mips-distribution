// The "Reset" button of the demo banner calls POST /api/offline/reset. In the offline v0.1.0 demo
// this also forgot what the browser kept for the demo (offline queue, cached route bundles…):
// keys prefixed "md_", except the language choice. Done here before the server reset.
const realFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url === "/api/offline/reset") {
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith("md_") && key !== "md_lang") localStorage.removeItem(key);
    } catch {
      /* storage unavailable: nothing to forget */
    }
  }
  return realFetch(input, init);
};
