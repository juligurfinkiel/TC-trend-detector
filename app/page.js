"use client";

import { useState } from "react";

const API_URL = "/api/claude";

function extractJSON(text) {
  const clean = text.replace(/```/g, "").replace(/^json\s*/i, "").trim();
  const s1 = clean.indexOf("[");
  const s2 = clean.indexOf("{");
  if (s1 !== -1 && (s2 === -1 || s1 <= s2)) {
    const e = clean.lastIndexOf("]");
    if (e !== -1) return JSON.parse(clean.slice(s1, e + 1));
  }
  if (s2 !== -1) {
    const e = clean.lastIndexOf("}");
    if (e !== -1) return JSON.parse(clean.slice(s2, e + 1));
  }
  throw new Error("JSON no valido");
}

function getTexts(data) {
  return (data.content || []).filter((b) => b.type === "text" && b.text).map((b) => b.text).join("\n");
}

function buildScanPrompt(country, cats, lang) {
  return [
    "Search the web for the most recent TikTok trends popular in " + country + " in: " + cats + ".",
    "I need REPLICABLE FORMATS: video styles, games, challenges, joke structures.",
    "For each trend, find a real TikTok video URL as example.",
    "Respond with ONLY a JSON array. Each element needs: name, category (memes|audios|challenges), description (in " + lang + "), example (in " + lang + "), example_video_url, audio (or null), virality (1-10), adaptability (1-10), turismocity_idea (in " + lang + "), hashtags array, source_url (or null).",
    "Return 4-6 trends. ONLY the JSON array."
  ].join("\n\n");
}

function buildScriptPrompt(trend, lang) {
  return [
    "Write a TikTok script for this trend:",
    "Name: " + trend.name,
    "Description: " + trend.description,
    "Idea: " + trend.turismocity_idea,
    "Audio: " + (trend.audio || "none"),
    "Return ONLY a JSON object with: hook, development, punchline, production_notes, caption, hashtags, duration_seconds, difficulty.",
    "Write in " + lang + ". ONLY the JSON."
  ].join("\n");
}

export default function Page() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [cats, setCats] = useState(["memes", "audios", "challenges"]);
  const [country, setCountry] = useState("ar");
  const [sLoading, setSLoading] = useState(null);
  const [scripts, setScripts] = useState({});

  const catList = [
    { id: "memes", label: "Memes / Chistes", color: "#FF6B6B" },
    { id: "audios", label: "Audios Virales", color: "#845EF7" },
    { id: "challenges", label: "Challenges", color: "#FF922B" },
  ];
  const countries = [
    { id: "ar", label: "Argentina" },
    { id: "cl", label: "Chile" },
    { id: "co", label: "Colombia" },
    { id: "br", label: "Brasil" },
  ];

  const cInfo = countries.find((c) => c.id === country) || countries[0];
  const catLabels = cats.map((id) => (catList.find((c) => c.id === id) || {}).label || "").join(", ");

  const callAPI = (payload) =>
    fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(typeof d.error === "string" ? d.error : d.error.message || "Error"); return d; });

  const scan = () => {
    if (cats.length === 0) return;
    setLoading(true); setError(null); setTrends([]); setExpanded(null); setScripts({});
    const lang = country === "br" ? "Portuguese" : "Spanish";
    callAPI({
      model: "claude-sonnet-4-20250514", max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: "You are a TikTok trend researcher. Search the web then respond with ONLY a JSON array. No markdown. Write in " + lang + ".",
      messages: [{ role: "user", content: buildScanPrompt(cInfo.label, catLabels, lang) }],
    })
    .then((d) => { const t = getTexts(d); if (!t) throw new Error("Sin resultados."); const p = extractJSON(t); if (!Array.isArray(p) || !p.length) throw new Error("Sin tendencias."); setTrends(p); })
    .catch((e) => setError(e.message))
    .finally(() => setLoading(false));
  };

  const genScript = (trend, idx) => {
    setSLoading(idx);
    const lang = country === "br" ? "Brazilian Portuguese" : "Argentine Spanish";
    callAPI({
      model: "claude-sonnet-4-20250514", max_tokens: 2000,
      system: "TikTok scriptwriter for Turismocity. Respond ONLY with JSON. Write in " + lang + ".",
      messages: [{ role: "user", content: buildScriptPrompt(trend, lang) }],
    })
    .then((d) => { const s = extractJSON(getTexts(d)); setScripts((p) => ({ ...p, [idx]: s })); })
    .catch(() => { setScripts((p) => ({ ...p, [idx]: { error: true } })); })
    .finally(() => setSLoading(null));
  };

  const getCat = (id) => catList.find((c) => c.id === id) || catList[0];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)", padding: "32px 24px 28px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, background: "linear-gradient(90deg, #FF6B6B, #845EF7, #FF922B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Trend Detector</h1>
          <p style={{ margin: "6px 0 0", color: "#8899aa", fontSize: 14 }}>Detecta tendencias de TikTok en tiempo real - Turismocity</p>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        <p style={{ fontSize: 13, color: "#778899", marginBottom: 10, fontWeight: 500 }}>PAIS</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {countries.map((c) => (
            <button key={c.id} onClick={() => setCountry(c.id)} style={{ padding: "10px 16px", borderRadius: 12, border: "2px solid " + (country === c.id ? "#339AF0" : "#2a2a3a"), background: country === c.id ? "#339AF018" : "#14141e", color: country === c.id ? "#339AF0" : "#667", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{c.label}</button>
          ))}
        </div>
        <p style={{ fontSize: 13, color: "#778899", marginBottom: 10, fontWeight: 500 }}>CATEGORIAS</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {catList.map((c) => { const on = cats.includes(c.id); return (
            <button key={c.id} onClick={() => setCats(on ? cats.filter((x) => x !== c.id) : [...cats, c.id])} style={{ padding: "10px 18px", borderRadius: 12, border: "2px solid " + (on ? c.color : "#2a2a3a"), background: on ? c.color + "18" : "#14141e", color: on ? c.color : "#667", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{c.label}</button>
          ); })}
        </div>
        <button onClick={scan} disabled={loading || !cats.length} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: loading ? "#2a2a3a" : "linear-gradient(135deg, #FF6B6B, #845EF7, #FF922B)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: loading ? "default" : "pointer", marginBottom: 28, opacity: !cats.length ? 0.4 : 1 }}>
          {loading ? "Escaneando en " + cInfo.label + "..." : "Escanear Tendencias en " + cInfo.label}
        </button>
        {error && <div style={{ padding: 16, background: "#2a1520", borderRadius: 12, marginBottom: 20, color: "#ff8888", fontSize: 14 }}>{error}</div>}
        {trends.map((t, i) => { const c = getCat(t.category); const open = expanded === i; const sc = scripts[i]; return (
          <div key={i} style={{ background: "#14141e", borderRadius: 16, border: "1px solid " + (open ? c.color + "50" : "#1e1e2e"), overflow: "hidden", marginBottom: 16 }}>
            <div onClick={() => setExpanded(open ? null : i)} style={{ padding: "18px 20px", cursor: "pointer" }}>
              <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: c.color + "20", color: c.color, fontWeight: 600 }}>{c.label}</span>
              <h3 style={{ margin: "8px 0", fontSize: 17, fontWeight: 700, color: "#eee" }}>{t.name}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "#99a", lineHeight: 1.5 }}>{t.description}</p>
              <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                {[{ l: "Viralidad", v: t.virality, cl: "#FF6B6B" }, { l: "Adaptabilidad", v: t.adaptability, cl: "#51CF66" }].map((m) => (
                  <div key={m.l} style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#667", fontWeight: 600 }}>{m.l}</span>
                      <span style={{ fontSize: 11, color: m.cl, fontWeight: 700 }}>{(m.v || 0) + "/10"}</span>
                    </div>
                    <div style={{ height: 5, background: "#1e1e2e", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ width: ((m.v || 0) * 10) + "%", height: "100%", background: m.cl, borderRadius: 10 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {open && (
              <div style={{ padding: "0 20px 20px", borderTop: "1px solid #1e1e2e" }}>
                {t.example_video_url && (
                  <a href={t.example_video_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 16, padding: "12px 16px", background: "#1a1a2a", borderRadius: 10, border: "1px solid #333", textDecoration: "none", color: "#eee", fontSize: 13, fontWeight: 700 }}>Ver video de ejemplo en TikTok</a>
                )}
                <div style={{ marginTop: 12, padding: 14, background: "#1a1a2a", borderRadius: 10, borderLeft: "3px solid " + c.color }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#667", fontWeight: 600, marginBottom: 6 }}>EJEMPLO</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#bbc", lineHeight: 1.5 }}>{t.example}</p>
                </div>
                <div style={{ marginTop: 12, padding: 14, background: "#0f2a1a", borderRadius: 10, borderLeft: "3px solid #51CF66" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#51CF66", fontWeight: 600, marginBottom: 6 }}>IDEA TURISMOCITY</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#bbc", lineHeight: 1.5 }}>{t.turismocity_idea}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); genScript(t, i); }} disabled={sLoading === i || !!sc} style={{ width: "100%", marginTop: 16, padding: 12, borderRadius: 10, border: "2px solid #845EF7", background: sc ? "#845EF715" : "transparent", color: "#845EF7", fontSize: 14, fontWeight: 700, cursor: sc ? "default" : "pointer" }}>
                  {sLoading === i ? "Escribiendo guion..." : sc && !sc.error ? "Guion generado" : "Generar Guion"}
                </button>
                {sc && !sc.error && (
                  <div style={{ marginTop: 16, background: "#1a1a2a", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", background: "#845EF720" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#845EF7" }}>GUION LISTO</span>
                    </div>
                    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                      {[{ l: "HOOK", t: sc.hook, b: "#FF6B6B" }, { l: "DESARROLLO", t: sc.development, b: "#845EF7" }, { l: "REMATE", t: sc.punchline, b: "#FF922B" }, { l: "PRODUCCION", t: sc.production_notes, b: "#339AF0" }].map((s, j) => (
                        <div key={j} style={{ padding: 12, background: s.b + "15", borderRadius: 8, borderLeft: "3px solid " + s.b }}>
                          <p style={{ margin: 0, fontSize: 11, color: s.b, fontWeight: 700, marginBottom: 5 }}>{s.l}</p>
                          <p style={{ margin: 0, fontSize: 14, color: "#ccd", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.t}</p>
                        </div>
                      ))}
                      <div style={{ padding: 12, background: "#0f2a1a", borderRadius: 8, borderLeft: "3px solid #51CF66" }}>
                        <p style={{ margin: 0, fontSize: 11, color: "#51CF66", fontWeight: 700, marginBottom: 5 }}>CAPTION</p>
                        <p style={{ margin: 0, fontSize: 14, color: "#ccd", lineHeight: 1.5 }}>{sc.caption}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ); })}
        {!loading && !trends.length && !error && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#667" }}>Selecciona pais, categorias y escanea</p>
          </div>
        )}
      </div>
      <style>{"* { box-sizing: border-box; } button:hover:not(:disabled) { opacity: 0.9; }"}</style>
    </div>
  );
}
