import { useState, useRef, useCallback, useEffect } from "react";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are a Senior Product UX Analyst and Systems Flow Architect working on a fintech mobile product.

You will receive one or more UI screenshots — Figma screens, mockups, or wireframes.

NAMING CONVENTIONS — follow these exactly:
- Screens are labelled as descriptive nouns: "Login Issues Screen", "Verify Email Screen", "Forgot Password Screen"
- Clickable buttons and primary actions are prefixed: "CTA: Continue", "CTA: Forgot Password", "CTA: Resend"
- Tappable links are prefixed: "Link: Terms of Use", "Link: Privacy Policy"
- Inline actions on edges (not nodes) describe what the user does: "Enter email address", "Enter OTP", "Enter phone number"
- Error/conditional edge labels are written directly on arrows: "if wrong", "if correct", "if incorrect / invalid", "User Already Exists"

YOUR TASK:
1. Analyse every screen carefully.
2. Identify all:
   - Screen names (destination nodes)
   - CTAs (prefixed "CTA:")
   - Links (prefixed "Link:")
   - Input actions (edge labels)
   - Happy path transitions
   - Error states and retry loops (use edge label "if wrong" / "if incorrect / invalid")
   - Back navigation paths
   - Success terminal states
   - Branching decision points
3. Reconstruct the complete user journey.
4. Organise flows into named subgraphs by feature module.

MERMAID NODE SHAPE RULES — critical:
- ALL nodes (screens, CTAs, links) MUST use square bracket rectangle syntax: A[Label]
- NEVER use round brackets A(Label) — this creates pill/stadium shapes
- NEVER use double round brackets A((Label)) — this creates circles
- Decision gates ONLY use curly braces: A{Label?}
- Every single node in the chart must be a rectangle [ ] or a decision diamond { }
- No exceptions. CTAs, Links, Screens — all rectangles.

NODE EXAMPLES — follow exactly:
  OB1[App Install]
  OB2[CTA: Continue]
  OB3[Link: Terms of Use]
  OB4[Verify Email Screen]
  OB5{Is OTP Valid?}

MERMAID LAYOUT RULES:
- ALWAYS start with: flowchart LR
- Layout is strictly left-to-right horizontal
- Use subgraphs to group each feature module with a clear title
- Happy path runs left to right as the primary spine
- Error loops arc back using reverse arrows with edge labels
- Prefer annotated edges over diamonds for simple conditional transitions
- Node IDs must be unique across the entire chart (use prefixes per subgraph e.g. OB1, RP1, CE1)
- Keep node labels short and clean
- Do NOT use decision diamonds for things already expressed as edge labels

OUTPUT RULE:
Return ONLY raw Mermaid code. No explanation. No markdown fences. No commentary. No extra text. Start directly with: flowchart LR`;

// ---- Mermaid renderer ----
function MermaidChart({ code, zoom }) {
  const [error, setError] = useState(null);
  const [svg, setSvg] = useState(null);

  useEffect(() => {
    if (!code) return;
    setError(null);
    setSvg(null);

    const render = async () => {
      try {
        if (!window.mermaid) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        window.mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          flowchart: {
            curve: "linear",
            padding: 24,
            rankSpacing: 80,
            nodeSpacing: 40,
            useMaxWidth: false,
          },
          themeVariables: {
            primaryColor: "#ffffff",
            primaryTextColor: "#1e293b",
            primaryBorderColor: "#3d5af1",
            lineColor: "#3d5af1",
            secondaryColor: "#f1f5f9",
            tertiaryColor: "#e2e8f0",
            background: "#ffffff",
            mainBkg: "#ffffff",
            nodeBorder: "#3d5af1",
            clusterBkg: "#f8fafc",
            clusterBorder: "#cbd5e1",
            titleColor: "#64748b",
            edgeLabelBackground: "#f8fafc",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "13px",
          },
        });
        const id = "mermaid-" + Date.now();
        const { svg: rendered } = await window.mermaid.render(id, code);
        setSvg(rendered);
      } catch (e) {
        setError(e.message);
      }
    };

    render();
  }, [code]);

  if (error) return (
    <div style={{ color: "#dc2626", padding: "1.5rem", fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.6 }}>
      <strong>Render error:</strong><br />{error}
    </div>
  );

  if (!svg) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#94a3b8" }}>
      <span style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>rendering...</span>
    </div>
  );

  return (
    <div
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
        transition: "transform 0.2s ease",
        width: `${(1 / zoom) * 100}%`,
        minWidth: "max-content",
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function Thumb({ src, index, onRemove }) {
  return (
    <div style={S.thumb}>
      <img src={src} alt={`s${index}`} style={S.thumbImg} />
      <button onClick={onRemove} style={S.thumbX}>✕</button>
    </div>
  );
}

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    const doFallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch(e) {
        console.error("Copy fallback failed:", e);
      } finally {
        document.body.removeChild(ta);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
        .catch(() => doFallback());
    } else {
      doFallback();
    }
  };

  return (
    <button onClick={handleCopy} style={S.actionBtn}>
      {copied ? "✓ Copied" : (label || "Copy Code")}
    </button>
  );
}

function ExportPNG() {
  const go = () => {
    const svgEl = document.querySelector(".chart-panel svg");
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const bbox = svgEl.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = bbox.width * 2;
    canvas.height = bbox.height * 2;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#080c18";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement("a");
      a.download = "ux-flow.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  return (
    <button onClick={go} style={{ ...S.actionBtn, color: "#60a5fa", borderColor: "rgba(96,165,250,0.25)" }}>
      Export PNG
    </button>
  );
}

export default function App() {
  const [images, setImages] = useState([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [flowLabel, setFlowLabel] = useState("");
  const [sessions, setSessions] = useState([]);
  const [zoom, setZoom] = useState(1);

  const readB64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const addFiles = useCallback(async (files) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith("image/"));
    const b64s = await Promise.all(imgs.map(readB64));
    setImages(prev => [...prev, ...b64s.map((src, i) => ({ src, type: imgs[i].type, name: imgs[i].name }))]);
  }, []);

  const onDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };
  const onFile = (e) => addFiles(e.target.files);

  const onPaste = useCallback(async (e) => {
    const items = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith("image/"));
    if (!items.length) return;
    await addFiles(items.map(i => i.getAsFile()).filter(Boolean));
  }, [addFiles]);

  useEffect(() => {
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onPaste]);

  const analyse = async () => {
    if (!images.length) return;
    setLoading(true);
    setErr(null);
    setCode("");
    try {
      const content = [
        ...images.map(img => ({
          type: "image",
          source: { type: "base64", media_type: img.type || "image/png", data: img.src.split(",")[1] },
        })),
        {
          type: "text",
          text: `Analyse these ${images.length} UI screen(s)${flowLabel ? ` — flow: "${flowLabel}"` : ""}. Apply the naming conventions and generate the complete horizontal Mermaid flowchart covering all happy paths, error states, retry loops, and edge cases. Return ONLY raw Mermaid code starting with flowchart LR.`,
        },
      ];

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const raw = data.content?.map(b => b.text || "").join("").trim();
      const cleaned = raw.replace(/```mermaid/gi, "").replace(/```/g, "").trim();

      setCode(cleaned);
      setZoom(0.85);
      const label = flowLabel || `Flow ${sessions.length + 1}`;
      setSessions(prev => [...prev, { label, code: cleaned, count: images.length }]);
      setFlowLabel("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8fafc; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.9} }
        .flow-item:hover { background: #f1f5f9 !important; }
        .zoom-btn:hover { background: #e2e8f0 !important; color: #334155 !important; }
        .chart-panel svg { display: block; }
      `}</style>

      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.brand}>
          <span style={S.brandMark}>◈</span>
          <span style={S.brandName}>FlowLens</span>
        </div>
        <span style={S.sectionLabel}>Sessions</span>
        {sessions.length === 0 && <p style={S.emptyNote}>No flows yet</p>}
        {sessions.map((s, i) => (
          <div key={i} className="flow-item" onClick={() => { setCode(s.code); setZoom(0.85); }} style={S.flowItem}>
            <span style={S.flowDot} />
            <span style={S.flowName}>{s.label}</span>
            <span style={S.flowMeta}>{s.count}s</span>
          </div>
        ))}
      </aside>

      {/* Main */}
      <main style={S.main}>
        <div style={S.topBar}>
          <div>
            <h1 style={S.title}>UX Flow Analyser</h1>
            <p style={S.subtitle}>Upload Figma screens · Get horizontal Mermaid flows</p>
          </div>
          {code && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <CopyBtn text={code} />
              <ExportPNG />
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div onDrop={onDrop} onDragOver={e => e.preventDefault()} style={S.dropzone}>
          <input id="fi" type="file" accept="image/*" multiple onChange={onFile} style={{ display: "none" }} />
          <label htmlFor="fi" style={S.dropInner}>
            <span style={S.dropIcon}>⊕</span>
            <span style={S.dropText}>Drop screens, paste from clipboard, or <u style={{ cursor: "pointer" }}>browse files</u></span>
            <span style={S.dropHint}>PNG · JPG · WEBP · Multiple files OK</span>
          </label>
        </div>

        {images.length > 0 && (
          <div style={S.controls}>
            <input
              type="text"
              placeholder="Name this flow (e.g. Onboarding, Reset Password...)"
              value={flowLabel}
              onChange={e => setFlowLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyse()}
              style={S.input}
            />
            <button onClick={analyse} disabled={loading} style={{ ...S.analyseBtn, opacity: loading ? 0.5 : 1 }}>
              {loading ? "Analysing..." : `Analyse ${images.length} Screen${images.length > 1 ? "s" : ""}`}
            </button>
            <button onClick={() => setImages([])} style={S.clearBtn}>Clear</button>
          </div>
        )}

        {images.length > 0 && (
          <div style={S.thumbRow}>
            {images.map((img, i) => (
              <Thumb key={i} src={img.src} index={i} onRemove={() => setImages(p => p.filter((_, j) => j !== i))} />
            ))}
          </div>
        )}

        {err && <div style={S.errBox}>⚠ {err}</div>}

        {loading && (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <p style={S.loadingText}>Reconstructing user flows from screens...</p>
          </div>
        )}

        {/* Side-by-side output */}
        {code && !loading && (
          <div style={S.outputGrid}>

            {/* Chart */}
            <div style={S.panel}>
              <div style={S.panelHead}>
                <span style={S.panelLabel}>Visual Chart</span>
                <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                  <button className="zoom-btn" onClick={() => setZoom(z => Math.max(0.25, +(z - 0.1).toFixed(2)))} style={S.zBtn}>−</button>
                  <span style={S.zLabel}>{Math.round(zoom * 100)}%</span>
                  <button className="zoom-btn" onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))} style={S.zBtn}>+</button>
                  <button className="zoom-btn" onClick={() => setZoom(0.85)} style={{ ...S.zBtn, fontSize: "0.58rem", padding: "0 5px" }}>Reset</button>
                </div>
              </div>
              <div className="chart-panel" style={S.scrollBox}>
                <MermaidChart code={code} zoom={zoom} />
              </div>
            </div>

            {/* Code */}
            <div style={S.panel}>
              <div style={S.panelHead}>
                <span style={S.panelLabel}>Mermaid Code</span>
                <CopyBtn text={code} />
              </div>
              <div style={S.scrollBox}>
                <pre style={S.pre}>{code}</pre>
              </div>
            </div>

          </div>
        )}

        {!code && !loading && (
          <div style={S.empty}>
            <span style={S.emptyIcon}>◈</span>
            <p style={S.emptyText}>Upload Figma screens above to generate a UX flow diagram</p>
          </div>
        )}
      </main>
    </div>
  );
}

const S = {
  root: { display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Syne', sans-serif", color: "#1e293b" },
  sidebar: { width: "205px", minWidth: "205px", background: "#ffffff", borderRight: "1px solid #e2e8f0", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.35rem" },
  brand: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.75rem" },
  brandMark: { fontSize: "1.25rem", color: "#3d5af1" },
  brandName: { fontFamily: "'Syne', sans-serif", fontWeight: "700", fontSize: "0.95rem", letterSpacing: "0.1em", color: "#0f172a" },
  sectionLabel: { fontSize: "0.58rem", fontWeight: "600", letterSpacing: "0.15em", textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.35rem" },
  emptyNote: { fontSize: "0.7rem", color: "#cbd5e1", lineHeight: 1.5 },
  flowItem: { display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.4rem 0.55rem", borderRadius: "5px", cursor: "pointer", transition: "background 0.12s" },
  flowDot: { width: "5px", height: "5px", borderRadius: "50%", background: "#3d5af1", flexShrink: 0 },
  flowName: { fontSize: "0.72rem", color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  flowMeta: { fontSize: "0.6rem", color: "#94a3b8" },
  main: { flex: 1, padding: "1.75rem 2rem", display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", minWidth: 0 },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: "1.3rem", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.01em" },
  subtitle: { fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.2rem", fontFamily: "'IBM Plex Mono', monospace" },
  dropzone: { border: "1.5px dashed #cbd5e1", borderRadius: "10px", background: "#ffffff", cursor: "pointer" },
  dropInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", padding: "1.75rem", cursor: "pointer" },
  dropIcon: { fontSize: "1.6rem", color: "#3d5af1" },
  dropText: { fontSize: "0.8rem", color: "#64748b" },
  dropHint: { fontSize: "0.67rem", color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace" },
  controls: { display: "flex", gap: "0.6rem", alignItems: "center" },
  input: { flex: 1, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.5rem 0.85rem", color: "#1e293b", fontSize: "0.8rem", fontFamily: "'Syne', sans-serif", outline: "none" },
  analyseBtn: { background: "#3d5af1", color: "#fff", border: "none", borderRadius: "6px", padding: "0.5rem 1rem", fontFamily: "'Syne', sans-serif", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 0.15s" },
  clearBtn: { background: "transparent", color: "#94a3b8", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.5rem 0.75rem", fontFamily: "'Syne', sans-serif", fontSize: "0.75rem", cursor: "pointer" },
  thumbRow: { display: "flex", flexWrap: "wrap", gap: "0.5rem" },
  thumb: { position: "relative", width: "76px", height: "56px", borderRadius: "5px", overflow: "hidden", border: "1px solid #e2e8f0" },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  thumbX: { position: "absolute", top: "2px", right: "2px", background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: "3px", width: "15px", height: "15px", fontSize: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  errBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "6px", padding: "0.65rem 0.9rem", fontSize: "0.75rem", fontFamily: "'IBM Plex Mono', monospace" },
  outputGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem", flex: 1, minHeight: "500px" },
  panel: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "9px", display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  panelHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.9rem", borderBottom: "1px solid #f1f5f9", flexShrink: 0 },
  panelLabel: { fontSize: "0.62rem", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8" },
  scrollBox: { overflowX: "auto", overflowY: "auto", flex: 1, padding: "1rem" },
  pre: { fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "#3d5af1", lineHeight: 1.8, whiteSpace: "pre", minWidth: "max-content" },
  actionBtn: { background: "transparent", color: "#3d5af1", border: "1px solid rgba(61,90,241,0.3)", borderRadius: "5px", padding: "0.35rem 0.75rem", fontFamily: "'Syne', sans-serif", fontSize: "0.7rem", fontWeight: "600", cursor: "pointer" },
  zBtn: { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: "3px", width: "20px", height: "20px", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" },
  zLabel: { fontSize: "0.62rem", color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace", minWidth: "30px", textAlign: "center" },
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.9rem", padding: "3rem" },
  spinner: { width: "26px", height: "26px", border: "2px solid #e2e8f0", borderTop: "2px solid #3d5af1", borderRadius: "50%", animation: "spin 0.65s linear infinite" },
  loadingText: { fontSize: "0.72rem", color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace", animation: "pulse 1.4s ease-in-out infinite" },
  empty: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.7rem", padding: "4rem" },
  emptyIcon: { fontSize: "2.75rem", color: "#e2e8f0" },
  emptyText: { fontSize: "0.75rem", color: "#cbd5e1", textAlign: "center", maxWidth: "260px", fontFamily: "'IBM Plex Mono', monospace" },
};
