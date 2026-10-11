(function () {
  "use strict";
  const API = window.RBX_API;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const view = $("#view");

  /* ---------- storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("rbx:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("rbx:" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const DEFAULTS = { theme: "classic", scheme: "auto", nav: "auto", collapsed: false, username: "BloxFan2018", joined: new Date().toISOString().slice(0, 10) };
  let prefs = Object.assign({}, DEFAULTS, store.get("prefs", {}));
  store.set("prefs", prefs);
  let avatar = Object.assign({ skin: "#e0ac69", shirt: "#00a2ff", pants: "#02b757" }, store.get("avatar", {}));
  let favs = store.get("favs", []);
  let recents = store.get("recents", []);
  let searches = store.get("searches", []);

  /* ---------- helpers ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => {
    n = Number(n) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
    return String(n);
  };
  const clean = (n) => {
    let s = n;
    for (let i = 0; i < 2; i++) s = s.replace(/^\s*[\[(][^\])]*[\])]\s*/, "");
    s = s.replace(/\s*[\[(][^\])]*[\])]\s*$/, "").trim();
    return s.length > 1 ? s : n;
  };
  const initials = (n) => clean(n).split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9]/g, "")[0] || "").join("").slice(0, 2).toUpperCase() || "?";
  const pct = (g) => Math.round(API.ratio(g) * 100);
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return "-"; } };

  const PATHS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    games: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="16" cy="11.5" r=".8"/><circle cx="18.5" cy="14" r=".8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    avatar: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    more: '<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
    heart: '<path d="M12 20s-7-4.6-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.4-9 9-9 9z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    friends: '<circle cx="9" cy="9" r="3.5"/><path d="M2 20c0-3.6 3-6 7-6s7 2.4 7 6"/><circle cx="17" cy="8" r="2.5"/><path d="M17 13.5c3 0 5 1.8 5 4.5"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
    trade: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
    group: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 19c0-3 2.7-5 6-5s6 2 6 5M14 14.3c.6-.2 1.3-.3 2-.3 3.3 0 6 2 6 5"/>',
    blog: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>',
    thumb: '<path d="M7 11v9H4v-9zM7 11l4-8c2 0 3 1.2 2.6 3L13 9h6a2 2 0 0 1 2 2.4l-1.2 6A3 3 0 0 1 17 20H7"/>',
    person: '<circle cx="12" cy="8" r="4" fill="currentColor" stroke="none"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6z" fill="currentColor" stroke="none"/>',
    star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/>',
    addhome: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8v8M8 12h8"/>',
    robux: '<circle cx="12" cy="12" r="9"/><path d="M9 16V8h3.6a2.2 2.2 0 0 1 0 4.4H9M12.4 12.4L15.5 16"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  const ic = (n, c = "") => `<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[n] || ""}</svg>`;

  /* ---------- navigation model ---------- */
  const ITEMS = {
    home: ["Home", "home", "#/home"], games: ["Games", "games", "#/games"], search: ["Search", "search", "#/search"],
    favorites: ["Favorites", "heart", "#/favorites"], avatar: ["Avatar", "avatar", "#/avatar"], profile: ["Profile", "user", "#/profile"],
    messages: ["Messages", "mail", "#/page/messages"], friends: ["Friends", "friends", "#/page/friends"],
    inventory: ["Inventory", "bag", "#/page/inventory"], trade: ["Trade", "trade", "#/page/trade"],
    groups: ["Groups", "group", "#/page/groups"], blog: ["Blog", "blog", "#/page/blog"], settings: ["Settings", "gear", "#/settings"]
  };
  const CLASSIC_ORDER = ["home", "games", "profile", "messages", "friends", "avatar", "inventory", "trade", "groups", "favorites", "blog", "settings"];
  const APPLE_GROUPS = [["Browse", ["home", "games", "search", "favorites"]], ["You", ["avatar", "profile", "inventory"]], ["Social", ["messages", "friends", "groups", "trade"]], ["App", ["blog", "settings"]]];
  const TABS = ["home", "games", "search", "avatar"];
  const navLink = (id) => `<li><a href="${ITEMS[id][2]}" data-nav-id="${id}">${ic(ITEMS[id][1])}<span>${ITEMS[id][0]}</span></a></li>`;

  function renderNav() {
    const list = $("#sideList");
    if (prefs.theme === "apple") {
      list.innerHTML = APPLE_GROUPS.map(([t, ids]) => `<li class="grp">${t}</li>` + ids.map(navLink).join("")).join("");
    } else {
      list.innerHTML = CLASSIC_ORDER.map(navLink).join("");
    }
    $("#tabbar").innerHTML = TABS.map((id) => `<a href="${ITEMS[id][2]}" data-nav-id="${id}">${ic(ITEMS[id][1])}<span>${ITEMS[id][0]}</span></a>`).join("") +
      `<a href="#/more" data-nav-id="more">${ic("more")}<span>More</span></a>`;
  }

  function setActive(id) {
    $$("[data-nav-id]").forEach((a) => {
      let on = a.dataset.navId === id;
      if (a.closest("#tabbar") && a.dataset.navId === "more") on = !TABS.includes(id);
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    $$(".topnav a[data-route]").forEach((a) => a.classList.toggle("on", a.dataset.route === id));
  }

  /* ---------- avatar ---------- */
  function avatarSVG(bust) {
    const vb = bust ? "20 4 80 80" : "0 0 120 180";
    return `<svg class="avatar-svg" viewBox="${vb}" aria-hidden="true">
      <rect x="10" y="42" width="20" height="62" rx="6" fill="${avatar.skin}"/><rect x="90" y="42" width="20" height="62" rx="6" fill="${avatar.skin}"/>
      <rect x="32" y="42" width="56" height="62" rx="6" fill="${avatar.shirt}"/>
      <rect x="32" y="106" width="26" height="70" rx="6" fill="${avatar.pants}"/><rect x="62" y="106" width="26" height="70" rx="6" fill="${avatar.pants}"/>
      <rect x="45" y="8" width="30" height="30" rx="7" fill="${avatar.skin}"/>
      <circle cx="54" cy="21" r="2.4" fill="#222"/><circle cx="66" cy="21" r="2.4" fill="#222"/>
      <path d="M54 29q6 4 12 0" stroke="#222" fill="none" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  function refreshAvatarChips() {
    $("#meChip").innerHTML = avatarSVG(true);
    $("#sideUser").innerHTML = `<span class="chip">${avatarSVG(true)}</span><span class="uname">${esc(prefs.username)}</span>`;
  }

  /* ---------- data ---------- */
  const data = { rows: null, all: new Map(), source: "", promise: null, t: 0 };
  function ensureData(force) {
    if (!force && data.promise) return data.promise;
    if (force) API.clearCache();
    data.promise = API.getSorts().then((res) => {
      data.rows = res.rows; data.source = res.source; data.t = res.t || Date.now();
      data.all = new Map();
      res.rows.forEach((r) => r.games.forEach((g) => { if (!data.all.has(g.id)) data.all.set(g.id, g); }));
      updateStatus();
      if (res.source !== "live" && !ensureData.warned) { ensureData.warned = true; toast("Couldn't reach Roblox, showing saved games."); }
      return data;
    });
    return data.promise;
  }
  function statusText() {
    if (data.source === "live") return "Showing live data.";
    if (data.source === "saved") return "Showing games saved on " + fmtDate(data.t) + " because Roblox couldn't be reached.";
    if (data.source === "snapshot") return "Showing the built-in game list because Roblox couldn't be reached.";
    return "";
  }
  function updateStatus() { $("#dataStatus").textContent = statusText(); }

  /* ---------- small UI helpers ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  function hydrate(scope) {
    const imgs = $$("img[data-icon]:not([src])", scope);
    const ids = Array.from(new Set(imgs.map((i) => i.dataset.icon)));
    if (!ids.length) return;
    API.loadIcons(ids).then(() => {
      $$("img[data-icon]:not([src])", scope).forEach((img) => {
        const u = API.iconFor(img.dataset.icon);
        if (!u) return;
        img.addEventListener("load", () => img.classList.add("ok"), { once: true });
        img.src = u;
      });
    });
  }

  function cardHTML(g) {
    const has = g.up + g.down > 0, p = pct(g);
    return `<a class="card" href="#/game/${g.id}/${g.placeId}">
      <div class="thumb"><span class="ph">${esc(initials(g.name))}</span><img alt="" data-icon="${g.id}" loading="lazy" decoding="async"></div>
      <div class="cbody">
        <div class="cname">${esc(clean(g.name))}</div>
        <div class="meta">${has ? `<span class="rate" title="${p}% liked">${ic("thumb")}<span class="bar"><i style="width:${p}%"></i></span></span>` : ""}<span class="ppl">${ic("person")}${fmt(g.players)}</span></div>
        <div class="sub">${esc(g.genre || "Experience")}${has ? " \u00b7 " + p + "%" : ""}</div>
        <span class="getbtn" role="button" data-play="${g.placeId}">Play</span>
      </div></a>`;
  }
  const skCard = '<div class="card sk"><div class="thumb"></div><div class="cbody"><div class="cname"></div><div class="meta"></div></div></div>';
  const skRow = (n = 3) => Array.from({ length: n }, () => `<section class="row"><div class="row-head"><h2 class="sk-line"></h2></div><div class="row-scroll">${skCard.repeat(8)}</div></section>`).join("");

  function rowHTML(r, href) {
    return `<section class="row"><div class="row-head"><h2>${esc(r.name)}</h2><a class="see-all" href="${href || "#/games?row=" + encodeURIComponent(r.id)}">See All</a></div>
      ${r.info ? `<p class="row-info">${esc(r.info)}</p>` : ""}
      <div class="row-wrap"><button class="arrow l" data-dir="-1" aria-label="Scroll left">${ic("chevron")}</button>
      <div class="row-scroll">${r.games.slice(0, 30).map(cardHTML).join("")}</div>
      <button class="arrow r" data-dir="1" aria-label="Scroll right">${ic("chevron")}</button></div></section>`;
  }

  const emptyState = (title, text, extra = "") => `<div class="empty"><h3>${esc(title)}</h3><p>${esc(text)}</p>${extra}</div>`;
  const pageTitle = (t) => `<h1 class="page-title">${esc(t)}</h1>`;
  const hash = (path, q) => { const p = new URLSearchParams(); Object.keys(q).forEach((k) => { if (q[k]) p.set(k, q[k]); }); const s = p.toString(); return "#/" + path + (s ? "?" + s : ""); };

  /* ---------- views ---------- */
  let rt = 0, current = null, activeNav = "home";

  function viewHome() {
    const t = rt;
    const head = `<div class="hello"><span class="chip">${avatarSVG(true)}</span>${pageTitle(prefs.theme === "apple" ? "Home" : "Hello, " + prefs.username + "!")}</div>`;
    view.innerHTML = head + skRow(3);
    ensureData().then((d) => {
      if (t !== rt) return;
      let html = head;
      if (favs.length) html += rowHTML({ name: "My Favorites", games: favs }, "#/favorites");
      if (recents.length) html += rowHTML({ name: "Recently Played", games: recents }, "#/profile");
      d.rows.forEach((r) => { html += rowHTML(r); });
      view.innerHTML = html;
      hydrate(view);
    });
  }

  function viewGames(q) {
    const t = rt;
    view.innerHTML = pageTitle("Games") + `<div class="grid">${skCard.repeat(12)}</div>`;
    ensureData().then((d) => {
      if (t !== rt) return;
      const rowId = q.row || "all", genre = q.genre || "", sort = q.sort || (rowId === "all" ? "players" : "default");
      const row = d.rows.find((r) => r.id === rowId);
      let list = row ? row.games.slice() : Array.from(d.all.values());
      const counts = {};
      list.forEach((g) => { if (g.genre) counts[g.genre] = (counts[g.genre] || 0) + 1; });
      const genres = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 14);
      if (genre) list = list.filter((g) => g.genre === genre);
      if (sort === "players") list.sort((a, b) => b.players - a.players);
      if (sort === "rating") list = list.filter((g) => g.up + g.down > 500).sort((a, b) => API.ratio(b) - API.ratio(a));
      const pill = (label, on, href) => `<a class="pill${on ? " on" : ""}" href="${href}">${esc(label)}</a>`;
      const rowPills = pill("All games", !row, hash("games", { genre, sort: q.sort })) +
        d.rows.map((r) => pill(r.name, row && row.id === r.id, hash("games", { row: r.id, genre, sort: q.sort }))).join("");
      const genrePills = pill("Any genre", !genre, hash("games", { row: q.row, sort: q.sort })) +
        genres.map((g) => pill(g, genre === g, hash("games", { row: q.row, genre: g, sort: q.sort }))).join("");
      const sorts = [["default", "List order"], ["players", "Most players"], ["rating", "Top rated"]];
      view.innerHTML = pageTitle(row ? row.name : "Games") +
        `<div class="filters"><div class="pills">${rowPills}</div><div class="pills">${genrePills}</div>
         <div class="pills sortpills">${sorts.map(([v, l]) => pill(l, sort === v, hash("games", { row: q.row, genre, sort: v }))).join("")}</div></div>` +
        (list.length ? `<div class="grid">${list.slice(0, 150).map(cardHTML).join("")}</div>` : emptyState("No games here", "Try a different genre or list."));
      hydrate(view);
    });
  }

  function viewSearch(q) {
    const t = rt, term = (q.q || "").trim();
    const bar = `<form class="searchbar" id="viewSearch">${ic("search")}<input type="search" value="${esc(term)}" placeholder="Search games" autocomplete="off" enterkeyhint="search" aria-label="Search games"></form>`;
    const chips = ["Obby", "Tycoon", "Simulator", "Horror", "Anime", "Racing", "Roleplay", "Shooter"];
    const recent = searches.filter((s) => !chips.includes(s)).slice(0, 6);
    const chipHTML = `<div class="pills chips">${recent.concat(chips).map((c) => `<a class="pill" href="#/search?q=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}</div>`;
    const head = pageTitle("Search") + (prefs.theme === "apple" ? bar : "");
    if (!term) { view.innerHTML = head + emptyState("Find a game", "Type a name or tap a genre.", chipHTML); return; }
    view.innerHTML = head + `<p class="muted">Results for "${esc(term)}"</p><div class="grid">${skCard.repeat(8)}</div>`;
    const show = (list, note) => {
      if (t !== rt) return;
      view.innerHTML = head + `<p class="muted">${list.length} result${list.length === 1 ? "" : "s"} for "${esc(term)}"${note || ""}</p>` +
        (list.length ? `<div class="grid">${list.map(cardHTML).join("")}</div>` : emptyState("No games found", "Check the spelling or try a broader word.", chipHTML));
      hydrate(view);
    };
    API.search(term).then((list) => show(list)).catch(() => {
      ensureData().then((d) => {
        const lt = term.toLowerCase();
        const list = Array.from(d.all.values()).filter((g) => g.name.toLowerCase().includes(lt) || (g.genre || "").toLowerCase().includes(lt));
        show(list, list.length ? " (from the games already loaded)" : "");
      });
    });
  }

  function viewFavorites() {
    view.innerHTML = pageTitle("Favorites") + (favs.length
      ? `<div class="grid">${favs.map(cardHTML).join("")}</div>`
      : emptyState("No favorites yet", "Open a game and tap Favorite to keep it here.", '<a class="btn" href="#/games">Browse games</a>'));
    hydrate(view);
  }

  function viewGame(uid, placeId) {
    const t = rt;
    const base = data.all.get(uid) || favs.find((g) => g.id === uid) || recents.find((g) => g.id === uid) || null;
    current = base;
    view.innerHTML = `<div class="detail loading"><div class="d-media"><div class="d-shot sk"></div></div><div class="d-info"><h1 class="d-title">${esc(base ? clean(base.name) : "Loading\u2026")}</h1></div></div>`;
    Promise.all([API.getDetails(uid), API.loadIcons([uid])]).then(([det]) => {
      if (t !== rt) return;
      const info = det.info || {}, votes = det.votes || {};
      if (!info.id && !base) {
        view.innerHTML = emptyState("Couldn't load this game", "Roblox didn't answer. Check your connection and try again.",
          placeId ? `<a class="btn" href="https://www.roblox.com/games/${esc(placeId)}" target="_blank" rel="noopener">Open on roblox.com</a>` : "");
        return;
      }
      const g = {
        id: uid, placeId: String(info.rootPlaceId || placeId || (base && base.placeId) || ""),
        name: info.name || (base && base.name) || "Game",
        players: info.playing != null ? info.playing : (base ? base.players : 0),
        up: votes.upVotes != null ? votes.upVotes : (base ? base.up : 0),
        down: votes.downVotes != null ? votes.downVotes : (base ? base.down : 0),
        genre: info.genre_l1 || info.genre || (base && base.genre) || ""
      };
      current = g;
      const p = pct(g), has = g.up + g.down > 0;
      const shots = det.shots.length ? det.shots : (API.iconFor(uid) ? [API.iconFor(uid)] : []);
      const isFav = favs.some((f) => f.id === uid);
      const stats = [
        ["Playing", Number(g.players).toLocaleString()], ["Visits", info.visits != null ? fmt(info.visits) : "-"],
        ["Favorites", info.favoritedCount != null ? fmt(info.favoritedCount) : "-"], ["Created", info.created ? fmtDate(info.created) : "-"],
        ["Updated", info.updated ? fmtDate(info.updated) : "-"], ["Max players", info.maxPlayers || "-"], ["Genre", g.genre || "-"]
      ];
      view.innerHTML = `<div class="detail">
        <div class="d-media">
          <img class="d-shot" id="mainShot" alt="" ${shots[0] ? `src="${esc(shots[0])}"` : ""}>
          ${shots.length > 1 ? `<div class="d-thumbs">${shots.map((s, i) => `<button type="button" class="${i ? "" : "on"}" data-shot="${esc(s)}" aria-label="Screenshot ${i + 1}"><img alt="" src="${esc(s)}"></button>`).join("")}</div>` : ""}
        </div>
        <div class="d-info">
          <h1 class="d-title">${esc(clean(g.name))}</h1>
          ${info.creator ? `<div class="d-by">By <b>${esc(info.creator.name)}</b></div>` : ""}
          <div class="d-actions">
            <button type="button" class="play-btn" data-play="${esc(g.placeId)}" aria-label="Play">${ic("play")}<span class="pb-text">Play</span></button>
            <a class="btn sec" href="roblox://placeId=${esc(g.placeId)}">Open in app</a>
            <button type="button" class="btn sec ${isFav ? "on" : ""}" data-fav>${ic("heart")}<span>${isFav ? "Favorited" : "Favorite"}</span></button>
            <button type="button" class="btn sec" data-share>${ic("share")}<span>Share</span></button>
          </div>
          ${has ? `<div class="d-rate" title="${p}% liked"><div class="ratebar"><i style="width:${p}%"></i></div><span>${p}% liked \u00b7 ${fmt(g.up)} up, ${fmt(g.down)} down</span></div>` : ""}
        </div>
        <dl class="d-stats">${stats.map(([k, v]) => `<div class="stat"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <div class="tabs" role="tablist"><button type="button" class="on" data-tab="about" role="tab">About</button><button type="button" data-tab="servers" role="tab">Servers</button></div>
        <div class="tab-pane" id="paneAbout"><p class="desc">${esc(info.description || "No description yet.")}</p></div>
        <div class="tab-pane" id="paneServers" hidden></div>
      </div>`;
      const img = $("#mainShot");
      if (img && !shots[0]) img.classList.add("empty");
    });
  }

  function viewAvatar() {
    const sw = (key, colors) => `<div class="swatches" data-key="${key}">${colors.map((c) => `<button type="button" class="${avatar[key] === c ? "on" : ""}" style="background:${c}" data-swatch="${c}" aria-label="${c}"></button>`).join("")}</div>`;
    const skin = ["#fce0c8", "#f5cd9a", "#e0ac69", "#c68642", "#8d5524", "#5c3a21"];
    const bright = ["#00a2ff", "#02b757", "#e74c3c", "#f1c40f", "#9b59b6", "#34495e", "#ff7aa8", "#ffffff", "#222222"];
    view.innerHTML = pageTitle("Avatar") + `<div class="avatar-edit"><div class="avatar-stage">${avatarSVG(false)}</div>
      <div class="avatar-ctl"><h3>Skin</h3>${sw("skin", skin)}<h3>Shirt</h3>${sw("shirt", bright)}<h3>Pants</h3>${sw("pants", bright)}
      <p class="muted">Your pretend avatar is saved on this device only.</p></div></div>`;
  }

  function viewProfile() {
    const t = rt;
    const head = `<div class="profile-head"><span class="chip big">${avatarSVG(true)}</span><div><h1 class="page-title">${esc(prefs.username)}</h1>
      <p class="muted">Joined ${fmtDate(prefs.joined)} \u00b7 ${favs.length} favorite${favs.length === 1 ? "" : "s"}</p></div></div>`;
    let html = head;
    if (favs.length) html += rowHTML({ name: "Favorites", games: favs }, "#/favorites");
    html += recents.length ? rowHTML({ name: "Recently Played", games: recents }, "#/profile") : emptyState("Nothing played yet", "Games you press Play on will show up here.");
    view.innerHTML = html;
    hydrate(view);
  }

  function viewSettings() {
    const apple = prefs.theme === "apple";
    const seg = (key, opts) => `<div class="seg" role="group" data-key="${key}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${String(prefs[key]) === v ? "on" : ""}">${l}</button>`).join("")}</div>`;
    view.innerHTML = pageTitle("Settings") + `
      <div class="group"><h3 class="group-title">Look</h3>
        <div class="srow"><div><b>Style</b><small>2018 Classic or an Apple-style layout.</small></div>${seg("theme", [["classic", "2018 Classic"], ["apple", "Apple"]])}</div>
        ${apple ? `<div class="srow"><div><b>Appearance</b></div>${seg("scheme", [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]])}</div>
        <div class="srow"><div><b>Navigation</b><small>Auto uses a sidebar on iPad and a tab bar on iPhone.</small></div>${seg("nav", [["auto", "Auto"], ["side", "Sidebar"], ["tab", "Tab bar"]])}</div>` : ""}
      </div>
      <div class="group"><h3 class="group-title">Profile</h3>
        <div class="srow"><div><b>Username</b><small>Only shown on this device.</small></div><input id="unameInput" class="field" maxlength="20" value="${esc(prefs.username)}" autocomplete="off" autocapitalize="off"></div>
      </div>
      <div class="group"><h3 class="group-title">Data</h3>
        <div class="srow"><div><b>Game data</b><small>${esc(statusText() || "Loading\u2026")}</small></div><button type="button" class="btn sec" data-act="refresh">Refresh</button></div>
        <div class="srow"><div><b>Favorites</b><small>${favs.length} saved</small></div><button type="button" class="btn sec" data-act="clear-favs">Clear</button></div>
        <div class="srow"><div><b>Recently played</b><small>${recents.length} saved</small></div><button type="button" class="btn sec" data-act="clear-recents">Clear</button></div>
      </div>
      <div class="group"><h3 class="group-title">Home Screen</h3>
        <div class="srow"><div><b>Install on iPhone or iPad</b><small>Shows the Add to Home Screen steps.</small></div><button type="button" class="btn sec" data-act="a2hs">Show steps</button></div>
      </div>`;
  }

  function viewMore() {
    const ids = ["favorites", "profile", "messages", "friends", "inventory", "trade", "groups", "blog", "settings"];
    view.innerHTML = pageTitle("More") + `<ul class="list">${ids.map((id) => `<li><a href="${ITEMS[id][2]}">${ic(ITEMS[id][1])}<span>${ITEMS[id][0]}</span>${ic("chevron", "chev")}</a></li>`).join("")}</ul>
      <ul class="list"><li><a href="https://www.roblox.com/catalog" target="_blank" rel="noopener">${ic("bag")}<span>Catalog</span>${ic("ext", "chev")}</a></li>
      <li><a href="https://create.roblox.com" target="_blank" rel="noopener">${ic("blog")}<span>Develop</span>${ic("ext", "chev")}</a></li>
      <li><a href="https://www.roblox.com/upgrades/robux" target="_blank" rel="noopener">${ic("robux")}<span>Robux</span>${ic("ext", "chev")}</a></li></ul>`;
  }

  const STUBS = {
    messages: ["Messages", "https://www.roblox.com/my/messages"], friends: ["Friends", "https://www.roblox.com/users/friends"],
    inventory: ["Inventory", "https://www.roblox.com/users/inventory"], trade: ["Trade", "https://www.roblox.com/trades"],
    groups: ["Groups", "https://www.roblox.com/communities"], blog: ["Blog", "https://blog.roblox.com"]
  };
  function viewPage(id) {
    if (id === "about") {
      view.innerHTML = pageTitle("About") + `<div class="prose"><p>This is an unofficial fan project that browses Roblox's public game lists with a 2018-style look, plus an Apple-style layout you can switch to in Settings.</p>
        <p>It doesn't log in, can't play games, and isn't affiliated with Roblox Corporation. Pressing Play opens the game's page on roblox.com.</p>
        <p>${esc(statusText())}</p></div>`;
      return;
    }
    const s = STUBS[id];
    if (!s) { view.innerHTML = emptyState("Page not found", "That page doesn't exist.", '<a class="btn" href="#/home">Go home</a>'); return; }
    view.innerHTML = pageTitle(s[0]) + emptyState("This part lives on roblox.com", "This fan site only covers browsing games. " + s[0] + " needs your real account.", `<a class="btn" href="${s[1]}" target="_blank" rel="noopener">Open ${esc(s[0])} on roblox.com</a>`);
  }

  /* ---------- router ---------- */
  function route() {
    rt++; current = null;
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, qs] = raw.split("?");
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    const name = parts[0] || "home";
    const q = Object.fromEntries(new URLSearchParams(qs || ""));
    root.classList.remove("drawer-open");
    window.scrollTo(0, 0);
    const active = name === "game" ? "games" : name === "page" ? (parts[1] || "more") : name;
    activeNav = active;
    setActive(active);
    $("#topSearchInput").value = name === "search" ? (q.q || "") : "";
    $("#sideSearchInput").value = name === "search" ? (q.q || "") : "";
    switch (name) {
      case "home": return viewHome();
      case "games": return viewGames(q);
      case "search": return viewSearch(q);
      case "game": return viewGame(parts[1] || "", parts[2] || "");
      case "favorites": return viewFavorites();
      case "avatar": return viewAvatar();
      case "profile": return viewProfile();
      case "settings": return viewSettings();
      case "more": return viewMore();
      case "page": return viewPage(parts[1] || "");
      default: return viewHome();
    }
  }

  /* ---------- preferences / layout ---------- */
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const UA = navigator.userAgent;
  const IS_IPAD = /iPad/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const IS_IOS = /iPhone|iPod/.test(UA) || IS_IPAD;
  const IS_PHONE = /iPhone|iPod|Android.*Mobile/.test(UA);

  function computeNav() {
    const w = window.innerWidth;
    if (prefs.theme === "apple") {
      if (prefs.nav === "tab") return "tab";
      if (prefs.nav === "side") return w < 700 ? "drawer" : "side";
      return (IS_PHONE || w < 700) ? "tab" : "side";
    }
    return w >= 860 ? "side" : "drawer";
  }

  function applyPrefs() {
    const apple = prefs.theme === "apple";
    root.dataset.theme = prefs.theme;
    const scheme = !apple ? "light" : prefs.scheme === "auto" ? (mq.matches ? "dark" : "light") : prefs.scheme;
    root.dataset.scheme = scheme;
    root.dataset.nav = computeNav();
    root.dataset.collapsed = prefs.collapsed ? "1" : "0";
    $("#theme-color").setAttribute("content", !apple ? "#232527" : scheme === "dark" ? "#000000" : "#f2f2f7");
    renderNav();
    refreshAvatarChips();
    setActive(activeNav);
  }

  function setPref(k, v) {
    prefs[k] = v; store.set("prefs", prefs);
    applyPrefs();
    route();
  }

  /* ---------- actions ---------- */
  function findByPlace(pid) {
    if (current && current.placeId === pid) return current;
    let hit = null;
    data.all.forEach((g) => { if (!hit && g.placeId === pid) hit = g; });
    return hit || favs.find((g) => g.placeId === pid) || recents.find((g) => g.placeId === pid) || null;
  }
  function openPlay(pid) {
    if (!pid) return;
    const g = findByPlace(pid);
    if (g) {
      recents = [g].concat(recents.filter((r) => r.id !== g.id)).slice(0, 20);
      store.set("recents", recents);
    }
    window.open("https://www.roblox.com/games/" + encodeURIComponent(pid), "_blank", "noopener");
  }
  function toggleFav() {
    if (!current) return;
    const has = favs.some((f) => f.id === current.id);
    favs = has ? favs.filter((f) => f.id !== current.id) : [current].concat(favs);
    store.set("favs", favs);
    const b = $("[data-fav]");
    if (b) { b.classList.toggle("on", !has); $("span", b).textContent = has ? "Favorite" : "Favorited"; }
    toast(has ? "Removed from favorites" : "Added to favorites");
  }
  function share() {
    const url = location.href, title = current ? clean(current.name) : "Roblox game";
    if (navigator.share) navigator.share({ title: title, url: url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast("Link copied"), () => toast("Couldn't copy the link"));
  }
  function loadServers(pid) {
    const pane = $("#paneServers");
    if (!pane || pane.dataset.loaded) return;
    pane.dataset.loaded = "1";
    pane.innerHTML = '<p class="muted">Loading servers\u2026</p>';
    API.getServers(pid).then((list) => {
      pane.innerHTML = list.length ? list.map((s) => {
        const w = s.maxPlayers ? Math.round((s.playing / s.maxPlayers) * 100) : 0;
        return `<div class="srv"><div class="srv-info"><b>${s.playing} of ${s.maxPlayers} players</b><div class="srv-bar"><i style="width:${w}%"></i></div>
          <small>${s.ping != null ? "Ping " + Math.round(s.ping) + " ms" : ""}${s.fps ? " \u00b7 " + Math.round(s.fps) + " fps" : ""}</small></div>
          <a class="btn sec" href="roblox://placeId=${esc(pid)}&amp;gameInstanceId=${esc(s.id)}">Join</a></div>`;
      }).join("") : '<p class="muted">No public servers are running right now.</p>';
    }).catch(() => { pane.dataset.loaded = ""; pane.innerHTML = '<p class="muted">Couldn\'t load servers right now. Try again in a moment.</p>'; });
  }

  document.addEventListener("click", (e) => {
    const play = e.target.closest("[data-play]");
    if (play) { e.preventDefault(); e.stopPropagation(); openPlay(play.dataset.play); return; }
    const arrow = e.target.closest(".arrow[data-dir]");
    if (arrow) { const sc = $(".row-scroll", arrow.parentNode); sc.scrollBy({ left: Number(arrow.dataset.dir) * sc.clientWidth * 0.85, behavior: "smooth" }); return; }
    if (e.target.closest("[data-fav]")) { toggleFav(); return; }
    if (e.target.closest("[data-share]")) { share(); return; }
    const shot = e.target.closest("[data-shot]");
    if (shot) { $("#mainShot").src = shot.dataset.shot; $$(".d-thumbs button").forEach((b) => b.classList.toggle("on", b === shot)); return; }
    const tab = e.target.closest("[data-tab]");
    if (tab) {
      $$("[data-tab]").forEach((b) => b.classList.toggle("on", b === tab));
      $("#paneAbout").hidden = tab.dataset.tab !== "about";
      $("#paneServers").hidden = tab.dataset.tab !== "servers";
      if (tab.dataset.tab === "servers" && current) loadServers(current.placeId);
      return;
    }
    const segBtn = e.target.closest(".seg button");
    if (segBtn) { setPref(segBtn.parentNode.dataset.key, segBtn.dataset.v); return; }
    const swatch = e.target.closest("[data-swatch]");
    if (swatch) { avatar[swatch.parentNode.dataset.key] = swatch.dataset.swatch; store.set("avatar", avatar); refreshAvatarChips(); viewAvatar(); return; }
    const act = e.target.closest("[data-act]");
    if (act) {
      const a = act.dataset.act;
      if (a === "refresh") { toast("Refreshing\u2026"); ensureData(true).then(() => { toast(statusText()); route(); }); }
      if (a === "clear-favs") { favs = []; store.set("favs", favs); route(); }
      if (a === "clear-recents") { recents = []; store.set("recents", recents); route(); }
      if (a === "a2hs") showA2HS(true);
      return;
    }
    if (e.target.closest("#menuBtn") || (e.target.closest("#expandBtn") && root.dataset.nav === "drawer")) { root.classList.add("drawer-open"); return; }
    if (e.target.closest("#expandBtn")) { prefs.collapsed = false; store.set("prefs", prefs); root.dataset.collapsed = "0"; return; }
    if (e.target.closest("#collapseBtn")) {
      if (root.dataset.nav === "drawer") root.classList.remove("drawer-open");
      else { prefs.collapsed = true; store.set("prefs", prefs); root.dataset.collapsed = "1"; }
      return;
    }
    if (e.target.closest("#scrim")) root.classList.remove("drawer-open");
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "unameInput") {
      prefs.username = e.target.value.trim().slice(0, 20) || DEFAULTS.username;
      store.set("prefs", prefs); refreshAvatarChips(); toast("Username saved");
    }
  });

  function goSearch(v) {
    v = v.trim();
    if (!v) { location.hash = "#/search"; return; }
    searches = [v].concat(searches.filter((s) => s.toLowerCase() !== v.toLowerCase())).slice(0, 8);
    store.set("searches", searches);
    location.hash = "#/search?q=" + encodeURIComponent(v);
  }
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.id === "topSearch" || f.id === "sideSearch" || f.id === "viewSearch") {
      e.preventDefault();
      goSearch($("input", f).value);
      if (document.activeElement) document.activeElement.blur();
    }
  });

  /* ---------- Add to Home Screen banner (iPhone / iPad) ---------- */
  function showA2HS(force) {
    const box = $("#a2hs");
    const ipad = IS_IPAD || (force && !IS_PHONE && window.innerWidth >= 700);
    box.innerHTML = `<div class="a2hs-card ${ipad ? "ipad" : "iphone"}" role="dialog" aria-label="Add to Home Screen">
      <button class="a2hs-x" type="button" aria-label="Dismiss">${ic("close")}</button>
      <div class="a2hs-head"><img src="icons/icon-192.png" alt="" width="48" height="48"><div><b>Add to Home Screen</b><p>Open this like an app, full screen, with games ready offline.</p></div></div>
      <ol class="a2hs-steps">
        <li><span class="tile">${ic("share")}</span><span>Tap <b>Share</b> ${ipad ? "at the top of Safari" : "in the bottom bar"}</span></li>
        <li><span class="tile">${ic("addhome")}</span><span>Choose <b>Add to Home Screen</b></span></li>
        <li><span class="tile ok">${ic("play")}</span><span>Tap <b>Add</b>, then open it from your Home Screen</span></li>
      </ol>
      <button class="a2hs-never" type="button">Don't show again</button>
      <i class="a2hs-arrow"></i></div>`;
    box.classList.add("show");
    const close = (days) => { box.classList.remove("show"); if (days) store.set("a2hsUntil", Date.now() + days * 864e5); };
    $(".a2hs-x", box).onclick = () => close(30);
    $(".a2hs-never", box).onclick = () => close(3650);
  }
  function maybeA2HS() {
    const standalone = navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) root.classList.add("standalone");
    if (!IS_IOS || standalone) return;
    if (Date.now() < store.get("a2hsUntil", 0)) return;
    setTimeout(() => showA2HS(false), 2500);
  }

  /* ---------- boot ---------- */
  $("#menuBtn").innerHTML = ic("menu");
  $("#collapseBtn").innerHTML = ic("sidebar");
  $("#expandBtn").innerHTML = ic("sidebar");
  $("#topSearchBtn").innerHTML = ic("search");
  $("#sideSearchIcon").outerHTML = ic("search");
  $("#robuxIcon").outerHTML = ic("robux");

  applyPrefs();
  window.addEventListener("resize", () => { root.dataset.nav = computeNav(); });
  window.addEventListener("orientationchange", () => setTimeout(() => { root.dataset.nav = computeNav(); }, 200));
  (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(() => { if (prefs.theme === "apple" && prefs.scheme === "auto") applyPrefs(); });
  window.addEventListener("hashchange", route);
  route();
  maybeA2HS();
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
