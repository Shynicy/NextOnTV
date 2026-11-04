const state = {
  startDate: "",
  days: [],
  channels: [],
  matchFilterMode: "all", // 'all' | 'wishlist' | 'watched_movies' | 'watched_series'
  matchDay: "all",
  matchTimeSlot: "all",
  matchChannel: "",
  matchOnlyUnwatched: false,
  libStatus: "all",
  libType: "all",
  libSort: "az", // 'az' | 'za' | 'year_desc' | 'year_asc'
  libViewMode: "cards", // 'cards' | 'compact'
  libQuery: "",
  libraryItems: [],
  selectedLibraryIds: new Set(),
  matchesList: [],
  searchResults: [],
  modalSearchResults: [],
  selectedSearchIndices: new Set(),
  selectedModalIndices: new Set(),
  ignoreNextClickUntil: 0,
  exploreResults: [],
  exploreDay: "all",
  exploreMediaType: "all",
  exploreTimeSlot: "primetime",
  exploreChannel: "",
  exploreQuery: "",
  reminders: [],
  mobileUrl: window.location.origin,
  publicUrl: "",
  syncCode: localStorage.getItem("nextontv_sync_code") || "",
  isCloudMode: false,
};

const WEEKDAYS_IT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const MONTHS_IT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

// Built-in client-side sagas for 4G/5G direct search fallback
const CLIENT_SAGAS = [
  { it: "Harry Potter e la pietra filosofale", orig: "Harry Potter and the Sorcerer's Stone", type: "movie", year: "2001" },
  { it: "Harry Potter e la camera dei segreti", orig: "Harry Potter and the Chamber of Secrets", type: "movie", year: "2002" },
  { it: "Harry Potter e il prigioniero di Azkaban", orig: "Harry Potter and the Prisoner of Azkaban", type: "movie", year: "2004" },
  { it: "Harry Potter e il calice di fuoco", orig: "Harry Potter and the Goblet of Fire", type: "movie", year: "2005" },
  { it: "Harry Potter e l'Ordine della Fenice", orig: "Harry Potter and the Order of the Phoenix", type: "movie", year: "2007" },
  { it: "Harry Potter e il principe mezzosangue", orig: "Harry Potter and the Half-Blood Prince", type: "movie", year: "2009" },
  { it: "Harry Potter e i Doni della Morte - Parte 1", orig: "Harry Potter and the Deathly Hallows: Part 1", type: "movie", year: "2010" },
  { it: "Harry Potter e i Doni della Morte - Parte 2", orig: "Harry Potter and the Deathly Hallows: Part 2", type: "movie", year: "2011" },
  { it: "Fast and Furious", orig: "The Fast and the Furious", type: "movie", year: "2001" },
  { it: "2 Fast 2 Furious", orig: "2 Fast 2 Furious", type: "movie", year: "2003" },
  { it: "The Fast and the Furious: Tokyo Drift", orig: "The Fast and the Furious: Tokyo Drift", type: "movie", year: "2006" },
  { it: "Fast & Furious - Solo parti originali", orig: "Fast & Furious", type: "movie", year: "2009" },
  { it: "Fast & Furious 5", orig: "Fast Five", type: "movie", year: "2011" },
  { it: "Fast & Furious 6", orig: "Fast & Furious 6", type: "movie", year: "2013" },
  { it: "Fast & Furious 7", orig: "Furious 7", type: "movie", year: "2015" },
  { it: "Fast & Furious 8", orig: "The Fate of the Furious", type: "movie", year: "2017" },
  { it: "Fast & Furious - Hobbs & Shaw", orig: "Fast & Furious Presents: Hobbs & Shaw", type: "movie", year: "2019" },
  { it: "Fast & Furious 9 - The Fast Saga", orig: "F9: The Fast Saga", type: "movie", year: "2021" },
  { it: "Fast X", orig: "Fast X", type: "movie", year: "2023" },
  { it: "Il Signore degli Anelli - La Compagnia dell'Anello", orig: "The Lord of the Rings: The Fellowship of the Ring", type: "movie", year: "2001" },
  { it: "Il Signore degli Anelli - Le due torri", orig: "The Lord of the Rings: The Two Towers", type: "movie", year: "2002" },
  { it: "Il Signore degli Anelli - Il ritorno del re", orig: "The Lord of the Rings: The Return of the King", type: "movie", year: "2003" },
  { it: "La maledizione della prima luna", orig: "Pirates of the Caribbean: The Curse of the Black Pearl", type: "movie", year: "2003" },
  { it: "Pirati dei Caraibi - La maledizione del forziere fantasma", orig: "Pirates of the Caribbean: Dead Man's Chest", type: "movie", year: "2006" },
  { it: "Pirati dei Caraibi - Ai confini del mondo", orig: "Pirates of the Caribbean: At World's End", type: "movie", year: "2007" },
  { it: "Pirati dei Caraibi - Oltre i confini del mare", orig: "Pirates of the Caribbean: On Stranger Tides", type: "movie", year: "2011" },
  { it: "Pirati dei Caraibi - La vendetta di Salazar", orig: "Pirates of the Caribbean: Dead Men Tell No Tales", type: "movie", year: "2017" },
  { it: "Ritorno al futuro", orig: "Back to the Future", type: "movie", year: "1985" },
  { it: "Ritorno al futuro - Parte II", orig: "Back to the Future Part II", type: "movie", year: "1989" },
  { it: "Ritorno al futuro - Parte III", orig: "Back to the Future Part III", type: "movie", year: "1990" },
  { it: "Il Gladiatore", orig: "Gladiator", type: "movie", year: "2000" },
  { it: "Deadpool & Wolverine", orig: "Deadpool & Wolverine", type: "movie", year: "2024" },
  { it: "Law & Order - Unità vittime speciali", orig: "Law & Order: Special Victims Unit", type: "series", year: "1999" },
  { it: "Una mamma per amica", orig: "Gilmore Girls", type: "series", year: "2000" },
  { it: "L'ispettore Barnaby", orig: "Midsomer Murders", type: "series", year: "1997" },
  { it: "Supernatural", orig: "Supernatural", type: "series", year: "2005" },
  { it: "NCIS - Unità anticrimine", orig: "NCIS", type: "series", year: "2003" },
];

function normalizeTitleClient(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripConjunctionsClient(normStr) {
  if (!normStr) return "";
  return normStr
    .replace(/\b(and|end|e|ed|n)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function damerauLevenshteinClient(s1, s2, maxDist = 2) {
  if (s1 === s2) return 0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (Math.abs(len1 - len2) > maxDist) return maxDist + 1;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  let prev2 = Array.from({ length: len2 + 1 }, (_, i) => i);
  let prev1 = Array.from({ length: len2 + 1 }, (_, i) => i);
  let curr = new Array(len2 + 1).fill(0);

  for (let i = 1; i <= len1; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      let val = Math.min(prev1[j] + 1, curr[j - 1] + 1, prev1[j - 1] + cost);
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        val = Math.min(val, prev2[j - 2] + 1);
      }
      curr[j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
    const tmp = prev2;
    prev2 = prev1;
    prev1 = curr;
    curr = tmp;
  }
  return prev1[len2];
}

function fuzzyMatchTitleClient(query, candidateRaw) {
  if (!query || !candidateRaw) return false;
  let qRaw = String(query).trim();
  if (!qRaw.includes(" ") && qRaw.length >= 8) {
    qRaw = qRaw.replace(/(.{3,})(and|end)(.{3,})/i, "$1 & $3");
  }
  const qNorm = normalizeTitleClient(qRaw);
  if (!qNorm) return false;
  const qConj = stripConjunctionsClient(qNorm) || qNorm;
  const qNoSpace = qNorm.replace(/\s+/g, "");
  const qConjNoSpace = qConj.replace(/\s+/g, "");

  const candVariants = new Set([
    normalizeTitleClient(candidateRaw),
    stripConjunctionsClient(normalizeTitleClient(candidateRaw)),
  ]);
  if (String(candidateRaw).includes("&") || String(candidateRaw).includes("+")) {
    [" and ", " end ", " e ", " "].forEach((repl) => {
      candVariants.add(normalizeTitleClient(String(candidateRaw).replace(/[&+]/g, repl)));
    });
  }

  for (const cv of candVariants) {
    if (!cv) continue;
    const cvNoSpace = cv.replace(/\s+/g, "");
    if (cv.includes(qNorm) || (qConj.length >= 3 && cv.includes(qConj))) return true;
    if (qNoSpace.length >= 4 && (cvNoSpace.includes(qNoSpace) || (qConjNoSpace.length >= 4 && cvNoSpace.includes(qConjNoSpace)))) {
      return true;
    }
  }

  if (qConjNoSpace.length < 4) return false;
  const maxDist = qConjNoSpace.length <= 5 ? 1 : 2;

  for (const cv of candVariants) {
    if (!cv) continue;
    const cvWords = cv.split(" ");
    const cvNoSpace = cv.replace(/\s+/g, "");
    if (
      damerauLevenshteinClient(qConj, cv, maxDist) <= maxDist ||
      damerauLevenshteinClient(qConjNoSpace, cvNoSpace, maxDist) <= maxDist ||
      damerauLevenshteinClient(qNoSpace, cvNoSpace, maxDist) <= maxDist
    ) {
      return true;
    }

    const prefWords = [];
    for (const w of cvWords.slice(0, 6)) {
      prefWords.push(w);
      const prefSpaced = prefWords.join(" ");
      const prefNoSpace = prefWords.join("");
      if (prefNoSpace.length < 4) continue;
      const localMax = prefNoSpace.length <= 5 ? 1 : maxDist;
      if (
        damerauLevenshteinClient(qConj, prefSpaced, localMax) <= localMax ||
        damerauLevenshteinClient(qConjNoSpace, prefNoSpace, localMax) <= localMax ||
        damerauLevenshteinClient(qNoSpace, prefNoSpace, localMax) <= localMax
      ) {
        return true;
      }
    }
  }
  return false;
}

function formatItalianDate(isoDate, longFormat = false) {
  if (!isoDate) return "";
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3) return isoDate;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  const w = WEEKDAYS_IT[dt.getDay()];
  const m = MONTHS_IT[dt.getMonth()];
  return longFormat ? `${w} ${parts[2]} ${m} ${parts[0]}` : `${w} ${parts[2]} ${m}`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(msg) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3200);
}

function buildGoogleCalendarUrl(ev) {
  const title = `📺 ${ev.title}${ev.ep_code ? " (" + ev.ep_code + ")" : ""} su ${ev.channel_name} (Canale ${ev.lcn})`;
  const [y, m, d] = (ev.date || "2026-10-31").split("-");
  const [hh, mm] = (ev.start_time || "21:20").split(":");
  const startDt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
  const endDt = new Date(startDt.getTime() + (ev.duration_min || 60) * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (dt) =>
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  const details = `${ev.description || ""}\nCanale Digitale Terrestre: LCN ${ev.lcn} - ${ev.channel_name}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(startDt)}/${fmt(endDt)}&details=${encodeURIComponent(details)}`;
}

// ============================================================================
// CLOUD SYNC & 4G/5G MOBILE DATA ENGINE (Bytebin + ntfy.sh + LocalStorage)
// ============================================================================
function getLocalSnapshot() {
  try {
    const raw = localStorage.getItem("nextontv_snapshot");
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return {
    library: [],
    deleted_keys: [],
    reminders: [],
    matches: [],
    counts: { all: 0, wishlist: 0, watched_movies: 0, watched_series: 0 },
    days: [],
    updated_at: 0,
  };
}

function saveLocalSnapshot(snap) {
  try {
    localStorage.setItem("nextontv_snapshot", JSON.stringify(snap));
  } catch (e) { }
}

async function pullCloudSnapshotClient(syncCode) {
  if (!syncCode) return null;
  const topic = `nextontv_sync_${syncCode.trim().toLowerCase()}`;
  try {
    const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=all`);
    const text = await res.text();
    const lines = text.trim().split("\n");
    let latestKey = null;
    let latestTs = -1;
    for (const line of lines) {
      if (!line) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.event !== "message") continue;
        const msg = JSON.parse(ev.message || "{}");
        const ts = Number(msg.updated_at || ev.time || 0);
        if (msg.bytebin_key && ts >= latestTs) {
          latestTs = ts;
          latestKey = msg.bytebin_key;
        }
      } catch (e) { }
    }
    if (!latestKey) return null;
    const blobRes = await fetch(`https://bytebin.lucko.me/${latestKey}`);
    const snap = await blobRes.json();
    saveLocalSnapshot(snap);
    return snap;
  } catch (e) {
    return null;
  }
}

async function pushCloudSnapshotClient(syncCode, snap) {
  if (!syncCode) return null;
  try {
    snap.updated_at = Date.now() / 1000;
    snap.source = "mobile";
    saveLocalSnapshot(snap);
    const postRes = await fetch("https://bytebin.lucko.me/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snap),
    });
    const postData = await postRes.json();
    const bytebinKey = postData.key;
    if (!bytebinKey) return null;

    const topic = `nextontv_sync_${syncCode.trim().toLowerCase()}`;
    await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      body: JSON.stringify({
        bytebin_key: bytebinKey,
        updated_at: snap.updated_at,
        source: "mobile",
        items_count: (snap.library || []).length,
      }),
    });
    return bytebinKey;
  } catch (e) {
    return null;
  }
}

function updateHeaderSyncBadge() {
  const pill = document.getElementById("header-sync-pill");
  if (!pill) return;
  const isGhPages = window.location.hostname.includes("github.io");
  if (isGhPages) {
    pill.textContent = "☁️ GitHub Pages (H24)";
    pill.classList.add("offline-mode");
  } else if (state.isCloudMode) {
    pill.textContent = "☁️ Offline / Cloud";
    pill.classList.add("offline-mode");
  } else {
    pill.textContent = "🟢 PC + ☁️ Sync";
    pill.classList.remove("offline-mode");
  }
}

// Global cached EPG events when running serverless on GitHub Pages
let _staticEpgCache = null;

async function fetchStaticEpgEvents() {
  if (_staticEpgCache && _staticEpgCache.length > 0) return _staticEpgCache;
  try {
    const res = await fetch("./data/epg_7days.json", { cache: "no-cache" });
    if (res.ok) {
      _staticEpgCache = await res.json();
      return _staticEpgCache || [];
    }
  } catch (e) { }
  return [];
}

async function apiGet(url) {
  try {
    const isGhPages = window.location.hostname.includes("github.io");
    if (isGhPages) {
      state.isCloudMode = true;
      updateHeaderSyncBadge();
      return await handleClientCloudGet(url);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    state.isCloudMode = false;
    updateHeaderSyncBadge();
    return await res.json();
  } catch (err) {
    // Fallback to Cloud / 4G Mobile Data Mode when away from home Wi-Fi!
    state.isCloudMode = true;
    updateHeaderSyncBadge();
    return await handleClientCloudGet(url);
  }
}

async function apiPost(url, payload) {
  try {
    const isGhPages = window.location.hostname.includes("github.io");
    if (isGhPages) {
      state.isCloudMode = true;
      updateHeaderSyncBadge();
      return await handleClientCloudPost(url, payload);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    state.isCloudMode = false;
    updateHeaderSyncBadge();
    return await res.json();
  } catch (err) {
    state.isCloudMode = true;
    updateHeaderSyncBadge();
    return await handleClientCloudPost(url, payload);
  }
}

// Autonomous 4G/5G / GitHub Pages Mobile Data handlers when PC is unreachable
async function handleClientCloudGet(url) {
  const parsed = new URL(url, window.location.origin);
  const path = parsed.pathname;
  let snap = getLocalSnapshot();

  if (path === "/api/status") {
    let statusFile = null;
    try {
      const sRes = await fetch("./data/status.json", { cache: "no-cache" });
      if (sRes.ok) statusFile = await sRes.json();
    } catch (e) { }

    if (state.syncCode) {
      const cloudSnap = await pullCloudSnapshotClient(state.syncCode);
      if (cloudSnap) snap = cloudSnap;
    }
    return {
      ok: true,
      start_date: (statusFile && statusFile.start_date) || snap.start_date || getCurrentItalianDateIso(),
      fetched_at: (statusFile && statusFile.fetched_at) ? `${statusFile.fetched_at} (GitHub Actions 00:01)` : "GitHub Pages H24",
      total_epg_events: (statusFile && statusFile.total_epg_events) || 10003,
      channels_count: (statusFile && statusFile.channels_count) || 53,
      days: (statusFile && statusFile.days) || snap.days || [],
      library_count: (snap.library || []).length,
      sync_code: state.syncCode,
      mobile_url: window.location.href,
      public_url: "",
    };
  }

  if (path === "/api/channels") {
    try {
      const cRes = await fetch("./data/channels.json", { cache: "no-cache" });
      if (cRes.ok) {
        const cData = await cRes.json();
        if (cData && cData.channels) return cData;
      }
    } catch (e) { }
    return { channels: state.channels || [] };
  }

  if (path === "/api/library") {
    return { items: snap.library || [] };
  }

  if (path === "/api/reminders") {
    return { reminders: snap.reminders || [] };
  }

  if (path === "/api/matches") {
    const filterMode = parsed.searchParams.get("filter_mode") || "all";
    const dayFilter = parsed.searchParams.get("day") || "all";
    const timeSlot = parsed.searchParams.get("time_slot") || "all";
    const lcnFilter = parsed.searchParams.get("lcn") || "";
    const onlyUnwatched = parsed.searchParams.get("only_unwatched") === "1";

    const allEvents = await fetchStaticEpgEvents();
    const libItems = snap.library || [];

    // Map library items by normalized titles
    const libByKey = {};
    libItems.forEach((it) => {
      const normIt = normalizeTitleClient(it.title_it);
      const normOrig = normalizeTitleClient(it.title_original || "");
      if (normIt) libByKey[`${it.media_type}_${normIt}`] = it;
      if (normOrig) libByKey[`${it.media_type}_${normOrig}`] = it;
    });

    const isMatch = (ev) => {
      const kMovie = `movie_${ev.norm_title}`;
      const kSeries = `series_${ev.norm_title}`;
      let matchedItem = libByKey[kMovie] || libByKey[kSeries];
      if (!matchedItem) {
        for (const it of libItems) {
          if (fuzzyMatchTitleClient(it.title_it, ev.title) || fuzzyMatchTitleClient(it.title_original, ev.title)) {
            matchedItem = it;
            break;
          }
        }
      }
      return matchedItem || null;
    };

    let counts = { all: 0, wishlist: 0, watched_movies: 0, watched_series: 0 };
    const matchedEvents = [];

    allEvents.forEach((ev) => {
      const lib = isMatch(ev);
      if (!lib) return;

      const st = lib.status || "wishlist";
      const mtype = lib.media_type || ev.media_type;
      const isMovie = mtype === "movie";

      // Calculate watched episode status
      let isEpWatched = false;
      const epCode = (ev.season && ev.episode) ? `S${ev.season}E${ev.episode}` : "";
      if (lib.watched_episodes && Array.isArray(lib.watched_episodes) && epCode) {
        isEpWatched = lib.watched_episodes.includes(epCode);
      } else if (st === "watched") {
        isEpWatched = true;
      }

      // Check counts
      counts.all++;
      if (st === "wishlist") counts.wishlist++;
      if (st === "watched" && isMovie) counts.watched_movies++;
      if ((st === "watched" || st === "watching") && !isMovie) counts.watched_series++;

      // Filter by category
      if (filterMode === "wishlist" && st !== "wishlist") return;
      if (filterMode === "watched_movies" && !(st === "watched" && isMovie)) return;
      if (filterMode === "watched_series" && !(st in { watched: 1, watching: 1 } && !isMovie)) return;

      // Filter by day
      if (dayFilter !== "all" && ev.date !== dayFilter) return;

      // Filter by channel
      if (lcnFilter && String(ev.lcn) !== String(lcnFilter)) return;

      // Filter by timeslot
      if (timeSlot === "primetime") {
        const hhmm = ev.start_time || "";
        if (hhmm < "20:20" || hhmm > "23:15") return;
      } else if (timeSlot === "evening") {
        const hhmm = ev.start_time || "";
        if (hhmm < "19:00" && hhmm > "00:30") return;
      } else if (timeSlot === "daytime") {
        const hhmm = ev.start_time || "";
        if (hhmm < "06:00" || hhmm > "19:00") return;
      }

      // Filter by unwatched only
      if (onlyUnwatched && (isEpWatched || (isMovie && st === "watched"))) return;

      matchedEvents.push({
        ...ev,
        library_item: lib,
        is_episode_watched: isEpWatched,
        ep_code: epCode,
      });
    });

    return {
      start_date: (statusDataCached && statusDataCached.start_date) || getCurrentItalianDateIso(),
      fetched_at: "GitHub Pages (H24)",
      days: state.days || [],
      total_epg_events: allEvents.length || 10003,
      channels_polled: 53,
      matches: matchedEvents,
      counts,
    };
  }

  if (path === "/api/search") {
    const q = (parsed.searchParams.get("q") || "").trim();
    return await directMobileSearch4G(q, snap.library || []);
  }

  if (path === "/api/series_episodes") {
    const sid = Number(parsed.searchParams.get("series_id") || "0");
    const libItem = (snap.library || []).find((x) => Number(x.id) === sid);
    const titleIt = (libItem ? libItem.title_it : parsed.searchParams.get("title_it")) || "";
    const titleOrig = (libItem ? libItem.title_original : parsed.searchParams.get("title_original")) || titleIt;
    const tvmazeId = (libItem ? libItem.tvmaze_id : Number(parsed.searchParams.get("tvmaze_id") || "0")) || null;
    const watchedSet = new Set(libItem && Array.isArray(libItem.watched_episodes) ? libItem.watched_episodes : []);
    const eps = await fetchSeriesEpisodesClient4G(titleIt, titleOrig, tvmazeId);
    eps.forEach((ep) => {
      ep.watched = watchedSet.has(`S${ep.season}E${ep.episode}`);
    });
    return {
      series_id: libItem ? libItem.id : 0,
      title_it: titleIt,
      episodes: eps,
    };
  }

  return { ok: true };
}

async function fetchSeriesEpisodesClient4G(titleIt, titleOriginal, tvmazeId) {
  try {
    let rawEps = null;
    if (tvmazeId) {
      const r = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}/episodes`);
      if (r.ok) rawEps = await r.json();
    }
    if (!rawEps) {
      const q = titleOriginal || titleIt || "";
      if (q) {
        const r = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(q)}&embed=episodes`);
        if (r.ok) {
          const data = await r.json();
          rawEps = (data._embedded || {}).episodes || null;
        }
      }
    }
    if (Array.isArray(rawEps) && rawEps.length > 0) {
      return rawEps.map((ep) => ({
        season: Number(ep.season || 1),
        episode: Number(ep.number || 1),
        title: ep.name || `Episodio ${ep.number || 1}`,
        airdate: ep.airdate || "",
      }));
    }
  } catch (e) { }

  const fallback = [];
  for (let s = 1; s <= 2; s++) {
    for (let e = 1; e <= 8; e++) {
      fallback.push({
        season: s,
        episode: e,
        title: `Stagione ${s} • Episodio ${e}`,
        airdate: "",
      });
    }
  }
  return fallback;
}

async function directMobileSearch4G(query, libraryItems) {
  const qNorm = normalizeTitleClient(query);
  if (!qNorm) return { results: [] };
  const results = [];

  // 1. Check built-in sagas (with 2-letter typo tolerance, no spaces, and &/and/end/e equivalence)
  CLIENT_SAGAS.forEach((al) => {
    if (fuzzyMatchTitleClient(query, al.it) || fuzzyMatchTitleClient(query, al.orig)) {
      results.push({
        external_id: "saga_" + normalizeTitleClient(al.orig).replace(/\s+/g, "_"),
        media_type: al.type,
        title_it: al.it,
        title_original: al.orig,
        year: al.year,
        poster: "",
        genre: al.type === "series" ? "Serie TV" : "Film",
        description: `${al.type === "series" ? "Serie TV" : "Film"} (${al.year}) • Titolo orig.: ${al.orig}`,
      });
    }
  });

  // 2. Query TVMaze directly over HTTPS (CORS-enabled on 4G/5G!)
  try {
    const mazeRes = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
    const mazeData = await mazeRes.json();
    if (Array.isArray(mazeData)) {
      mazeData.slice(0, 8).forEach((row) => {
        const show = row.show || {};
        results.push({
          external_id: `tvmaze_${show.id}`,
          tvmaze_id: show.id,
          media_type: "series",
          title_it: show.name || "",
          title_original: show.name || "",
          year: (show.premiered || "").slice(0, 4),
          poster: ((show.image || {}).medium || "").replace("http://", "https://"),
          genre: (show.genres || []).join(", ") || "Serie TV",
          description: (show.summary || "").replace(/<[^>]+>/g, "").slice(0, 240),
        });
      });
    }
  } catch (e) { }

  // 3. Query Wikidata Italian entities directly over HTTPS (CORS-enabled on 4G/5G!)
  try {
    const wdUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=it&uselang=it&format=json&origin=*&limit=10`;
    const wdRes = await fetch(wdUrl);
    const wdData = await wdRes.json();
    (wdData.search || []).forEach((item) => {
      const desc = (item.description || "").toLowerCase();
      const isMovie = desc.includes("film") || desc.includes("pellicola") || desc.includes("lungometraggio");
      const isSeries = desc.includes("serie") || desc.includes("telefilm") || desc.includes("fiction") || desc.includes("miniserie");
      if (!isMovie && !isSeries) return;
      const yearMatch = desc.match(/\b(19\d\d|20\d\d)\b/);
      results.push({
        external_id: `wd_${item.id}`,
        media_type: isSeries ? "series" : "movie",
        title_it: item.label || query,
        title_original: item.label || query,
        year: yearMatch ? yearMatch[1] : "",
        poster: "",
        genre: isSeries ? "Serie TV" : "Film",
        description: item.description || "",
      });
    });
  } catch (e) { }

  const libMap = {};
  libraryItems.forEach((it) => {
    libMap[normalizeTitleClient(it.title_it)] = it;
  });

  const dedup = [];
  const seen = new Set();
  results.forEach((r) => {
    const k = `${r.media_type}_${normalizeTitleClient(r.title_it)}`;
    if (seen.has(k)) return;
    seen.add(k);
    const ex = libMap[normalizeTitleClient(r.title_it)];
    r.in_library_status = ex ? ex.status : null;
    r.in_library_id = ex ? ex.id : null;
    r.watched_episodes_count = ex ? (ex.watched_episodes_count || (ex.watched_episodes ? ex.watched_episodes.length : 0)) : 0;
    dedup.push(r);
  });

  return { results: dedup };
}

async function handleClientCloudPost(url, body) {
  const snap = getLocalSnapshot();
  snap.library = snap.library || [];
  snap.deleted_keys = snap.deleted_keys || [];

  if (url === "/api/library") {
    const title_it = (body.title_it || body.title || "").trim();
    const media_type = body.media_type || "movie";
    const status = body.status || "wishlist";
    const norm = normalizeTitleClient(title_it);
    let item = snap.library.find((x) => x.media_type === media_type && normalizeTitleClient(x.title_it) === norm);
    if (item) {
      item.status = status;
    } else {
      item = {
        id: Date.now(),
        external_id: body.external_id || `mobile_${media_type}_${norm.replace(/\s+/g, "_")}`,
        tvmaze_id: body.tvmaze_id || null,
        media_type,
        status,
        title_it,
        title_original: body.title_original || title_it,
        aliases: [norm, normalizeTitleClient(body.title_original || title_it)],
        year: body.year || "",
        poster: body.poster || "",
        genre: body.genre || (media_type === "series" ? "Serie TV" : "Film"),
        description: body.description || "",
        watched_episodes: [],
        watched_episodes_count: 0,
        upcoming_airings: [],
        created_at: new Date().toISOString(),
      };
      snap.library.unshift(item);
    }

    if (media_type === "series") {
      if (status === "watched") {
        const eps = await fetchSeriesEpisodesClient4G(item.title_it, item.title_original, item.tvmaze_id);
        item.watched_episodes = eps.map((ep) => `S${ep.season}E${ep.episode}`);
        item.watched_episodes_count = item.watched_episodes.length;
      } else if (status === "wishlist") {
        item.watched_episodes = [];
        item.watched_episodes_count = 0;
      }
    }

    await pushCloudSnapshotClient(state.syncCode, snap);
    return {
      ok: true,
      id: item.id,
      status,
      title_it,
      watched_episodes_count: item.watched_episodes_count || 0,
    };
  }

  if (url === "/api/library/status") {
    const item = snap.library.find((x) => Number(x.id) === Number(body.id));
    if (item && body.status) {
      item.status = body.status;
      if (item.media_type === "series") {
        if (body.status === "watched") {
          const eps = await fetchSeriesEpisodesClient4G(item.title_it, item.title_original, item.tvmaze_id);
          item.watched_episodes = eps.map((ep) => `S${ep.season}E${ep.episode}`);
          item.watched_episodes_count = item.watched_episodes.length;
        } else if (body.status === "wishlist") {
          item.watched_episodes = [];
          item.watched_episodes_count = 0;
        }
      }
    }
    await pushCloudSnapshotClient(state.syncCode, snap);
    return { ok: true };
  }

  if (url === "/api/library/delete") {
    const normTarget = normalizeTitleClient(body.title_it || body.title || "");
    const idx = snap.library.findIndex(
      (x) =>
        (body.id && Number(x.id) === Number(body.id)) ||
        (normTarget && normalizeTitleClient(x.title_it) === normTarget && (!body.media_type || x.media_type === body.media_type))
    );
    if (idx !== -1) {
      const removed = snap.library[idx];
      snap.deleted_keys.push(`${removed.media_type}_${normalizeTitleClient(removed.title_it)}`);
      snap.library.splice(idx, 1);
    }
    await pushCloudSnapshotClient(state.syncCode, snap);
    return { ok: true };
  }

  if (url === "/api/library/batch") {
    const action = body.action;
    const items = body.items || [];
    for (const it of items) {
      const title_it = (it.title_it || it.title || "").trim();
      if (!title_it) continue;
      const media_type = it.media_type || "movie";
      const norm = normalizeTitleClient(title_it);
      const idx = snap.library.findIndex((x) => x.media_type === media_type && normalizeTitleClient(x.title_it) === norm);
      if (action === "delete") {
        if (idx !== -1) {
          snap.deleted_keys.push(`${media_type}_${norm}`);
          snap.library.splice(idx, 1);
        }
      } else {
        let targetItem;
        if (idx !== -1) {
          snap.library[idx].status = action;
          targetItem = snap.library[idx];
        } else {
          targetItem = {
            id: Date.now() + Math.floor(Math.random() * 10000),
            external_id: it.external_id || `mobile_${media_type}_${norm.replace(/\s+/g, "_")}`,
            tvmaze_id: it.tvmaze_id || null,
            media_type,
            status: action,
            title_it,
            title_original: it.title_original || title_it,
            aliases: [norm, normalizeTitleClient(it.title_original || title_it)],
            year: it.year || "",
            poster: it.poster || "",
            genre: it.genre || (media_type === "series" ? "Serie TV" : "Film"),
            description: it.description || "",
            watched_episodes: [],
            watched_episodes_count: 0,
            upcoming_airings: [],
            created_at: new Date().toISOString(),
          };
          snap.library.unshift(targetItem);
        }
        if (media_type === "series") {
          if (action === "watched") {
            const eps = await fetchSeriesEpisodesClient4G(targetItem.title_it, targetItem.title_original, targetItem.tvmaze_id);
            targetItem.watched_episodes = eps.map((ep) => `S${ep.season}E${ep.episode}`);
            targetItem.watched_episodes_count = targetItem.watched_episodes.length;
          } else if (action === "wishlist") {
            targetItem.watched_episodes = [];
            targetItem.watched_episodes_count = 0;
          }
        }
      }
    }
    await pushCloudSnapshotClient(state.syncCode, snap);
    return { ok: true, action };
  }

  if (url === "/api/episodes/toggle" || url === "/api/episodes/mark_season") {
    let seriesId = Number(body.series_id || 0);
    const meta = body.series_meta || {};
    const createdFromSearch = Boolean(body.created_from_search);
    const totalEpisodes = Number(body.total_episodes || 0);
    let item = snap.library.find((x) => Number(x.id) === seriesId);
    if (!item && meta.title_it) {
      const norm = normalizeTitleClient(meta.title_it);
      item = snap.library.find((x) => x.media_type === "series" && normalizeTitleClient(x.title_it) === norm);
      if (!item && body.watched) {
        item = {
          id: Date.now(),
          external_id: meta.external_id || `mobile_series_${norm.replace(/\s+/g, "_")}`,
          tvmaze_id: meta.tvmaze_id || null,
          media_type: "series",
          status: "watching",
          title_it: meta.title_it,
          title_original: meta.title_original || meta.title_it,
          aliases: [norm, normalizeTitleClient(meta.title_original || meta.title_it)],
          year: meta.year || "",
          poster: meta.poster || "",
          genre: meta.genre || "Serie TV",
          description: meta.description || "",
          watched_episodes: [],
          watched_episodes_count: 0,
          upcoming_airings: [],
          created_at: new Date().toISOString(),
        };
        snap.library.unshift(item);
      }
    }
    if (!item) return { ok: true, status: null, series_id: 0, watched_count: 0 };

    const watchedSet = new Set(Array.isArray(item.watched_episodes) ? item.watched_episodes : []);
    if (url === "/api/episodes/toggle") {
      const key = `S${Number(body.season || 1)}E${Number(body.episode || 1)}`;
      if (body.watched) watchedSet.add(key);
      else watchedSet.delete(key);
    } else {
      const sNum = Number(body.season || 1);
      (body.episodes || []).forEach((eNum) => {
        const key = `S${sNum}E${Number(eNum)}`;
        if (body.watched) watchedSet.add(key);
        else watchedSet.delete(key);
      });
    }

    item.watched_episodes = Array.from(watchedSet);
    item.watched_episodes_count = item.watched_episodes.length;

    if (item.watched_episodes_count === 0) {
      if (createdFromSearch) {
        const idx = snap.library.findIndex((x) => Number(x.id) === Number(item.id));
        if (idx !== -1) snap.library.splice(idx, 1);
        await pushCloudSnapshotClient(state.syncCode, snap);
        return { ok: true, status: null, series_id: 0, watched_count: 0 };
      }
      item.status = "wishlist";
    } else if (totalEpisodes > 0 && item.watched_episodes_count >= totalEpisodes) {
      item.status = "watched";
    } else {
      item.status = "watching";
    }

    await pushCloudSnapshotClient(state.syncCode, snap);
    return {
      ok: true,
      status: item.status,
      series_id: item.id,
      watched_count: item.watched_episodes_count,
    };
  }

  return { ok: true };
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function getCurrentItalianDateIso() {
  try {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

async function initApp() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => { });
  }

  // Security & Device Audit Log (Discreet 🛡️ tracking with 7-day auto-purge)
  logCurrentAccess();

  // Check if URL has ?sync=nextontv-xxxx
  const urlParams = new URLSearchParams(window.location.search);
  const syncParam = urlParams.get("sync");
  if (syncParam) {
    state.syncCode = syncParam.trim().toLowerCase();
    localStorage.setItem("nextontv_sync_code", state.syncCode);
  }

  setupNavigationAndEvents();

  const [chRes, stRes, remRes] = await Promise.all([
    apiGet("/api/channels"),
    apiGet("/api/status"),
    apiGet("/api/reminders"),
  ]);

  state.channels = chRes.channels || [];
  state.startDate = stRes.start_date || getCurrentItalianDateIso();
  state.days = stRes.days || [];
  state.reminders = remRes.reminders || [];
  state.mobileUrl = stRes.mobile_url || window.location.origin;
  state.publicUrl = stRes.public_url || "";
  if (stRes.sync_code && !state.syncCode) {
    state.syncCode = stRes.sync_code;
    localStorage.setItem("nextontv_sync_code", state.syncCode);
  }

  const remBadge = document.getElementById("reminders-count-badge");
  if (remBadge) {
    remBadge.textContent = state.reminders.length;
  }
  populateChannelDropdowns();
  renderDaysStrips();

  await Promise.all([loadMatches(false), loadLibrary()]);

  // Automatically check every 60s and on tab wake-up if the Italian date (Europe/Rome) has changed
  const checkItalianDateRollover = () => {
    const todayIt = getCurrentItalianDateIso();
    if (state.startDate && todayIt !== state.startDate) {
      state.startDate = todayIt;
      state.matchDay = "all";
      loadMatches(false);
      loadLibrary();
    }
  };
  setInterval(checkItalianDateRollover, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkItalianDateRollover();
  });
}

function populateChannelDropdowns() {
  const selMatch = document.getElementById("match-channel");
  const html =
    `<option value="">📺 Tutti i canali (LCN 1–70)</option>` +
    state.channels
      .map((c) => `<option value="${c.lcn}">Canale ${c.lcn} — ${escapeHtml(c.name)}</option>`)
      .join("");
  if (selMatch) selMatch.innerHTML = html;
}

function renderDaysStrips() {
  const renderStrip = (containerId, activeDay, onSelect) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = `<button class="day-pill ${activeDay === "all" ? "active" : ""}" data-day="all">Tutti i 7 giorni</button>`;
    state.days.forEach((d, idx) => {
      const label = idx === 0 ? `Oggi • ${formatItalianDate(d)}` : formatItalianDate(d);
      html += `<button class="day-pill ${activeDay === d ? "active" : ""}" data-day="${d}">${label}</button>`;
    });
    el.innerHTML = html;
    el.querySelectorAll(".day-pill").forEach((btn) => {
      btn.addEventListener("click", () => onSelect(btn.dataset.day));
    });
  };

  renderStrip("match-days-strip", state.matchDay, (day) => {
    state.matchDay = day;
    renderDaysStrips();
    loadMatches(false);
  });
}

// ============================================================================
// TAB 1: 7-DAY PALINSESTO MATCHER ("IN ONDA PER TE")
// ============================================================================
async function loadMatches(forceRefresh = false) {
  const container = document.getElementById("matches-results-container");
  if (forceRefresh) {
    container.innerHTML = `<div class="loading-state">🔄 Sincronizzazione Cloud e aggiornamento palinsesti dei prossimi 7 giorni...</div>`;
    if (!state.isCloudMode) {
      await apiPost("/api/sync", { sync_code: state.syncCode });
    } else if (state.syncCode) {
      await pullCloudSnapshotClient(state.syncCode);
    }
  }

  const params = new URLSearchParams({
    start_date: state.startDate,
    filter_mode: state.matchFilterMode,
    day: state.matchDay,
    time_slot: state.matchTimeSlot,
    only_unwatched: state.matchOnlyUnwatched ? "1" : "0",
    lcn: state.matchChannel,
    refresh: forceRefresh ? "1" : "0",
  });

  const data = await apiGet(`/api/matches?${params.toString()}`);
  if (data.days && data.days.length) {
    state.days = data.days;
    renderDaysStrips();
  }

  document.getElementById("epg-header-status").textContent =
    `${data.channels_polled || 52} canali del DTT attivi • ${data.total_epg_events || 0} programmi analizzati (7 giorni) • Agg. ${data.fetched_at || "ora"}`;

  const counts = data.counts || {};
  document.getElementById("count-all").textContent = counts.all || 0;
  document.getElementById("count-wishlist").textContent = counts.wishlist || 0;
  document.getElementById("count-watched_movies").textContent = counts.watched_movies || 0;
  document.getElementById("count-watched_series").textContent = counts.watched_series || 0;

  const matches = data.matches || [];
  state.matchesList = matches;

  // Save to local cache for offline/4G usage
  if (!state.isCloudMode && state.matchFilterMode === "all" && state.matchDay === "all") {
    const snap = getLocalSnapshot();
    snap.matches = matches;
    snap.counts = counts;
    snap.days = state.days;
    snap.start_date = state.startDate;
    snap.fetched_at = data.fetched_at;
    saveLocalSnapshot(snap);
  }

  if (matches.length === 0) {
    const modeLabel = {
      all: "nelle tue liste (Wishlist o Già visti)",
      wishlist: "nella tua lista Da Vedere (Wishlist)",
      watched_movies: "tra i Film che hai già visto",
      watched_series: "tra le Serie TV che hai già visto / segui",
    }[state.matchFilterMode];

    container.innerHTML = `
      <div class="empty-box">
        <p>Nessun programma TV trovato nei prossimi 7 giorni ${modeLabel} con i filtri attuali.</p>
        <p style="margin-top:8px;font-size:0.8rem;">💡 Suggerimento: prova a selezionare <strong>"Tutti i 7 giorni"</strong> o aggiungi nuovi film e serie TV dalla scheda <strong>"Cerca & Aggiungi"</strong>!</p>
      </div>
    `;
    return;
  }

  const byDate = {};
  matches.forEach((m, idx) => {
    m._matchIndex = idx;
    byDate[m.date] = byDate[m.date] || [];
    byDate[m.date].push(m);
  });

  let html = "";
  Object.keys(byDate)
    .sort()
    .forEach((d) => {
      const dayItems = byDate[d];
      html += `
        <div class="day-group-header">
          <span>📅 ${formatItalianDate(d, true)}</span>
          <span>${dayItems.length} ${dayItems.length === 1 ? "programma TV" : "programmi TV"}</span>
        </div>
      `;
      dayItems.forEach((ev) => {
        html += renderMatchCard(ev, ev._matchIndex);
      });
    });

  container.innerHTML = html;
  bindMatchCardEvents(container);
}

function renderMatchCard(ev, matchIndex) {
  const lib = ev.library_item || {};
  const isMovie = ev.media_type === "movie";
  const isWishlist = lib.status === "wishlist";

  let statusBadgeHtml = "";
  if (isWishlist) {
    statusBadgeHtml = `<span class="list-status-pill wishlist">🎯 Da Vedere (${isMovie ? "Film" : "Serie TV"})</span>`;
  } else if (isMovie) {
    statusBadgeHtml = `<span class="list-status-pill watched">🎬 Visto</span>`;
  } else {
    statusBadgeHtml = `<span class="list-status-pill watched">📺 Completata ${ev.is_episode_watched ? "• ✓ Ep. già visto" : "• ✨ Ep. da vedere!"}</span>`;
  }

  let epLineHtml = "";
  if (!isMovie && (ev.season || ev.episode || ev.episode_title)) {
    const seText =
      ev.season && ev.episode
        ? `Stagione ${ev.season} • Episodio ${ev.episode}`
        : ev.episode
          ? `Episodio ${ev.episode}`
          : "";
    const epT = ev.episode_title ? ` — "${escapeHtml(ev.episode_title)}"` : "";
    epLineHtml = `<div class="tv-ep-line">🎞️ ${seText}${epT}</div>`;
  }

  const posterHtml = ev.poster
    ? `<img src="${escapeHtml(ev.poster)}" alt="${escapeHtml(ev.title)}" class="tv-poster" loading="lazy" onerror="this.outerHTML='<div class=\\'tv-poster\\'>${isMovie ? "🎬" : "📺"}</div>'" />`
    : `<div class="tv-poster">${isMovie ? "🎬" : "📺"}</div>`;

  const calUrl = buildGoogleCalendarUrl(ev);
  const watchedBtnText = isMovie
    ? lib.status === "watched"
      ? "✅ Visto"
      : "✓ Segna Film Visto"
    : ev.is_episode_watched
      ? `✅ ${ev.ep_code || "Episodio"} Visto`
      : `✓ Segna ${ev.ep_code || "Episodio"} Visto`;

  return `
    <article class="tv-card">
      ${posterHtml}
      <div class="tv-body">
        <div class="tv-meta-top">
          <span class="lcn-badge" style="background:${ev.channel_color || "#334155"}">
            CH ${ev.lcn} • ${escapeHtml(ev.channel_name)}
          </span>
          <span class="time-badge">
            🕒 ${ev.start_time}${ev.end_time ? " - " + ev.end_time : ""} (${ev.duration_min} min)
          </span>
          ${statusBadgeHtml}
        </div>
        <h3 class="tv-title">${escapeHtml(ev.title)}</h3>
        ${epLineHtml}
        <p class="tv-desc">${escapeHtml(ev.description || "")}</p>
        <div class="tv-actions">
          <a href="${calUrl}" target="_blank" rel="noopener" class="btn-action" title="Aggiungi sveglia su Google Calendar">
            📅 Sveglia Calendario
          </a>

          <button
            type="button"
            class="btn-action btn-mark-watched ${ev.is_episode_watched ? "active-watched" : ""}"
            data-lib-id="${lib.id}"
            data-media-type="${ev.media_type}"
            data-season="${ev.season || 1}"
            data-episode="${ev.episode || 1}"
            data-currently-watched="${ev.is_episode_watched ? "1" : "0"}"
          >
            ${watchedBtnText}
          </button>

          ${!isMovie
      ? `<button type="button" class="btn-action btn-open-series-tracker" data-series-id="${lib.id}">📋 Tutti gli episodi</button>`
      : ""
    }
        </div>
      </div>
    </article>
  `;
}

function bindMatchCardEvents(container) {
  container.querySelectorAll(".btn-toggle-reminder").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ev = state.matchesList[Number(btn.dataset.matchIdx)];
      if (!ev) return;
      const lib = ev.library_item || {};
      const payload = {
        event_id: ev.id,
        library_id: lib.id,
        title: ev.title,
        lcn: ev.lcn,
        channel_name: ev.channel_name,
        date: ev.date,
        start_time: ev.start_time,
        start_iso: ev.start_iso,
        episode_info: ev.ep_code || ev.episode_title || "",
      };
      const res = await apiPost("/api/reminders/toggle", payload);
      if (res.active) {
        requestNotificationPermissionAndSchedule(payload);
        showToast(`🔔 Promemoria attivato per "${payload.title}" su Canale ${payload.lcn}!`);
      } else {
        showToast("Promemoria rimosso.");
      }
      const remRes = await apiGet("/api/reminders");
      state.reminders = remRes.reminders || [];
      document.getElementById("reminders-count-badge").textContent = state.reminders.length;
      loadMatches(false);
    });
  });

  container.querySelectorAll(".btn-mark-watched").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const libId = Number(btn.dataset.libId);
      const mediaType = btn.dataset.mediaType;
      const currentlyWatched = btn.dataset.currentlyWatched === "1";

      if (mediaType === "movie") {
        const newStatus = currentlyWatched ? "wishlist" : "watched";
        await apiPost("/api/library/status", { id: libId, status: newStatus });
        showToast(newStatus === "watched" ? "🎬 Film segnato come Già Visto!" : "🎯 Film riportato in Da Vedere (Wishlist).");
      } else {
        const season = Number(btn.dataset.season || 1);
        const episode = Number(btn.dataset.episode || 1);
        await apiPost("/api/episodes/toggle", {
          series_id: libId,
          season,
          episode,
          watched: !currentlyWatched,
        });
        showToast(!currentlyWatched ? `✅ Episodio S${season}E${episode} segnato come visto!` : `Episodio S${season}E${episode} segnato come da vedere.`);
      }
      loadMatches(false);
      loadLibrary();
    });
  });

  container.querySelectorAll(".btn-open-series-tracker").forEach((btn) => {
    btn.addEventListener("click", () => {
      openSeriesTrackerModal(Number(btn.dataset.seriesId));
    });
  });
}

// ============================================================================
// TAB 2: LE MIE LISTE 
// ============================================================================
async function loadLibrary() {
  const data = await apiGet(`/api/library?start_date=${state.startDate}`);
  state.libraryItems = data.items || [];
  if (!state.isCloudMode) {
    const snap = getLocalSnapshot();
    snap.library = state.libraryItems;
    saveLocalSnapshot(snap);
  }
  renderLibrary();
}

function askDeleteConfirmation(itemsToDelete) {
  return new Promise((resolve) => {
    const count = Array.isArray(itemsToDelete) ? itemsToDelete.length : 1;
    const modal = document.getElementById("modal-confirm-delete");
    const msgEl = document.getElementById("confirm-delete-message");
    const subEl = document.getElementById("confirm-delete-sub");
    const btnCancel = document.getElementById("btn-cancel-delete");
    const btnConfirm = document.getElementById("btn-confirm-delete");

    if (!modal || !msgEl || !btnCancel || !btnConfirm) {
      const fallbackMsg =
        count === 1
          ? "Sei sicuro di voler eliminare questo elemento?"
          : `Sei sicuro di voler eliminare questi ${count} elementi?`;
      resolve(window.confirm(fallbackMsg));
      return;
    }

    if (count === 1) {
      msgEl.textContent = "Sei sicuro di voler eliminare questo elemento?";
      const singleTitle = (itemsToDelete[0] && (itemsToDelete[0].title_it || itemsToDelete[0].title)) || "";
      subEl.textContent = singleTitle ? `«${singleTitle}»` : "";
    } else {
      msgEl.textContent = `Sei sicuro di voler eliminare questi ${count} elementi?`;
      const titles = (itemsToDelete || [])
        .map((x) => x && (x.title_it || x.title))
        .filter(Boolean);
      subEl.textContent =
        titles.slice(0, 4).join(", ") + (titles.length > 4 ? ` e altri ${titles.length - 4}...` : "");
    }

    modal.classList.remove("hidden");

    const cleanup = (result) => {
      modal.classList.add("hidden");
      btnCancel.removeEventListener("click", onCancel);
      btnConfirm.removeEventListener("click", onConfirm);
      modal.removeEventListener("click", onBackdrop);
      resolve(result);
    };

    const onCancel = () => cleanup(false);
    const onConfirm = () => cleanup(true);
    const onBackdrop = (e) => {
      if (e.target === modal) cleanup(false);
    };

    btnCancel.addEventListener("click", onCancel);
    btnConfirm.addEventListener("click", onConfirm);
    modal.addEventListener("click", onBackdrop);
  });
}

function attachQuickMultiSelectEvents(containerEl, cardSelector, keyAttr, selectedSet, onRender) {
  containerEl.querySelectorAll(cardSelector).forEach((card) => {
    let pressTimer = null;
    let startX = 0;
    let startY = 0;

    const getKey = () => Number(card.getAttribute(keyAttr));

    const isActionBtn = (target) =>
      Boolean(
        target.closest(".btn-lib-single-delete") ||
        target.closest(".btn-pick-search-item") ||
        target.closest(".btn-search-ep-modal") ||
        target.closest(".btn-open-ep-modal") ||
        target.closest(".btn-switch-status") ||
        target.closest(".btn-batch-action") ||
        target.closest(".btn-lib-batch-action")
      );

    // 1. PHONE (Touch): Long-press (~420ms) ONLY needed when selectedSet.size === 0 (to select the FIRST item and open the bar!)
    card.addEventListener(
      "touchstart",
      (e) => {
        state.ignoreNextClickUntil = 0;
        if (selectedSet.size > 0) return; // Once open, a simple tap/click handles selection!
        if (isActionBtn(e.target)) return;
        const touch = e.touches[0];
        if (!touch) return;
        startX = touch.clientX;
        startY = touch.clientY;
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
          state.ignoreNextClickUntil = Date.now() + 800;
          if (navigator.vibrate) {
            try {
              navigator.vibrate(35);
            } catch (err) { }
          }
          selectedSet.add(getKey());
          onRender();
        }, 420);
      },
      { passive: true }
    );

    card.addEventListener(
      "touchmove",
      (e) => {
        if (!pressTimer) return;
        const touch = e.touches[0];
        if (!touch) return;
        if (Math.abs(touch.clientX - startX) > 12 || Math.abs(touch.clientY - startY) > 12) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      },
      { passive: true }
    );

    card.addEventListener("touchend", () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    card.addEventListener("touchcancel", () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    card.addEventListener("contextmenu", (e) => {
      if (!e.target.closest("input, textarea")) {
        e.preventDefault();
      }
    });

    // 2. PC (Mouse): Double-click (dblclick) ONLY needed when selectedSet.size === 0 (to select the FIRST item and open the bar!)
    card.addEventListener("dblclick", (e) => {
      if (selectedSet.size > 0) return; // Once open, a single click handles selection!
      if (isActionBtn(e.target)) return;
      e.preventDefault();
      selectedSet.add(getKey());
      onRender();
    });

    // 3. ONCE MULTI-SELECT IS OPEN (selectedSet.size > 0): Simple single click/tap on ANY item adds or removes it!
    card.addEventListener("click", (e) => {
      if (state.ignoreNextClickUntil && Date.now() < state.ignoreNextClickUntil) {
        state.ignoreNextClickUntil = 0;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (isActionBtn(e.target)) return;
      if (selectedSet.size === 0) return; // When multi-select is closed, single click does nothing!

      e.stopPropagation();
      const key = getKey();
      if (selectedSet.has(key)) {
        selectedSet.delete(key);
      } else {
        selectedSet.add(key);
      }
      onRender();
    });
  });
}

function renderLibrary() {
  const items = state.libraryItems;
  const validIds = new Set(items.map((x) => Number(x.id)));
  Array.from(state.selectedLibraryIds).forEach((id) => {
    if (!validIds.has(Number(id))) {
      state.selectedLibraryIds.delete(id);
    }
  });

  document.getElementById("lib-cnt-all").textContent = items.length;
  document.getElementById("lib-cnt-wish").textContent = items.filter((x) => x.status === "wishlist").length;
  const watchingEl = document.getElementById("lib-cnt-watching");
  if (watchingEl) {
    watchingEl.textContent = items.filter((x) => x.status === "watching").length;
  }
  document.getElementById("lib-cnt-watched").textContent = items.filter((x) => x.status === "watched").length;
  const navCnt = document.getElementById("nav-lib-count");
  if (navCnt) navCnt.textContent = items.length;

  const filtered = items.filter((it) => {
    if (state.libStatus !== "all" && it.status !== state.libStatus) return false;
    if (state.libType !== "all" && it.media_type !== state.libType) return false;
    if (state.libQuery) {
      const matchIt = fuzzyMatchTitleClient(state.libQuery, it.title_it || "");
      const matchOr = fuzzyMatchTitleClient(state.libQuery, it.title_original || "");
      if (!matchIt && !matchOr) return false;
    }
    return true;
  });

  // Sort filtered items (Default: A -> Z, or Z -> A, or by release year newest/oldest)
  filtered.sort((a, b) => {
    const titleA = (a.title_it || "").trim();
    const titleB = (b.title_it || "").trim();
    if (state.libSort === "za") {
      return titleB.localeCompare(titleA, "it", { numeric: true, sensitivity: "base" });
    }
    if (state.libSort === "year_desc") {
      const yA = parseInt(a.year, 10) || 0;
      const yB = parseInt(b.year, 10) || 0;
      if (yB !== yA) return yB - yA;
      return titleA.localeCompare(titleB, "it", { numeric: true, sensitivity: "base" });
    }
    if (state.libSort === "year_asc") {
      const yA = parseInt(a.year, 10) || 9999;
      const yB = parseInt(b.year, 10) || 9999;
      if (yA !== yB) return yA - yB;
      return titleA.localeCompare(titleB, "it", { numeric: true, sensitivity: "base" });
    }
    // Default 'az': A -> Z
    return titleA.localeCompare(titleB, "it", { numeric: true, sensitivity: "base" });
  });

  const container = document.getElementById("library-list-container");
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-box" style="grid-column:1/-1;">
        <p>Nessun titolo trovato in questa vista.</p>
        <button type="button" class="btn-primary btn-sm" style="margin-top:10px;" onclick="document.querySelector('.nav-item[data-tab=\\'tab-search\\']').click()">
          🔍 Vai a Cerca & Aggiungi
        </button>
      </div>
    `;
    return;
  }

  const selSet = state.selectedLibraryIds;
  const selCount = selSet.size;
  const isMultiMode = selCount > 0;
  const allFilteredSelected = filtered.length > 0 && filtered.every((it) => selSet.has(Number(it.id)));

  const libMultiBarHtml = isMultiMode
    ? `
      <div class="multi-select-bar">
        <div class="multi-select-top">
          <button type="button" class="btn-secondary btn-sm" id="btn-lib-toggle-select-all">
            ${allFilteredSelected ? "✕ Deseleziona tutti" : `☑️ Seleziona tutti (${filtered.length})`}
          </button>
          <span class="multi-select-count">
            ${selCount} titol${selCount === 1 ? "o selezionato" : "i selezionati"} (clic semplice per aggiungerne/toglierne altri)
          </span>
        </div>
        <div class="multi-select-actions">
          <button type="button" class="btn-primary btn-sm btn-lib-batch-action" data-action="wishlist">
            🎯 Da Vedere (${selCount})
          </button>
          <button type="button" class="btn-action btn-lib-batch-action" data-action="watching">
            ▶️ Stai Seguendo (${selCount})
          </button>
          <button type="button" class="btn-action active-watched btn-lib-batch-action" data-action="watched">
            ✅ Visti (${selCount})
          </button>
          <button type="button" class="btn-action btn-lib-batch-action" data-action="delete" style="color:#f87171;border-color:rgba(248,113,113,0.4);">
            🗑️ Rimuovi (${selCount})
          </button>
        </div>
      </div>
    `
    : "";

  const itemsHtml = filtered
    .map((it) => {
      const itemId = Number(it.id);
      const isSelected = selSet.has(itemId);
      const isMovie = it.media_type === "movie";
      const isWish = it.status === "wishlist";
      const isWatching = it.status === "watching";
      const upcoming = it.upcoming_airings || [];

      let statusLabel = isMovie ? "✅ Visto" : "✅ Completata";
      let statusShort = isMovie ? "✅ Visto" : "✅ Completata";
      let statusClass = "watched";
      if (isWish) {
        statusLabel = "🎯 Da Vedere (Wishlist)";
        statusShort = "🎯 Da Vedere";
        statusClass = "wishlist";
      } else if (isWatching) {
        statusLabel = "▶️ Stai Seguendo";
        statusShort = "▶️ Seguendo";
        statusClass = "watching";
      }

      // Raw / Compact Title-Only List View
      if (state.libViewMode === "compact") {
        return `
          <div
            class="lib-compact-row selectable-lib-card ${isSelected ? "selected-card" : ""}"
            data-lib-id="${itemId}"
            title="${isMultiMode ? "Clicca per selezionare/deselezionare" : "Su PC: doppio click sul 1° titolo per selezionare • Su Telefono: tieni premuto sul 1° titolo"}"
          >
            <div class="lib-compact-left">
              <span>${isMovie ? "🎬" : "📺"}</span>
              <span class="lib-compact-title">${escapeHtml(it.title_it)}</span>
              ${it.year ? `<span class="lib-compact-year">(${escapeHtml(it.year)})</span>` : ""}
            </div>
            <div class="lib-compact-right">
              ${!isMovie
            ? `<button type="button" class="btn-primary btn-sm btn-open-ep-modal" data-id="${itemId}" style="padding:2px 7px;font-size:0.7rem;">📋 ${it.watched_episodes_count || 0} ep.</button>`
            : ""
          }
              <span class="list-status-pill ${statusClass}" style="font-size:0.68rem;padding:2px 6px;">
                ${statusShort}
              </span>
              ${isMultiMode
            ? `<button type="button" class="card-select-btn ${isSelected ? "selected" : ""}">
                     ${isSelected ? "☑️ Selezionato" : "⬜ Seleziona"}
                   </button>`
            : ""
          }
              <button
                type="button"
                class="btn-lib-single-delete"
                data-id="${itemId}"
                title="Elimina questo elemento dalla lista"
              >✕</button>
            </div>
          </div>
        `;
      }

      // Full Cards View with top-right red-bordered 'X' square button
      const posterHtml = it.poster
        ? `<img src="${escapeHtml(it.poster)}" alt="${escapeHtml(it.title_it)}" class="tv-poster" loading="lazy" onerror="this.outerHTML='<div class=\\'tv-poster\\'>${isMovie ? "🎬" : "📺"}</div>'" />`
        : `<div class="tv-poster">${isMovie ? "🎬" : "📺"}</div>`;

      let upcomingHtml = "";
      if (upcoming.length > 0) {
        const first = upcoming[0];
        upcomingHtml = `
          <div class="airing-alert-box">
            📡 <strong>In TV nei prossimi 7 giorni!</strong><br/>
            Prossimo: <strong>${formatItalianDate(first.date)} ore ${first.start_time}</strong> su <strong>Canale ${first.lcn} (${escapeHtml(first.channel_name)})</strong>
          </div>
        `;
      }

      return `
        <article
          class="tv-card selectable-lib-card ${isSelected ? "selected-card" : ""}"
          data-lib-id="${itemId}"
          title="${isMultiMode ? "Clicca per selezionare/deselezionare" : "Su PC: doppio click sul 1° titolo per selezionare • Su Telefono: tieni premuto sul 1° titolo"}"
        >
          <button
            type="button"
            class="btn-lib-single-delete"
            data-id="${itemId}"
            title="Elimina questo elemento dalla lista"
          >✕</button>
          ${posterHtml}
          <div class="tv-body">
            <div class="tv-meta-top">
              <span class="list-status-pill ${statusClass}">
                ${statusLabel}
              </span>
              <span class="time-badge">${isMovie ? "🎬 Film" : `📺 Serie TV`}</span>
              ${it.year ? `<span class="list-status-pill wishlist">${escapeHtml(it.year)}</span>` : ""}
              ${isMultiMode
          ? `<button type="button" class="card-select-btn ${isSelected ? "selected" : ""}">
                     ${isSelected ? "☑️ Selezionato" : "⬜ Seleziona"}
                   </button>`
          : ""
        }
            </div>
            <h3 class="tv-title">${escapeHtml(it.title_it)}</h3>
            ${it.title_original && it.title_original.toLowerCase() !== it.title_it.toLowerCase()
          ? `<div class="tv-ep-line">Titolo orig.: ${escapeHtml(it.title_original)}</div>`
          : ""
        }
            ${upcomingHtml}
            <p class="tv-desc">${escapeHtml(it.description || "")}</p>
            <div class="tv-actions">
              ${!isMovie
          ? `<button type="button" class="btn-primary btn-sm btn-open-ep-modal" data-id="${itemId}">📋 Episodi (${it.watched_episodes_count || 0})</button>`
          : ""
        }
              ${!isMovie && !isWatching
          ? `<button type="button" class="btn-action btn-switch-status" data-id="${itemId}" data-next="watching">▶️ Sposta in Stai Seguendo</button>`
          : ""
        }
              ${!isMovie && isWatching
          ? `<button type="button" class="btn-action active-watched btn-switch-status" data-id="${itemId}" data-next="watched">✅ Sposta in Completata</button>`
          : ""
        }
              <button type="button" class="btn-action btn-switch-status" data-id="${itemId}" data-next="${isWish ? "watched" : "wishlist"}">
                ${isWish ? (isMovie ? "✅ Sposta in Visto" : "✅ Sposta in Completata") : "🎯 Sposta in Da Vedere"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  container.innerHTML = libMultiBarHtml + itemsHtml;

  // Attach Quick Multi-Select (Long-press on Phone / Double-click on PC for 1st item, then single click for the rest!)
  attachQuickMultiSelectEvents(container, ".selectable-lib-card", "data-lib-id", selSet, renderLibrary);

  const selectAllLibBtn = container.querySelector("#btn-lib-toggle-select-all");
  if (selectAllLibBtn) {
    selectAllLibBtn.addEventListener("click", () => {
      if (allFilteredSelected) {
        selSet.clear();
      } else {
        filtered.forEach((it) => selSet.add(Number(it.id)));
      }
      renderLibrary();
    });
  }

  // Single 'X' Delete Button in Top-Right Corner (Always asks confirmation!)
  container.querySelectorAll(".btn-lib-single-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const targetId = Number(btn.dataset.id);
      const targetItem = items.find((x) => Number(x.id) === targetId);
      if (!targetItem) return;

      const confirmed = await askDeleteConfirmation([targetItem]);
      if (!confirmed) return;

      await apiPost("/api/library/delete", {
        id: targetItem.id,
        title_it: targetItem.title_it,
        media_type: targetItem.media_type,
      });
      selSet.delete(targetId);
      showToast(`🗑️ "${targetItem.title_it}" eliminato dalla lista!`);
      await loadLibrary();
      loadMatches(false);
    });
  });

  container.querySelectorAll(".btn-lib-batch-action").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action; // 'wishlist' | 'watching' | 'watched' | 'delete'
      const pickedItems = items.filter((it) => selSet.has(Number(it.id)));
      if (pickedItems.length === 0) return;

      if (action === "delete") {
        const confirmed = await askDeleteConfirmation(pickedItems);
        if (!confirmed) return;
      }

      btn.disabled = true;
      btn.textContent = "⏳ Elaborazione...";

      await apiPost("/api/library/batch", {
        action,
        items: pickedItems,
      });

      selSet.clear();
      if (action === "delete") {
        showToast(`🗑️ ${pickedItems.length} ${pickedItems.length === 1 ? "elemento rimosso" : "elementi rimossi"} dalle tue liste!`);
      } else if (action === "watching") {
        showToast(`▶️ ${pickedItems.length} titoli spostati in Stai Seguendo!`);
      } else if (action === "watched") {
        showToast(`✅ ${pickedItems.length} titoli spostati in Visti!`);
      } else {
        showToast(`🎯 ${pickedItems.length} titoli spostati in Da Vedere!`);
      }

      await loadLibrary();
      loadMatches(false);
    });
  });

  container.querySelectorAll(".btn-open-ep-modal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openSeriesTrackerModal(Number(btn.dataset.id));
    });
  });

  container.querySelectorAll(".btn-switch-status").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const targetId = Number(btn.dataset.id);
      const nextSt = btn.dataset.next;
      const targetItem = items.find((x) => Number(x.id) === targetId);
      const isSeries = targetItem && targetItem.media_type === "series";

      btn.disabled = true;
      btn.textContent = "⏳ Aggiornamento...";

      await apiPost("/api/library/status", { id: targetId, status: nextSt });
      if (nextSt === "watching") {
        showToast("▶️ Spostato in Stai Seguendo!");
      } else if (nextSt === "watched") {
        showToast(
          isSeries
            ? "✅ Serie completata: tutti gli episodi spuntati e spostata in Visto!"
            : "✅ Spostato in Visto!"
        );
      } else {
        showToast("🎯 Spostato in Da Vedere (Wishlist)!");
      }
      await loadLibrary();
      loadMatches(false);
    });
  });
}

// ============================================================================
// SHARED ADD/TOGGLE/REMOVE HELPER (USED BY SEARCH TAB, MODAL LIVE SEARCH & EXPLORE)
// ============================================================================
async function addCatalogItemToLibrary(item, status, buttonElement) {
  if (!item) return;
  const titleIt = item.title_it || item.title || "";
  const mediaType = item.media_type || "movie";

  // If the item is ALREADY in this exact status list, clicking again removes it!
  if (item.in_library_status === status) {
    if (buttonElement) {
      buttonElement.disabled = true;
      buttonElement.textContent = "⏳ Rimozione...";
    }
    await apiPost("/api/library/delete", {
      id: item.in_library_id || null,
      title_it: titleIt,
      media_type: mediaType,
    });
    item.in_library_status = null;
    item.in_library_id = null;
    item.watched_episodes_count = 0;

    showToast(`🗑️ "${titleIt}" rimosso dalla lista!`);
    await loadLibrary();
    loadMatches(false);
    return;
  }

  // Otherwise add to the list (or move between Da Vedere <-> Già Visti!)
  if (buttonElement) {
    buttonElement.disabled = true;
    buttonElement.textContent = "⏳ Salvataggio...";
  }
  const payload = {
    external_id: item.external_id || "",
    imdb_id: item.imdb_id || "",
    tvmaze_id: item.tvmaze_id || null,
    media_type: mediaType,
    title_it: titleIt,
    title_original: item.title_original || titleIt,
    year: item.year || "",
    poster: item.poster || "",
    genre: item.genre || (mediaType === "series" ? "Serie TV" : "Film"),
    description: item.description || "",
    status: status,
  };

  const res = await apiPost("/api/library", payload);
  item.in_library_status = status;
  if (res && res.id) {
    item.in_library_id = res.id;
  }
  if (mediaType === "series") {
    if (status === "wishlist") {
      item.watched_episodes_count = 0;
    } else if (res && typeof res.watched_episodes_count === "number") {
      item.watched_episodes_count = res.watched_episodes_count;
    }
  }

  if (mediaType === "series" && status === "watched") {
    showToast(`✅ "${payload.title_it}" salvata in Già Visti (tutti i ${item.watched_episodes_count || ""} episodi spuntati)!`);
  } else {
    showToast(
      `✨ "${payload.title_it}" salvato in ${status === "wishlist" ? "🎯 Da Vedere (Wishlist)" : "✅ Già Visti"}!`
    );
  }

  await loadLibrary();
  loadMatches(false);
}

function renderSearchResultCards(results, targetContainer, isCompactModal = false) {
  if (!results || results.length === 0) {
    targetContainer.innerHTML = `
      <div class="empty-box" style="padding:18px;">
        <p>Nessun titolo trovato. Prova a scrivere il nome in modo diverso.</p>
      </div>
    `;
    return;
  }

  const selectedSet = isCompactModal ? state.selectedModalIndices : state.selectedSearchIndices;
  const selCount = selectedSet.size;
  const isMultiMode = selCount > 0;
  const allSelected = results.length > 0 && selCount === results.length;

  const multiBarHtml = isMultiMode
    ? `
    <div class="multi-select-bar">
      <div class="multi-select-top">
        <button type="button" class="btn-secondary btn-sm" id="btn-toggle-select-all-${isCompactModal ? "modal" : "main"}">
          ${allSelected ? "✕ Deseleziona tutti" : `☑️ Seleziona tutti (${results.length})`}
        </button>
        <span class="multi-select-count">
          ${selCount} titol${selCount === 1 ? "o selezionato" : "i selezionati"}
        </span>
      </div>
      <div class="multi-select-actions">
        <button type="button" class="btn-primary btn-sm btn-batch-action" data-action="wishlist">
          🎯 + Da Vedere (${selCount})
        </button>
        <button type="button" class="btn-action active-watched btn-batch-action" data-action="watched">
          ✅ + Già Visti (${selCount})
        </button>
        <button type="button" class="btn-action btn-batch-action" data-action="delete" style="color:#f87171;border-color:rgba(248,113,113,0.4);">
          🗑️ Rimuovi (${selCount})
        </button>
      </div>
    </div>
  `
    : "";

  const cardsHtml = results
    .map((item, idx) => {
      const isMovie = item.media_type === "movie";
      const inWish = item.in_library_status === "wishlist";
      const inWatching = item.in_library_status === "watching";
      const inWatched = item.in_library_status === "watched";
      const isSelected = selectedSet.has(idx);

      const posterHtml = item.poster
        ? `<img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title_it)}" class="tv-poster" loading="lazy" onerror="this.outerHTML='<div class=\\'tv-poster\\'>${isMovie ? "🎬" : "📺"}</div>'" />`
        : `<div class="tv-poster">${isMovie ? "🎬" : "📺"}</div>`;

      let inListLabel = "";
      if (inWish) inListLabel = "Da Vedere";
      else if (inWatching) inListLabel = "Stai Seguendo";
      else if (inWatched) inListLabel = isMovie ? "Visto" : "Completata";

      return `
        <article class="tv-card selectable-search-card ${isSelected ? "selected-card" : ""}" data-card-idx="${idx}" title="Su PC: doppio click per selezionare • Su Telefono: tieni premuto per selezionare">
          ${posterHtml}
          <div class="tv-body">
            <div class="tv-meta-top">
              <span class="time-badge">${isMovie ? "🎬 Film" : "📺 Serie TV"}</span>
              ${item.year ? `<span class="list-status-pill wishlist">📅 ${escapeHtml(item.year)}</span>` : ""}
              ${inListLabel
          ? `<span class="list-status-pill ${inWatching ? "watching" : "watched"}">✓ In lista (${inListLabel})</span>`
          : ""
        }
              ${isMultiMode
          ? `<button
                type="button"
                class="card-select-btn ${isSelected ? "selected" : ""}"
                data-idx="${idx}"
                title="Seleziona o deseleziona questo titolo"
              >
                ${isSelected ? "☑️ Selezionato" : "⬜ Seleziona"}
              </button>`
          : ""
        }
            </div>
            <h3 class="tv-title">${escapeHtml(item.title_it)}</h3>
            ${item.title_original && item.title_original.toLowerCase() !== item.title_it.toLowerCase()
          ? `<div class="tv-ep-line">Titolo originale: ${escapeHtml(item.title_original)}</div>`
          : ""
        }
            <p class="tv-desc">${escapeHtml(item.description || "")}</p>
            <div class="tv-actions">
              <button
                type="button"
                class="${inWish ? "btn-action active-watched" : "btn-primary btn-sm"} btn-pick-search-item"
                data-idx="${idx}"
                data-status="wishlist"
                data-modal="${isCompactModal ? "1" : "0"}"
                title="${inWish ? "Clicca di nuovo per rimuovere da Da Vedere" : "Aggiungi in Da Vedere"}"
              >
                ${inWish ? "🎯 In Da Vedere" : "🎯 Aggiungi in Wishlist"}
              </button>
              <button
                type="button"
                class="btn-action ${inWatched ? "active-watched" : ""} btn-pick-search-item"
                data-idx="${idx}"
                data-status="watched"
                data-modal="${isCompactModal ? "1" : "0"}"
                title="${inWatched ? "Clicca di nuovo per rimuovere da Già Visti" : "Aggiungi in Già Visti"}"
              >
                ${inWatched ? "✅ In Visti" : "✅ Aggiungi in Visti"}
              </button>
              ${!isMovie
          ? `<button
                    type="button"
                    class="btn-primary btn-sm btn-search-ep-modal"
                    data-idx="${idx}"
                    data-modal="${isCompactModal ? "1" : "0"}"
                    title="Apri la lista episodi per spuntare quelli che hai visto"
                  >
                    📋 Episodi${item.watched_episodes_count ? ` (${item.watched_episodes_count})` : ""}
                  </button>`
          : ""
        }
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  targetContainer.innerHTML = multiBarHtml + cardsHtml;

  // Attach Quick Multi-Select (Long-press on Phone / Double-click on PC for 1st item, then single click for the rest!)
  attachQuickMultiSelectEvents(targetContainer, ".selectable-search-card", "data-card-idx", selectedSet, () =>
    renderSearchResultCards(results, targetContainer, isCompactModal)
  );

  // Multi-select: Select All / Deselect All
  const selectAllBtn = targetContainer.querySelector(`#btn-toggle-select-all-${isCompactModal ? "modal" : "main"}`);
  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      if (allSelected) {
        selectedSet.clear();
      } else {
        results.forEach((_, idx) => selectedSet.add(idx));
      }
      renderSearchResultCards(results, targetContainer, isCompactModal);
    });
  }

  // Multi-select: Batch Action Buttons (Add to Wishlist, Add to Watched, or Delete all selected)
  targetContainer.querySelectorAll(".btn-batch-action").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action; // 'wishlist' | 'watched' | 'delete'
      const pickedItems = Array.from(selectedSet)
        .map((i) => results[i])
        .filter(Boolean);
      if (pickedItems.length === 0) return;

      if (action === "delete") {
        const confirmed = await askDeleteConfirmation(pickedItems);
        if (!confirmed) return;
      }

      btn.disabled = true;
      btn.textContent = "⏳ Elaborazione...";

      await apiPost("/api/library/batch", {
        action,
        items: pickedItems,
      });

      selectedSet.clear();
      if (action === "delete") {
        showToast(`🗑️ ${pickedItems.length} titoli rimossi dalle tue liste!`);
      } else {
        showToast(
          `✨ ${pickedItems.length} titoli salvati in ${action === "wishlist" ? "🎯 Da Vedere" : "✅ Già Visti"}!`
        );
      }

      await loadLibrary();
      loadMatches(false);

      // Sync updated status & watched_episodes_count from state.libraryItems back to search results
      const libByKey = {};
      (state.libraryItems || []).forEach((li) => {
        libByKey[`${li.media_type}_${normalizeTitleClient(li.title_it)}`] = li;
      });
      pickedItems.forEach((it) => {
        const key = `${it.media_type || "movie"}_${normalizeTitleClient(it.title_it || it.title || "")}`;
        const found = libByKey[key];
        if (action === "delete" || !found) {
          it.in_library_status = null;
          it.in_library_id = null;
          it.watched_episodes_count = 0;
        } else {
          it.in_library_status = found.status;
          it.in_library_id = found.id;
          it.watched_episodes_count = found.watched_episodes_count || 0;
        }
      });

      renderSearchResultCards(results, targetContainer, isCompactModal);
    });
  });

  // Single item buttons (click once to add/switch list, click again on active list to remove!)
  targetContainer.querySelectorAll(".btn-pick-search-item").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const idx = Number(btn.dataset.idx);
      const status = btn.dataset.status;
      const isModal = btn.dataset.modal === "1";
      const list = isModal ? state.modalSearchResults : state.searchResults;
      const item = list[idx];
      await addCatalogItemToLibrary(item, status, btn);
      renderSearchResultCards(list, targetContainer, isModal);
    });
  });

  // Series Episodes button directly in Cerca & Aggiungi
  targetContainer.querySelectorAll(".btn-search-ep-modal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = Number(btn.dataset.idx);
      const isModal = btn.dataset.modal === "1";
      const list = isModal ? state.modalSearchResults : state.searchResults;
      const item = list[idx];
      if (!item) return;
      openSeriesTrackerModal(item.in_library_id || 0, item);
    });
  });
}

// ============================================================================
// TAB 3 & MODAL LIVE SEARCH: CERCA & AGGIUNGI FILM E SERIE TV
// ============================================================================
async function executeCatalogSearch(query) {
  const container = document.getElementById("search-results-container");
  container.innerHTML = `<div class="loading-state">🔍 Ricerca di "${escapeHtml(query)}" tra tutti i Film e le Serie TV...</div>`;

  const data = await apiGet(`/api/search?q=${encodeURIComponent(query)}`);
  state.searchResults = data.results || [];
  state.selectedSearchIndices.clear();
  renderSearchResultCards(state.searchResults, container, false);
}

async function executeModalLiveSearch(query) {
  const container = document.getElementById("modal-live-search-results");
  if (!query || query.trim().length < 2) {
    container.innerHTML = `<div class="empty-box" style="padding:18px;">Digita almeno 2 lettere per cercare tra tutti i film e le serie TV.</div>`;
    return;
  }
  container.innerHTML = `<div class="loading-state" style="padding:18px;">🔍 Ricerca di "${escapeHtml(query)}"...</div>`;
  const data = await apiGet(`/api/search?q=${encodeURIComponent(query)}`);
  state.modalSearchResults = data.results || [];
  state.selectedModalIndices.clear();
  renderSearchResultCards(state.modalSearchResults, container, true);
}

// ============================================================================
// TV TIME SERIES EPISODE TRACKER MODAL (FLUID IN-PLACE UPDATES + SYNC ON CLOSE)
// ============================================================================
async function openSeriesTrackerModal(seriesId, searchItemMeta = null) {
  const modal = document.getElementById("modal-series");
  const body = document.getElementById("modal-series-body");
  modal.classList.remove("hidden");
  body.innerHTML = `<div class="loading-state">Caricamento stagioni ed episodi in stile TV Time...</div>`;

  const params = new URLSearchParams({
    series_id: String(seriesId || 0),
  });
  if (searchItemMeta) {
    params.set("title_it", searchItemMeta.title_it || searchItemMeta.title || "");
    params.set("title_original", searchItemMeta.title_original || searchItemMeta.title_it || "");
    if (searchItemMeta.tvmaze_id) {
      params.set("tvmaze_id", String(searchItemMeta.tvmaze_id));
    }
  }

  const data = await apiGet(`/api/series_episodes?${params.toString()}`);
  const resolvedSeriesId = data.series_id || seriesId || 0;
  const resolvedTitle = data.title_it || (searchItemMeta && searchItemMeta.title_it) || "Serie TV";
  document.getElementById("modal-series-title").textContent = `📺 ${resolvedTitle}`;

  state.activeSeriesModal = {
    seriesId: resolvedSeriesId,
    title_it: resolvedTitle,
    episodes: data.episodes || [],
    dirty: false,
    searchItemMeta: searchItemMeta || null,
    createdFromSearch: Boolean(!resolvedSeriesId),
  };

  renderSeriesTrackerModalBody();
}

function renderSeriesTrackerModalBody() {
  const body = document.getElementById("modal-series-body");
  if (!body || !state.activeSeriesModal) return;

  const savedScrollTop = body.scrollTop;
  const { episodes } = state.activeSeriesModal;
  const total = episodes.length || 1;
  const watchedCount = episodes.filter((e) => e.watched).length;
  const pct = Math.min(100, Math.round((watchedCount / total) * 100));
  const nextEp = episodes.find((e) => !e.watched);

  let statusHint = state.activeSeriesModal.createdFromSearch && watchedCount === 0
    ? "Spunta gli episodi visti per aggiungerla a ▶️ Stai Seguendo"
    : "🎯 Da Vedere (0 episodi visti)";
  if (watchedCount >= episodes.length && episodes.length > 0) {
    statusHint = "✅ Serie Completata (Già Visti)";
  } else if (watchedCount > 0) {
    statusHint = "▶️ Stai Seguendo (In corso)";
  }

  const bySeason = {};
  episodes.forEach((ep) => {
    bySeason[ep.season] = bySeason[ep.season] || [];
    bySeason[ep.season].push(ep);
  });

  let html = `
    <div class="progress-box">
      <div class="row-between">
        <strong>Stato avanzamento: ${watchedCount} / ${episodes.length} episodi visti (${pct}%)</strong>
        <span style="font-size:0.75rem;color:#fcd34d;font-weight:700;">${statusHint}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      ${nextEp
      ? `<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
               <span style="font-size:0.82rem;color:#fcd34d;">▶️ Prossimo da vedere: <strong>S${nextEp.season}E${nextEp.episode} — ${escapeHtml(nextEp.title)}</strong></span>
               <button type="button" class="btn-primary btn-sm" id="btn-mark-next-ep" data-s="${nextEp.season}" data-e="${nextEp.episode}">✓ Segna Visto</button>
             </div>`
      : `<div style="margin-top:8px;font-size:0.82rem;color:#34d399;">🎉 Hai visto tutti gli episodi disponibili!</div>`
    }
    </div>
  `;

  Object.keys(bySeason)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((sNum) => {
      const sEps = bySeason[sNum];
      const sWatched = sEps.filter((x) => x.watched).length;
      const allSeasonWatched = sWatched === sEps.length;

      html += `
        <div class="season-block">
          <div class="season-header">
            <span>Stagione ${sNum} (${sWatched}/${sEps.length} visti)</span>
            <button
              type="button"
              class="btn-action btn-sm btn-toggle-season"
              data-s="${sNum}"
              data-all-watched="${allSeasonWatched ? "1" : "0"}"
              data-eps="${sEps.map((x) => x.episode).join(",")}"
            >
              ${allSeasonWatched ? "Deseleziona stagione" : "✓ Spunta tutta la Stagione"}
            </button>
          </div>
          <div class="season-episodes">
            ${sEps
          .map(
            (ep) => `
              <div class="episode-row" data-s="${ep.season}" data-e="${ep.episode}" style="cursor:pointer;">
                <div>
                  <strong>S${String(ep.season).padStart(2, "0")}E${String(ep.episode).padStart(2, "0")}</strong> — ${escapeHtml(ep.title)}
                  ${ep.airdate ? `<span style="color:var(--text-muted);font-size:0.72rem;margin-left:6px;">(${ep.airdate})</span>` : ""}
                </div>
                <button
                  type="button"
                  class="ep-check-btn ${ep.watched ? "watched" : ""}"
                  data-s="${ep.season}"
                  data-e="${ep.episode}"
                  data-w="${ep.watched ? "1" : "0"}"
                  title="Segna episodio visto"
                >✓</button>
              </div>
            `
          )
          .join("")}
          </div>
        </div>
      `;
    });

  body.innerHTML = html;
  body.scrollTop = savedScrollTop;

  const applyEpisodeApiResponse = (res) => {
    if (!state.activeSeriesModal || !res) return;
    if (typeof res.series_id === "number") {
      state.activeSeriesModal.seriesId = res.series_id;
    }
    if (state.activeSeriesModal.searchItemMeta) {
      state.activeSeriesModal.searchItemMeta.in_library_id = res.series_id || null;
      state.activeSeriesModal.searchItemMeta.in_library_status = res.status || null;
      state.activeSeriesModal.searchItemMeta.watched_episodes_count =
        typeof res.watched_count === "number"
          ? res.watched_count
          : state.activeSeriesModal.episodes.filter((x) => x.watched).length;
    }
  };

  const toggleSingleEpisodeInMemoryAndSync = async (seasonNum, epNum, newWatchedState) => {
    const targetEp = episodes.find((x) => Number(x.season) === seasonNum && Number(x.episode) === epNum);
    if (targetEp) {
      targetEp.watched = newWatchedState;
    }
    state.activeSeriesModal.dirty = true;
    renderSeriesTrackerModalBody();
    const res = await apiPost("/api/episodes/toggle", {
      series_id: state.activeSeriesModal.seriesId || 0,
      season: seasonNum,
      episode: epNum,
      watched: newWatchedState,
      total_episodes: episodes.length,
      series_meta: state.activeSeriesModal.searchItemMeta || { title_it: state.activeSeriesModal.title_it },
      created_from_search: Boolean(state.activeSeriesModal.createdFromSearch),
    });
    applyEpisodeApiResponse(res);
  };

  const nextBtn = body.querySelector("#btn-mark-next-ep");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      toggleSingleEpisodeInMemoryAndSync(Number(nextBtn.dataset.s), Number(nextBtn.dataset.e), true);
    });
  }

  body.querySelectorAll(".episode-row").forEach((row) => {
    row.addEventListener("click", () => {
      const s = Number(row.dataset.s);
      const e = Number(row.dataset.e);
      const targetEp = episodes.find((x) => Number(x.season) === s && Number(x.episode) === e);
      const currentlyWatched = targetEp ? Boolean(targetEp.watched) : false;
      toggleSingleEpisodeInMemoryAndSync(s, e, !currentlyWatched);
    });
  });

  body.querySelectorAll(".btn-toggle-season").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const s = Number(btn.dataset.s);
      const allW = btn.dataset.allWatched === "1";
      const newWatchedState = !allW;
      const epsList = btn.dataset.eps.split(",").filter(Boolean).map(Number);

      episodes.forEach((ep) => {
        if (Number(ep.season) === s) {
          ep.watched = newWatchedState;
        }
      });
      state.activeSeriesModal.dirty = true;
      renderSeriesTrackerModalBody();

      const res = await apiPost("/api/episodes/mark_season", {
        series_id: state.activeSeriesModal.seriesId || 0,
        season: s,
        episodes: epsList,
        watched: newWatchedState,
        total_episodes: episodes.length,
        series_meta: state.activeSeriesModal.searchItemMeta || { title_it: state.activeSeriesModal.title_it },
        created_from_search: Boolean(state.activeSeriesModal.createdFromSearch),
      });
      applyEpisodeApiResponse(res);
    });
  });
}

function closeSeriesTrackerModal() {
  document.getElementById("modal-series").classList.add("hidden");
  if (state.activeSeriesModal && state.activeSeriesModal.dirty) {
    const modalState = state.activeSeriesModal;
    modalState.dirty = false;
    const watchedCnt = (modalState.episodes || []).filter((e) => e.watched).length;
    const totalCnt = (modalState.episodes || []).length;

    if (modalState.searchItemMeta) {
      if (watchedCnt > 0 && watchedCnt < totalCnt) {
        modalState.searchItemMeta.in_library_status = "watching";
        modalState.searchItemMeta.watched_episodes_count = watchedCnt;
        showToast(`▶️ "${modalState.title_it}" salvata in Stai Seguendo (${watchedCnt}/${totalCnt} episodi visti)!`);
      } else if (watchedCnt >= totalCnt && totalCnt > 0) {
        modalState.searchItemMeta.in_library_status = "watched";
        modalState.searchItemMeta.watched_episodes_count = watchedCnt;
        showToast(`✅ "${modalState.title_it}" salvata in Già Visti (tutti gli episodi spuntati)!`);
      } else if (watchedCnt === 0) {
        modalState.searchItemMeta.watched_episodes_count = 0;
        if (modalState.createdFromSearch) {
          modalState.searchItemMeta.in_library_status = null;
          modalState.searchItemMeta.in_library_id = null;
        } else {
          modalState.searchItemMeta.in_library_status = "wishlist";
        }
      }
      const searchContainer = document.getElementById("search-results-container");
      if (searchContainer && state.searchResults && state.searchResults.length > 0) {
        renderSearchResultCards(state.searchResults, searchContainer, false);
      }
    }

    loadLibrary();
    loadMatches(false);
  }
}

// ============================================================================
// TAB 4: ESPLORA PALINSESTI 7 GIORNI (TUTTI I FILM E LE SERIE SUI 70 CANALI)
// ============================================================================
async function loadExploreEpg() {
  const container = document.getElementById("explore-results-container");
  container.innerHTML = `<div class="loading-state">Caricamento film e serie TV in onda sui canali del DTT 1–70...</div>`;

  const params = new URLSearchParams({
    start_date: state.startDate,
    media_type: state.exploreMediaType,
    day: state.exploreDay,
    time_slot: state.exploreTimeSlot,
    lcn: state.exploreChannel,
    q: state.exploreQuery,
  });

  const data = await apiGet(`/api/explore_epg?${params.toString()}`);
  const events = data.events || [];
  state.exploreResults = events;

  if (events.length === 0) {
    container.innerHTML = `<div class="empty-box">Nessun programma trovato con questi filtri.</div>`;
    return;
  }

  container.innerHTML = events
    .map((ev, idx) => {
      const isMovie = ev.media_type === "movie";
      const inWish = ev.in_library_status === "wishlist";
      const inWatched = ev.in_library_status === "watched";
      const posterHtml = ev.poster
        ? `<img src="${escapeHtml(ev.poster)}" alt="${escapeHtml(ev.title)}" class="tv-poster" loading="lazy" onerror="this.outerHTML='<div class=\\'tv-poster\\'>${isMovie ? "🎬" : "📺"}</div>'" />`
        : `<div class="tv-poster">${isMovie ? "🎬" : "📺"}</div>`;

      return `
        <article class="tv-card">
          ${posterHtml}
          <div class="tv-body">
            <div class="tv-meta-top">
              <span class="lcn-badge" style="background:${ev.channel_color || "#334155"}">
                CH ${ev.lcn} • ${escapeHtml(ev.channel_name)}
              </span>
              <span class="time-badge">
                📅 ${formatItalianDate(ev.date)} • 🕒 ${ev.start_time}
              </span>
              <span class="list-status-pill ${isMovie ? "wishlist" : "watched"}">
                ${isMovie ? "🎬 Film" : "📺 Serie TV"}
              </span>
            </div>
            <h3 class="tv-title">${escapeHtml(ev.title)}</h3>
            ${ev.season || ev.episode || ev.episode_title
          ? `<div class="tv-ep-line">${ev.season ? "S" + ev.season : ""}${ev.episode ? "E" + ev.episode : ""} ${escapeHtml(ev.episode_title || "")}</div>`
          : ""
        }
            <p class="tv-desc">${escapeHtml(ev.description || "")}</p>
            <div class="tv-actions">
              <button
                type="button"
                class="${inWish ? "btn-action active-watched" : "btn-primary btn-sm"} btn-quick-add-epg"
                data-idx="${idx}"
                data-status="wishlist"
              >
                ${inWish ? "🎯 In Da Vedere (Rimuovi ✕)" : "🎯 + Da Vedere (Wishlist)"}
              </button>
              <button
                type="button"
                class="btn-action ${inWatched ? "active-watched" : ""} btn-quick-add-epg"
                data-idx="${idx}"
                data-status="watched"
              >
                ${inWatched ? "✅ In Già Visti (Rimuovi ✕)" : "✅ + Già Visto"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll(".btn-quick-add-epg").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.idx);
      const status = btn.dataset.status;
      const ev = state.exploreResults[idx];
      if (!ev) return;
      const tempItem = {
        title_it: ev.title,
        title_original: ev.title,
        media_type: ev.media_type,
        poster: ev.poster,
        genre: ev.genre,
        description: ev.description,
        in_library_status: ev.in_library_status,
        in_library_id: ev.in_library_id,
      };
      await addCatalogItemToLibrary(tempItem, status, btn);
      ev.in_library_status = tempItem.in_library_status;
      ev.in_library_id = tempItem.in_library_id;
      loadExploreEpg();
    });
  });
}

// ============================================================================
// SECURITY & ACCESS AUDIT LOG (DISCREET 🛡️ ICON - 7-DAY AUTO PURGE)
// ============================================================================
function detectDeviceName() {
  const ua = navigator.userAgent || "";
  let os = "Dispositivo Sconosciuto";
  let icon = "💻";

  if (/android/i.test(ua)) {
    os = "Telefono Android";
    icon = "📱";
  } else if (/iphone/i.test(ua)) {
    os = "Apple iPhone";
    icon = "📱";
  } else if (/ipad/i.test(ua)) {
    os = "Apple iPad";
    icon = "📱";
  } else if (/windows/i.test(ua)) {
    os = "PC Windows";
    icon = "💻";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "Mac OS";
    icon = "💻";
  } else if (/linux/i.test(ua)) {
    os = "PC Linux";
    icon = "💻";
  }

  let browser = "Browser";
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";

  return { label: `${os} (${browser})`, icon };
}

function logCurrentAccess() {
  try {
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const raw = localStorage.getItem("nextontv_access_logs");
    let logs = raw ? JSON.parse(raw) : [];

    // Auto-purge logs older than 7 days
    logs = logs.filter((entry) => now - (entry.timestamp || 0) < SEVEN_DAYS_MS);

    const devInfo = detectDeviceName();
    const currentHost = window.location.hostname || "locale";
    const originLabel = window.location.hostname.includes("github.io")
      ? "GitHub Pages (Web)"
      : currentHost.includes("192.168") || currentHost === "localhost"
        ? "Rete Casa Wi-Fi"
        : "Connessione Dati 4G/5G";

    // Deduplicate rapid reloads from the same device within 10 minutes
    const last = logs[0];
    if (last && last.device === devInfo.label && now - last.timestamp < 10 * 60 * 1000) {
      last.last_seen = now;
    } else {
      logs.unshift({
        id: `${now}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
        last_seen: now,
        device: devInfo.label,
        icon: devInfo.icon,
        origin: originLabel,
        url: window.location.href,
      });
    }

    // Keep max 50 entries
    if (logs.length > 50) logs = logs.slice(0, 50);
    localStorage.setItem("nextontv_access_logs", JSON.stringify(logs));
  } catch (e) { }
}

function openAccessLogModal() {
  const modal = document.getElementById("modal-access-log");
  if (!modal) return;
  modal.classList.remove("hidden");
  renderAccessLogs();
}

function renderAccessLogs() {
  const container = document.getElementById("access-log-list-body");
  if (!container) return;

  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const raw = localStorage.getItem("nextontv_access_logs");
  let logs = raw ? JSON.parse(raw) : [];

  // Filter out expired (> 7 days)
  logs = logs.filter((entry) => now - (entry.timestamp || 0) < SEVEN_DAYS_MS);
  localStorage.setItem("nextontv_access_logs", JSON.stringify(logs));

  if (logs.length === 0) {
    container.innerHTML = `
      <div class="empty-box" style="padding:18px;">
        Nessun accesso registrato negli ultimi 7 giorni.
      </div>
    `;
    return;
  }

  const formatLogDate = (ts) => {
    try {
      return new Intl.DateTimeFormat("it-IT", {
        timeZone: "Europe/Rome",
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(ts));
    } catch (e) {
      return new Date(ts).toLocaleString("it-IT");
    }
  };

  const getDaysLeft = (ts) => {
    const elapsed = now - ts;
    const remaining = Math.max(0, SEVEN_DAYS_MS - elapsed);
    const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    return days <= 1 ? "Scade oggi" : `Scade tra ${days} giorni`;
  };

  container.innerHTML = logs
    .map((l, idx) => {
      const isCurrentSession = idx === 0;
      return `
        <div class="tv-card" style="padding:11px 13px;align-items:center;">
          <div style="font-size:1.6rem;padding:0 6px;">${l.icon || "📱"}</div>
          <div class="tv-body">
            <div class="tv-meta-top">
              <span class="lcn-badge" style="background:#3b82f6;">${escapeHtml(l.origin || "Accesso Web")}</span>
              <span class="time-badge">🕒 ${formatLogDate(l.timestamp)}</span>
              ${isCurrentSession ? `<span class="list-status-pill watched">🟢 Sessione Attuale</span>` : ""}
            </div>
            <h4 class="tv-title" style="font-size:0.88rem;margin:2px 0;">${escapeHtml(l.device || "Dispositivo")}</h4>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;color:var(--text-muted);margin-top:4px;">
              <span>Registro locale protetto</span>
              <span style="color:#fcd34d;">⏳ ${getDaysLeft(l.timestamp)}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function clearAllAccessLogs() {
  if (confirm("Vuoi cancellare tutti gli accessi registrati finora?")) {
    localStorage.removeItem("nextontv_access_logs");
    renderAccessLogs();
    showToast("🗑️ Registro accessi svuotato con successo!");
  }
}
function requestNotificationPermissionAndSchedule(rem) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
  if (Notification.permission === "granted") {
    try {
      new Notification(`🔔 Promemoria TV salvato: ${rem.title}`, {
        body: `Andrà in onda ${formatItalianDate(rem.date)} alle ${rem.start_time} su Canale ${rem.lcn} (${rem.channel_name})`,
        icon: "./icon.svg",
      });
    } catch (e) { }
  }
}

async function openRemindersModal() {
  const modal = document.getElementById("modal-reminders");
  const listEl = document.getElementById("reminders-list-body");
  modal.classList.remove("hidden");

  const data = await apiGet("/api/reminders");
  state.reminders = data.reminders || [];
  document.getElementById("reminders-count-badge").textContent = state.reminders.length;

  if (state.reminders.length === 0) {
    listEl.innerHTML = `<div class="empty-box">Non hai ancora impostato promemoria. Tocca "🔔 Avvisami" su qualsiasi film o serie in onda!</div>`;
    return;
  }

  listEl.innerHTML = state.reminders
    .map(
      (r) => `
      <div class="tv-card">
        <div class="tv-body">
          <div class="tv-meta-top">
            <span class="lcn-badge" style="background:#f59e0b;color:#000;">CH ${r.lcn} • ${escapeHtml(r.channel_name)}</span>
            <span class="time-badge">📅 ${formatItalianDate(r.date)} • 🕒 ${r.start_time}</span>
          </div>
          <h4 class="tv-title">${escapeHtml(r.title)} ${r.episode_info ? `(${escapeHtml(r.episode_info)})` : ""}</h4>
          <div class="tv-actions" style="margin-top:8px;">
            <a href="${buildGoogleCalendarUrl(r)}" target="_blank" class="btn-action">📅 Aggiungi a Google Calendar</a>
            <button type="button" class="btn-action btn-remove-rem" data-id="${escapeHtml(r.event_id)}" style="color:#f87171;">🗑️ Rimuovi</button>
          </div>
        </div>
      </div>
    `
    )
    .join("");

  listEl.querySelectorAll(".btn-remove-rem").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await apiPost("/api/reminders/toggle", { event_id: btn.dataset.id });
      openRemindersModal();
      loadMatches(false);
    });
  });
}

function renderAndroidQrCode() {
  const qrImg = document.getElementById("android-qr-img");
  const targetUrl = state.mobileUrl || window.location.origin;
  if (qrImg && targetUrl) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(targetUrl)}`;
  }
}

async function openSyncAndAndroidModal() {
  const stRes = await apiGet("/api/status");
  if (stRes.sync_code) {
    state.syncCode = stRes.sync_code;
    localStorage.setItem("nextontv_sync_code", state.syncCode);
  }
  if (stRes.mobile_url) state.mobileUrl = stRes.mobile_url;

  const syncInput = document.getElementById("input-sync-code");
  if (syncInput) syncInput.value = state.syncCode;

  const lanEl = document.getElementById("android-lan-url");
  if (lanEl) {
    lanEl.textContent = state.mobileUrl;
    lanEl.href = state.mobileUrl;
  }

  renderAndroidQrCode();
  document.getElementById("modal-android").classList.remove("hidden");
}

// ============================================================================
// NAVIGATION & UI EVENT LISTENERS
// ============================================================================
function setupNavigationAndEvents() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.dataset.tab;
      document.getElementById(targetId).classList.add("active");
      if (targetId === "tab-explore") {
        loadExploreEpg();
      } else if (targetId === "tab-library") {
        loadLibrary();
      } else if (targetId === "tab-matches") {
        loadMatches(false);
      }
    });
  });

  document.querySelectorAll("#match-category-grid .cat-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll("#match-category-grid .cat-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      state.matchFilterMode = card.dataset.mode;
      loadMatches(false);
    });
  });

  document.getElementById("match-timeslot").addEventListener("change", (e) => {
    state.matchTimeSlot = e.target.value;
    loadMatches(false);
  });
  document.getElementById("match-channel").addEventListener("change", (e) => {
    state.matchChannel = e.target.value;
    loadMatches(false);
  });
  document.getElementById("match-only-unwatched").addEventListener("change", (e) => {
    state.matchOnlyUnwatched = e.target.checked;
    loadMatches(false);
  });

  document.getElementById("btn-refresh-epg").addEventListener("click", () => {
    loadMatches(true);
    loadLibrary();
  });

  // Tab 2 Library Filters
  document.querySelectorAll("#lib-status-tabs .seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#lib-status-tabs .seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.libStatus = btn.dataset.status;
      renderLibrary();
    });
  });

  document.querySelectorAll("#lib-type-pills .mini-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#lib-type-pills .mini-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.libType = btn.dataset.type;
      renderLibrary();
    });
  });

  document.getElementById("lib-filter-input").addEventListener("input", (e) => {
    state.libQuery = e.target.value;
    renderLibrary();
  });

  const libSortSelect = document.getElementById("lib-sort-select");
  if (libSortSelect) {
    libSortSelect.addEventListener("change", (e) => {
      state.libSort = e.target.value || "az";
      renderLibrary();
    });
  }

  const libViewMode = document.getElementById("lib-view-mode");
  if (libViewMode) {
    libViewMode.addEventListener("change", (e) => {
      state.libViewMode = e.target.value || "cards";
      renderLibrary();
    });
  }

  // Tab 3 Search (ONLY on form submit / Cerca button click or Enter key!)
  const mainSearchInput = document.getElementById("catalog-search-input");
  document.getElementById("catalog-search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = mainSearchInput.value.trim();
    if (q) executeCatalogSearch(q);
  });

  document.querySelectorAll(".chip-suggest").forEach((chip) => {
    chip.addEventListener("click", () => {
      const q = chip.dataset.q;
      mainSearchInput.value = q;
      executeCatalogSearch(q);
    });
  });

  // Modal Search (ONLY on Cerca button click or Enter key)
  const modalSearchInput = document.getElementById("modal-live-search-input");
  if (modalSearchInput) {
    modalSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        executeModalLiveSearch(modalSearchInput.value.trim());
      }
    });
  }

  const btnModalSearch = document.getElementById("btn-modal-live-search");
  if (btnModalSearch && modalSearchInput) {
    btnModalSearch.addEventListener("click", () => {
      executeModalLiveSearch(modalSearchInput.value.trim());
    });
  }

  // Access Log Modal Listeners (🛡️)
  const btnOpenAccessLog = document.getElementById("btn-open-access-log");
  if (btnOpenAccessLog) {
    btnOpenAccessLog.addEventListener("click", openAccessLogModal);
  }
  const btnCloseAccessLog = document.getElementById("close-modal-access-log");
  if (btnCloseAccessLog) {
    btnCloseAccessLog.addEventListener("click", () => {
      document.getElementById("modal-access-log").classList.add("hidden");
    });
  }
  const modalAccessLog = document.getElementById("modal-access-log");
  if (modalAccessLog) {
    modalAccessLog.addEventListener("click", (e) => {
      if (e.target.id === "modal-access-log") {
        modalAccessLog.classList.add("hidden");
      }
    });
  }
  const btnClearAccess = document.getElementById("btn-clear-access-logs");
  if (btnClearAccess) {
    btnClearAccess.addEventListener("click", clearAllAccessLogs);
  }

  // Modals Close & Open
  document.getElementById("close-modal-series").addEventListener("click", closeSeriesTrackerModal);
  document.getElementById("modal-series").addEventListener("click", (e) => {
    if (e.target.id === "modal-series") {
      closeSeriesTrackerModal();
    }
  });

  const btnOpenCustom = document.getElementById("btn-open-custom-add");
  if (btnOpenCustom) {
    btnOpenCustom.addEventListener("click", () => {
      document.getElementById("modal-custom-add").classList.remove("hidden");
      setTimeout(() => modalSearchInput.focus(), 100);
    });
  }
  document.getElementById("close-modal-custom").addEventListener("click", () => {
    document.getElementById("modal-custom-add").classList.add("hidden");
  });

  document.getElementById("form-custom-add").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title_it = document.getElementById("custom-title-it").value.trim();
    const title_original = document.getElementById("custom-title-orig").value.trim() || title_it;
    const media_type = document.getElementById("custom-media-type").value;
    const status = document.getElementById("custom-status").value;

    await apiPost("/api/library", { title_it, title_original, media_type, status });
    document.getElementById("form-custom-add").reset();
    document.getElementById("modal-custom-add").classList.add("hidden");
    showToast(`✨ "${title_it}" aggiunto alle tue liste!`);
    await loadLibrary();
    loadMatches(false);
  });

  const btnOpenRem = document.getElementById("btn-open-reminders");
  if (btnOpenRem) {
    btnOpenRem.addEventListener("click", openRemindersModal);
  }
  const btnCloseRem = document.getElementById("close-modal-reminders");
  if (btnCloseRem) {
    btnCloseRem.addEventListener("click", () => {
      document.getElementById("modal-reminders").classList.add("hidden");
    });
  }

  document.getElementById("btn-enable-notifications").addEventListener("click", async () => {
    if (!("Notification" in window)) {
      showToast("Questo browser non supporta le notifiche desktop/mobile.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      showToast("🔔 Notifiche dispositivo attivate con successo!");
    } else {
      showToast("Permesso notifiche non concesso.");
    }
  });

  document.getElementById("btn-open-android").addEventListener("click", openSyncAndAndroidModal);
  document.getElementById("close-modal-android").addEventListener("click", () => {
    document.getElementById("modal-android").classList.add("hidden");
  });

  const btnQrPublic = document.getElementById("btn-qr-public");
  const btnQrWifi = document.getElementById("btn-qr-wifi");
  if (btnQrPublic) {
    btnQrPublic.addEventListener("click", () => renderAndroidQrCode("public"));
  }
  if (btnQrWifi) {
    btnQrWifi.addEventListener("click", () => renderAndroidQrCode("wifi"));
  }

  const btnCopyPub = document.getElementById("btn-copy-public-url");
  if (btnCopyPub) {
    btnCopyPub.addEventListener("click", async () => {
      const url = state.publicUrl || state.mobileUrl;
      if (navigator.clipboard && url) {
        await navigator.clipboard.writeText(url);
        showToast("📋 Link 4G/5G copiato negli appunti!");
      }
    });
  }

  const btnCopyLan = document.getElementById("btn-copy-lan-url");
  if (btnCopyLan) {
    btnCopyLan.addEventListener("click", async () => {
      const url = state.mobileUrl;
      if (navigator.clipboard && url) {
        await navigator.clipboard.writeText(url);
        showToast("📋 Link Wi-Fi Casa copiato negli appunti!");
      }
    });
  }

  document.getElementById("btn-sync-now").addEventListener("click", async () => {
    const newCode = document.getElementById("input-sync-code").value.trim().toLowerCase();
    if (newCode) {
      state.syncCode = newCode;
      localStorage.setItem("nextontv_sync_code", state.syncCode);
    }
    const msgEl = document.getElementById("sync-status-msg");
    msgEl.textContent = "⏳ Sincronizzazione Cloud PC ↔ Telefono in corso...";

    if (!state.isCloudMode) {
      const res = await apiPost("/api/sync", { sync_code: state.syncCode });
      msgEl.textContent = `✅ Sincronizzato col Cloud! (${res.library_count || 0} titoli in lista • Codice: ${res.sync_code})`;
    } else {
      const snap = await pullCloudSnapshotClient(state.syncCode);
      if (snap) {
        msgEl.textContent = `✅ Dati scaricati dal Cloud in 4G/5G! (${(snap.library || []).length} titoli in lista)`;
      } else {
        await pushCloudSnapshotClient(state.syncCode, getLocalSnapshot());
        msgEl.textContent = `✅ Dati inviati al Cloud in 4G/5G! (Codice: ${state.syncCode})`;
      }
    }
    await loadLibrary();
    await loadMatches(false);
    showToast("☁️ Sincronizzazione PC ↔ Telefono completata!");
  });
}

document.addEventListener("DOMContentLoaded", initApp);
