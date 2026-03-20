"use client";
import { useState } from "react";

const CATEGORIES = [
  { id: "memes", label: "Memes / Chistes", emoji: "\u{1F602}", color: "#FF6B6B" },
  { id: "audios", label: "Audios Virales", emoji: "\u{1F3B5}", color: "#845EF7" },
  { id: "challenges", label: "Challenges", emoji: "\u{1F525}", color: "#FF922B" },
];

const COUNTRIES = [
  { id: "ar", label: "Argentina", emoji: "\u{1F1E6}\u{1F1F7}" },
  { id: "cl", label: "Chile", emoji: "\u{1F1E8}\u{1F1F1}" },
  { id: "co", label: "Colombia", emoji: "\u{1F1E8}\u{1F1F4}" },
  { id: "br", label: "Brasil", emoji: "\u{1F1E7}\u{1F1F7}" },
];

const API_URL = "/api/claude";

function extractJSON(text) {
  let clean = text.replace(/```json\s?/g, "").replace(/```/g, "").trim();
  const bracketStart = clean.indexOf("[");
  const braceStart = clean.indexOf("{");
  if (bracketStart !== -1 && (braceStart === -1 || bracketStart <= braceStart)) {
    const end = clean.lastIndexOf("]");
    if (end !== -1) return JSON.parse(clean.slice(bracketStart, end + 1));
  }
  if (braceStart !== -1) {
    const end = clean.lastIndexOf("}");
    if (end !== -1) return JSON.parse(clean.slice(braceStart, end + 1));
  }
  throw new Error("No se encontró JSON válido en la respuesta");
}

function getTextFromResponse(data) {
  return (data.content || []).filter(b => b.type === "text" && b.text).map(b => b.text).join("\n");
}

export default function Home() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedTrend, setExpandedTrend] = useState(null);
  const [selectedCats, setSelectedCats] = useState(["memes", "audios", "challenges"]);
  const [selectedCountry, setSelectedCountry] = useState("ar");
  const [scriptLoading, setScriptLoading] = useState(null);
  const [scripts, setScripts] = useState({});

  const toggleCat = (id) => {
    setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const catLabels = selectedCats.map(id => CATEGORIES.find(c => c.id === id)?.label).join(", ");
  const countryInfo = COUNTRIES.find(c => c.id === selectedCountry);

  const callAPI = async (payload) => {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message || 'API Error');
    return data;
  };

  const scanTrends = async () => {
    if (selectedCats.length === 0) return;
    setLoading(true);
    setError(null);
    setTrends([]);
    setExpandedTrend(null);
    setScripts({});
    const countryName = countryInfo?.label || "Argentina";
    const lang = selectedCountry === "br" ? "Portuguese" : "Spanish";
    try {
      const data = await callAPI({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: "You are a TikTok trend researcher. You MUST search the web for current TikTok trends, then respond with ONLY a raw JSON array. No preamble, no explanation, no markdown fences, no text before or after the JSON. Your entire response must be parseable as JSON. Write all descriptive content in " + lang + ".",
        messages: [{
          role: "user",
          content: "Search the web for the most recent TikTok trends (from this week or last few days) that are popular in " + countryName + " in these categories: " + catLabels + ".\n\nI need trends that are REPLICABLE FORMATS: a video style, a game, a challenge, a joke structure. NOT generic topics.\n\nVERY IMPORTANT: For each trend, you MUST find and include a real TikTok video URL as an example. Search for actual TikTok video links (tiktok.com/@user/video/...) that demonstrate the trend. If you cannot find an exact TikTok URL, provide a search URL like https://www.tiktok.com/search?q=TREND_NAME that helps find examples.\n\nAfter searching, respond with ONLY a JSON array. Each element:\n{\"name\":\"short name\",\"category\":\"memes|audios|challenges\",\"description\":\"detailed explanation in " + lang + ", 3-4 sentences\",\"example\":\"concrete example in " + lang + " of how creators use it\",\"example_video_url\":\"real TikTok video URL showing this trend\",\"audio\":\"audio name or null\",\"virality\":1-10,\"adaptability\":1-10,\"turismocity_idea\":\"specific creative idea in " + lang + " for Turismocity (Argentine flight/travel comparison platform) to adapt this trend\",\"hashtags\":[\"#tag1\"],\"source_url\":\"reference url or null\"}\n\nReturn 4-6 REAL current trends popular in " + countryName + ". Output ONLY the JSON array, nothing else."
        }],
      });
      const text = getTextFromResponse(data);
      if (!text) throw new Error("La búsqueda no devolvió resultados.");
      const parsed = extractJSON(text);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No se encontraron tendencias.");
      setTrends(parsed);
    } catch (err) {
      setError(err.message || "Error al escanear.");
    } finally {
      setLoading(false);
    }
  };

  const generateScript = async (trend, idx) => {
    setScriptLoading(idx);
    const lang = selectedCountry === "br" ? "Brazilian Portuguese" : "Argentine Spanish";
    try {
      const data = await callAPI({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: "You are a TikTok scriptwriter for Turismocity (Argentine travel platform). Respond with ONLY a raw JSON object. No text before or after. No markdown. Write all content in " + lang + ".",
        messages: [{
          role: "user",
          content: "Write a ready-to-film TikTok script based on this trend:\n\nTrend: " + trend.name + "\nDescription: " + trend.description + "\nAdaptation idea: " + trend.turismocity_idea + "\nAudio: " + (trend.audio || "Not specific") + "\n\nRespond ONLY with this JSON object:\n{\"hook\":\"first 2 seconds to grab attention\",\"development\":\"the trend mechanic adapted to Turismocity\",\"punchline\":\"punchline and CTA\",\"production_notes\":\"what appears on screen, text overlays, transitions\",\"caption\":\"suggested post caption\",\"hashtags\":[\"#tag1\"],\"duration_seconds\":number,\"difficulty\":\"fácil|media|difícil\"}\n\nWrite in fun " + lang + " tone. Video 15-30 seconds. ONLY the JSON."
        }],
      });
      const text = getTextFromResponse(data);
      const script = extractJSON(text);
      setScripts(prev => ({ ...prev, [idx]: script }));
    } catch (err) {
      setScripts(prev => ({ ...prev, [idx]: { error: true } }));
    } finally {
      setScriptLoading(null);
    }
  };

  const getCatInfo = (catId) => CATEGORIES.find(c => c.id === catId) || CATEGORIES[0];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", padding: "32px 24px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 28 }}>\u{1F4E1}</span>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, background: "linear-gradient(90deg, #FF6B6B, #845EF7, #FF922B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Trend Detector</h1>
          </div>
          <p style={{ margin: 0, color: "#8899aa", fontSize: 14 }}>Detectá tendencias de TikTok en tiempo real y obtené guiones listos para Turismocity</p>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "#778899", marginBottom: 10, fontWeight: 500 }}>PAÍS / REGIÓN</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COUNTRIES.map(c => {
              const active = selectedCountry === c.id;
              return (<button key={c.id} onClick={() => setSelectedCountry(c.id)} style={{ padding: "10px 16px", borderRadius: 12, border: "2px solid " + (active ? "#339AF0" : "#2a2a3a"), background: active ? "#339AF018" : "#14141e", color: active ? "#339AF0" : "#667", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 18 }}>{c.emoji}</span> {c.label}</button>);
            })}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "#778899", marginBottom: 10, fontWeight: 500 }}>CATEGORÍAS A ESCANEAR</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => {
              const active = selectedCats.includes(cat.id);
              return (<button key={cat.id} onClick={() => toggleCat(cat.id)} style={{ padding: "10px 18px", borderRadius: 12, border: "2px solid " + (active ? cat.color : "#2a2a3a"), background: active ? cat.color + "18" : "#14141e", color: active ? cat.color : "#667", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{cat.emoji} {cat.label}</button>);
            })}
          </div>
        </div>
        <button onClick={scanTrends} disabled={loading || selectedCats.length === 0} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: loading ? "#2a2a3a" : "linear-gradient(135deg, #FF6B6B, #845EF7, #FF922B)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: loading ? "default" : "pointer", marginBottom: 28, opacity: selectedCats.length === 0 ? 0.4 : 1 }}>
          {loading ? "Escaneando tendencias en " + (countryInfo?.label) + "... (~20s)" : "Escanear Tendencias en " + (countryInfo?.emoji) + " " + (countryInfo?.label)}
        </button>
        {error && <div style={{ padding: 16, background: "#2a1520", border: "1px solid #FF6B6B40", borderRadius: 12, marginBottom: 20, color: "#ff8888", fontSize: 14 }}>{error}</div>}
        {trends.length > 0 && (
          <div>
            <p style={{ fontSize: 13, color: "#778899", marginBottom: 16, fontWeight: 500 }}>{countryInfo?.emoji} {trends.length} TENDENCIAS EN {countryInfo?.label.toUpperCase()}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {trends.map((trend, idx) => {
                const cat = getCatInfo(trend.category);
                const isExp = expandedTrend === idx;
                const script = scripts[idx];
                return (
                  <div key={idx} style={{ background: "#14141e", borderRadius: 16, border: "1px solid " + (isExp ? cat.color + "50" : "#1e1e2e"), overflow: "hidden" }}>
                    <div onClick={() => setExpandedTrend(isExp ? null : idx)} style={{ padding: "18px 20px", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: cat.color + "20", color: cat.color, fontWeight: 600 }}>{cat.emoji} {cat.label}</span>
                            {trend.audio && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#845EF720", color: "#845EF7" }}>{trend.audio.length > 30 ? trend.audio.slice(0,30) + "..." : trend.audio}</span>}
                          </div>
                          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#eee" }}>{trend.name}</h3>
                        </div>
                        <span style={{ fontSize: 20, color: "#556", transform: isExp ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>▾</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: "#99a", lineHeight: 1.5 }}>{trend.description}</p>
                      <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                        {[{ label: "Viralidad", val: trend.virality, color: "#FF6B6B" }, { label: "Adaptabilidad", val: trend.adaptability, color: "#51CF66" }].map(m => (
                          <div key={m.label} style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: "#667", fontWeight: 600 }}>{m.label}</span>
                              <span style={{ fontSize: 11, color: m.color, fontWeight: 700 }}>{m.val}/10</span>
                            </div>
                            <div style={{ height: 5, background: "#1e1e2e", borderRadius: 10, overflow: "hidden" }}>
                              <div style={{ width: ((m.val || 0) * 10) + "%", height: "100%", background: m.color, borderRadius: 10 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {isExp && (
                      <div style={{ padding: "0 20px 20px", borderTop: "1px solid #1e1e2e" }}>
                        {trend.example_video_url && (
                          <a href={trend.example_video_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, padding: "12px 16px", background: "#1a1a2a", borderRadius: 10, border: "1px solid #333", textDecoration: "none" }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #25F4EE, #FE2C55)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18, color: "#fff" }}>▶</div>
                            <div><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#eee" }}>Ver video de ejemplo en TikTok</p><p style={{ margin: 0, fontSize: 11, color: "#667", marginTop: 2 }}>{trend.example_video_url.length > 50 ? trend.example_video_url.slice(0,50) + "..." : trend.example_video_url}</p></div>
                          </a>
                        )}
                        <div style={{ marginTop: 12, padding: 14, background: "#1a1a2a", borderRadius: 10, borderLeft: "3px solid " + cat.color }}>
                          <p style={{ margin: 0, fontSize: 12, color: "#667", fontWeight: 600, marginBottom: 6 }}>EJEMPLO DE REFERENCIA</p>
                          <p style={{ margin: 0, fontSize: 14, color: "#bbc", lineHeight: 1.5 }}>{trend.example}</p>
                        </div>
                        <div style={{ marginTop: 12, padding: 14, background: "#0f2a1a", borderRadius: 10, borderLeft: "3px solid #51CF66" }}>
                          <p style={{ margin: 0, fontSize: 12, color: "#51CF66", fontWeight: 600, marginBottom: 6 }}>IDEA PARA TURISMOCITY</p>
                          <p style={{ margin: 0, fontSize: 14, color: "#bbc", lineHeight: 1.5 }}>{trend.turismocity_idea}</p>
                        </div>
                        {trend.hashtags?.length > 0 && (
                          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {trend.hashtags.map((h, i) => <span key={i} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "#1e1e2e", color: "#889" }}>{h.startsWith("#") ? h : "#" + h}</span>)}
                          </div>
                        )}
                        <button onClick={e => { e.stopPropagation(); generateScript(trend, idx); }} disabled={scriptLoading === idx || !!script} style={{ width: "100%", marginTop: 16, padding: "12px", borderRadius: 10, border: "2px solid #845EF7", background: script ? "#845EF715" : "transparent", color: "#845EF7", fontSize: 14, fontWeight: 700, cursor: script ? "default" : "pointer" }}>
                          {scriptLoading === idx ? "Escribiendo guión..." : script && !script.error ? "Guión generado" : "Generar Guión para Grabar"}
                        </button>
                        {script && !script.error && (
                          <div style={{ marginTop: 16, background: "#1a1a2a", borderRadius: 12, overflow: "hidden" }}>
                            <div style={{ padding: "12px 16px", background: "#845EF720", borderBottom: "1px solid #845EF730", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: "#845EF7" }}>GUIÓN LISTO</span>
                              <span style={{ fontSize: 12, color: "#889", background: "#1e1e2e", padding: "3px 10px", borderRadius: 20 }}>{script.duration_seconds}s - {script.difficulty}</span>
                            </div>
                            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                              {[{ label: "HOOK (0-2s)", text: script.hook, bg: "#FF6B6B15", border: "#FF6B6B" }, { label: "DESARROLLO", text: script.development, bg: "#845EF715", border: "#845EF7" }, { label: "REMATE / CTA", text: script.punchline, bg: "#FF922B15", border: "#FF922B" }, { label: "NOTAS DE PRODUCCIÓN", text: script.production_notes, bg: "#339AF015", border: "#339AF0" }].map((s, i) => (
                                <div key={i} style={{ padding: 12, background: s.bg, borderRadius: 8, borderLeft: "3px solid " + s.border }}>
                                  <p style={{ margin: 0, fontSize: 11, color: s.border, fontWeight: 700, marginBottom: 5 }}>{s.label}</p>
                                  <p style={{ margin: 0, fontSize: 14, color: "#ccd", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.text}</p>
                                </div>
                              ))}
                              <div style={{ padding: 12, background: "#0f2a1a", borderRadius: 8, borderLeft: "3px solid #51CF66" }}>
                                <p style={{ margin: 0, fontSize: 11, color: "#51CF66", fontWeight: 700, marginBottom: 5 }}>CAPTION</p>
                                <p style={{ margin: 0, fontSize: 14, color: "#ccd", lineHeight: 1.5 }}>{script.caption}</p>
                                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>{script.hashtags?.map((h, j) => <span key={j} style={{ fontSize: 11, color: "#51CF66" }}>{h.startsWith("#") ? h : "#" + h}</span>)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {script?.error && <p style={{ marginTop: 12, color: "#ff8888", fontSize: 13 }}>Error al generar el guión. Intentá de nuevo.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!loading && trends.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#445" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>\u{1F4E1}</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#667" }}>Seleccioná país, categorías y escaneá</p>
            <p style={{ fontSize: 13, color: "#445" }}>La herramienta buscará tendencias actuales de TikTok en tiempo real</p>
          </div>
        )}
      </div>
      <style>{"@keyframes spin { to { transform: rotate(360deg) } } * { box-sizing: border-box; } button:hover:not(:disabled) { opacity: 0.9; }"}</style>
    </div>
  );
}
