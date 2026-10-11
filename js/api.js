// All Roblox data access lives here. If Roblox changes an endpoint, fix it in this file only.
(function () {
  "use strict";
  var C = window.RBX_CONFIG;
  var memo = new Map();
  var TTL = 120000;

  function proxied(u) {
    return C.PROXY.replace(/\/$/, "") + "/?url=" + encodeURIComponent(u);
  }

  function getJSON(u, timeout) {
    var hit = memo.get(u);
    if (hit && Date.now() - hit.t < TTL) return Promise.resolve(hit.data);
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, timeout || 9000);
    return fetch(proxied(u), { signal: ctl.signal })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        memo.set(u, { t: Date.now(), data: data });
        return data;
      })
      .finally(function () { clearTimeout(timer); });
  }

  // Turn any Roblox game object into one shape the UI understands.
  function norm(g) {
    var up = g.totalUpVotes != null ? g.totalUpVotes : (g.upVotes || 0);
    var down = g.totalDownVotes != null ? g.totalDownVotes : (g.downVotes || 0);
    return {
      id: String(g.universeId != null ? g.universeId : g.id),
      placeId: String(g.rootPlaceId || g.placeId || ""),
      name: g.name || "Untitled",
      players: g.playerCount != null ? g.playerCount : (g.playing || 0),
      up: up,
      down: down,
      genre: g.genreL1 || g.genre_l1 || g.genre || ""
    };
  }

  function fromSnapshot() {
    var list = window.RBX_SNAPSHOT.games.map(function (a) {
      return { id: String(a[0]), placeId: String(a[1]), name: a[2], players: a[3], up: a[4], down: a[5], genre: a[6] };
    });
    var byPlayers = list.slice().sort(function (a, b) { return b.players - a.players; });
    var byRating = list.filter(function (g) { return g.up + g.down > 50000; })
      .sort(function (a, b) { return ratio(b) - ratio(a); });
    return [
      { id: "top-trending", name: "Top Trending", info: "Saved copy of popular games.", games: list },
      { id: "most-players", name: "Most Players", info: "", games: byPlayers },
      { id: "top-rated", name: "Top Rated", info: "", games: byRating }
    ];
  }

  function ratio(g) {
    var t = g.up + g.down;
    return t ? g.up / t : 0;
  }

  function parseSorts(json) {
    var rows = [];
    (json.sorts || []).forEach(function (s) {
      if (s.contentType !== "Games" || !s.games || !s.games.length) return;
      rows.push({
        id: s.sortId || s.id,
        name: s.sortDisplayName || "Games",
        info: (s.topicLayoutData && s.topicLayoutData.infoText) || "",
        games: s.games.map(norm)
      });
    });
    return rows;
  }

  // Home page rows. Tries live data, then the last live copy, then the bundled snapshot.
  function getSorts() {
    var sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "test";
    var urls = [
      "https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=test",
      "https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=" + sid + "&device=computer&country=all"
    ];
    return urls.reduce(function (chain, u) {
      return chain.catch(function () {
        return getJSON(u).then(function (j) {
          var rows = parseSorts(j);
          if (!rows.length) throw new Error("No rows");
          return rows;
        });
      });
    }, Promise.reject(new Error("start")))
      .then(function (rows) {
        try { localStorage.setItem("rbx:lastRows", JSON.stringify({ t: Date.now(), rows: rows })); } catch (e) {}
        return { rows: rows, source: "live" };
      })
      .catch(function () {
        try {
          var saved = JSON.parse(localStorage.getItem("rbx:lastRows") || "null");
          if (saved && saved.rows && saved.rows.length) return { rows: saved.rows, source: "saved", t: saved.t };
        } catch (e) {}
        return { rows: fromSnapshot(), source: "snapshot" };
      });
  }

  // Game icons: one batched call per 100 games. Images load straight from Roblox's CDN.
  var icons = new Map();
  var pending = new Map();
  function loadIcons(ids) {
    var need = ids.filter(function (id) { return !icons.has(id); });
    var jobs = [];
    for (var i = 0; i < need.length; i += 100) {
      (function (chunk) {
        var key = chunk.join(",");
        if (!pending.has(key)) {
          var u = "https://thumbnails.roblox.com/v1/games/icons?universeIds=" + key +
            "&returnPolicy=PlaceHolder&size=256x256&format=Png&isCircular=false";
          pending.set(key, getJSON(u).then(function (j) {
            (j.data || []).forEach(function (d) {
              if (d.imageUrl) icons.set(String(d.targetId), d.imageUrl);
            });
          }).catch(function () {}).finally(function () { pending.delete(key); }));
        }
        jobs.push(pending.get(key));
      })(need.slice(i, i + 100));
    }
    return Promise.all(jobs);
  }

  function getDetails(uid) {
    var base = "https://games.roblox.com/v1/games";
    return Promise.all([
      getJSON(base + "?universeIds=" + uid).catch(function () { return null; }),
      getJSON(base + "/votes?universeIds=" + uid).catch(function () { return null; }),
      getJSON("https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=" + uid +
        "&countPerUniverse=4&defaults=true&size=768x432&format=Png&isCircular=false").catch(function () { return null; })
    ]).then(function (r) {
      var d = r[0] && r[0].data && r[0].data[0];
      var v = r[1] && r[1].data && r[1].data[0];
      var t = r[2] && r[2].data && r[2].data[0];
      return {
        info: d || null,
        votes: v || null,
        shots: ((t && t.thumbnails) || []).filter(function (s) { return s.imageUrl; }).map(function (s) { return s.imageUrl; })
      };
    });
  }

  function getServers(placeId) {
    return getJSON("https://games.roblox.com/v1/games/" + placeId + "/servers/Public?sortOrder=Desc&limit=10")
      .then(function (j) { return j.data || []; });
  }

  function search(q) {
    var u = "https://apis.roblox.com/search-api/omni-search?searchQuery=" + encodeURIComponent(q) +
      "&sessionId=test&pageType=all";
    return getJSON(u).then(function (j) {
      var out = [];
      (j.searchResults || []).forEach(function (grp) {
        if (String(grp.contentGroupType).toLowerCase() !== "game") return;
        (grp.contents || []).forEach(function (c) { out.push(norm(c)); });
      });
      if (!out.length) throw new Error("No results");
      return out;
    });
  }

  window.RBX_API = {
    getSorts: getSorts, loadIcons: loadIcons, iconFor: function (id) { return icons.get(id); },
    getDetails: getDetails, clearCache: function () { memo.clear(); }, getServers: getServers, search: search, ratio: ratio
  };
})();
