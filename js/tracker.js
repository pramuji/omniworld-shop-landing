(function () {
  const NS = "omniworld.shop";
  const KEYS = {
    views: NS + ".views",
    sessions: NS + ".sessions",
    inquiry: NS + ".inquiry_clicks",
    harga: NS + ".harga_clicks",
  };
  const SESSION_MS = 30 * 60 * 1000;
  const API = "https://countapi.mileshilliard.com/api/v1";

  function now() { return Date.now(); }
  function localBump(key) {
    const n = Number(localStorage.getItem("local:" + key) || 0) + 1;
    localStorage.setItem("local:" + key, String(n));
    return n;
  }
  async function apiHit(key) {
    try {
      const res = await fetch(API + "/hit/" + encodeURIComponent(key), { cache: "no-store" });
      if (!res.ok) throw new Error("hit failed");
      const data = await res.json();
      const value = Number(data.value);
      localStorage.setItem("local:" + key, String(value));
      return value;
    } catch (err) {
      return localBump(key);
    }
  }
  async function apiGet(key) {
    try {
      const res = await fetch(API + "/get/" + encodeURIComponent(key), { cache: "no-store" });
      if (!res.ok) throw new Error("get failed");
      const data = await res.json();
      return Number(data.value || 0);
    } catch (err) {
      return Number(localStorage.getItem("local:" + key) || 0);
    }
  }
  function isNewSession() {
    const last = Number(sessionStorage.getItem("ow_last") || 0);
    const fresh = !sessionStorage.getItem("ow_session") || now() - last > SESSION_MS;
    if (fresh) sessionStorage.setItem("ow_session", crypto.randomUUID ? crypto.randomUUID() : String(now()));
    sessionStorage.setItem("ow_last", String(now()));
    return fresh;
  }
  window.OmniTracker = {
    keys: KEYS,
    get: apiGet,
    hit: apiHit,
    async recordPage() {
      const views = await apiHit(KEYS.views);
      let sessions = await apiGet(KEYS.sessions);
      if (isNewSession()) sessions = await apiHit(KEYS.sessions);
      return { views, sessions };
    },
    async snapshot() {
      const [views, sessions, inquiry, harga] = await Promise.all([
        apiGet(KEYS.views), apiGet(KEYS.sessions), apiGet(KEYS.inquiry), apiGet(KEYS.harga),
      ]);
      return { views, sessions, inquiry, harga, events: [] };
    },
    trackClick(kind) {
      const map = { inquiry: KEYS.inquiry, harga: KEYS.harga };
      if (map[kind]) apiHit(map[kind]);
    },
  };
  if (document.body && document.body.dataset.track !== "off") {
    window.OmniTracker.recordPage().then((n) => {
      document.querySelectorAll("[data-visit-count]").forEach((el) => {
        el.textContent = Number(n.sessions).toLocaleString("id-ID");
      });
    });
  }
})();
