import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Link } from "react-router-dom";
import logo from "../ECS_logo6.png";
import "../LandingPage.css";
import * as THREE from "three";
import "./Cosmos.css";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

// ─── TEXTURE CACHE ────────────────────────────────────────────────────────────
const _texCache = new Map();

function renderMarkdown(text = "") {
  const normalized = text.replace(/(\*\*[^*]+\*\*):\s*/g, '$1 ');
  const lines = normalized.split("\n");
  return lines.map((line, li) => {
    const cleaned = line.replace(/^:\s*/, "");
    const isNumberLine = /^\d+\.?\s*$/.test(cleaned.trim());
    const br = li < lines.length - 1 ? <br /> : null;

    if (isNumberLine) {
      return <span key={li}><strong>{cleaned.trim()}</strong>{br}</span>;
    }

    const parts = [];
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let last = 0, m;
    while ((m = re.exec(cleaned)) !== null) {
      if (m.index > last) parts.push(cleaned.slice(last, m.index));
      if (m[2] !== undefined) parts.push(<strong key={m.index}>{m[2]}</strong>);
      else parts.push(<em key={m.index}>{m[3]}</em>);
      last = m.index + m[0].length;
    }
    if (last < cleaned.length) parts.push(cleaned.slice(last));
    return <span key={li}>{parts}{br}</span>;
  });
}

function MiniOctahedron({ wobbleType, overall = 0 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const w = el.clientWidth || 200;
    const h = el.clientHeight || 110;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0x4488cc, 1.2);
    dir.position.set(1, 2, 3);
    scene.add(dir);

    const octGeo = new THREE.OctahedronGeometry(1.85, 0);
    const nonIndexed = octGeo.toNonIndexed();
    const faceCount = nonIndexed.attributes.position.count / 3;
    for (let i = 0; i < faceCount; i++) nonIndexed.addGroup(i * 3, 3, i % 2);
    const faceMats = [0, 1].map((j) =>
      new THREE.MeshPhongMaterial({
        color:       j === 0 ? 0x0d2a5e : 0x112f6a,
        emissive:    j === 0 ? 0x081428 : 0x0a1830,
        specular:    0x4488cc,
        shininess:   80,
        transparent: true,
        opacity:     j === 0 ? 0.38 : 0.30,
        side:        THREE.DoubleSide,
        depthWrite:  false,
      })
    );
    const octMesh = new THREE.Mesh(nonIndexed, faceMats);

    const edgeGeo = new THREE.EdgesGeometry(octGeo);
    const wire = new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({ color: 0x5599ee, transparent: true, opacity: 1.0 })
    );
    const halo = new THREE.LineSegments(
      edgeGeo.clone(),
      new THREE.LineBasicMaterial({ color: 0x2255bb, transparent: true, opacity: 0.28 })
    );
    halo.scale.setScalar(1.012);

    const group = new THREE.Group();
    group.add(octMesh, wire, halo);
    group.rotation.x = 0.35;
    group.rotation.y = 0.5;
    scene.add(group);

    let frameId;
    let t = 0;
    const dt = 0.016;

    // Wobble burst state
    let wobbleTimer = 1.5;   // seconds until next burst (initial delay)
    let wobblePhase = 0;     // progress through current burst (0 = idle)
    let wobbleDur = 0;       // total duration of current burst

    const tension = 1 - overall; // 0 = accurate, 1 = inaccurate

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      t += dt;

      // Tick burst timer and trigger new bursts
      if (tension > 0.05) {
        if (wobblePhase <= 0) {
          wobbleTimer -= dt;
          if (wobbleTimer <= 0) {
            wobbleDur = 0.5 + tension * 1.0;          // 0.5s–1.5s burst
            wobblePhase = wobbleDur;
            // next interval: frequent at high tension, rare at low tension
            wobbleTimer = Math.max(0.4, 2.5 * (1 - tension) + 0.3);
          }
        } else {
          wobblePhase -= dt;
          if (wobblePhase < 0) wobblePhase = 0;
        }
      }

      // Smooth envelope: 0→1→0 over the burst duration
      const envelope = wobblePhase > 0
        ? Math.sin(Math.PI * (1 - wobblePhase / wobbleDur))
        : 0;

      const wobbleAmp = tension * 0.42 * envelope;
      const wobbleFreq = 1.0 + tension * 2.0;

      // Base: continuous full rotation
      group.rotation.y += 0.018;
      group.rotation.x = 0.35 + Math.sin(t * wobbleFreq) * wobbleAmp;
      group.rotation.z = Math.sin(t * wobbleFreq * 0.7) * wobbleAmp * 0.5;
      group.position.y = Math.sin(t * wobbleFreq * 0.9) * wobbleAmp * 0.4;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [overall]);

  return <div ref={mountRef} style={{ width: '100%', height: '160px' }} />;
}

const ANIM_PRESETS = {
  fade:        { initial: { opacity: 0, transform: 'none' },            enter: { opacity: 1, transform: 'none' } },
  'slide-up':  { initial: { opacity: 0, transform: 'translateY(28px)' }, enter: { opacity: 1, transform: 'translateY(0)' } },
  'slide-down':{ initial: { opacity: 0, transform: 'translateY(-28px)' },enter: { opacity: 1, transform: 'translateY(0)' } },
  scale:       { initial: { opacity: 0, transform: 'scale(0.72)' },     enter: { opacity: 1, transform: 'scale(1)' } },
};

const ELEM_BASE = {
  title:    { fontSize: '2rem',    fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 },
  subtitle: { fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.4 },
  body:     { fontSize: '0.9rem',  fontWeight: 400, lineHeight: 1.6 },
  tag:      { fontSize: '0.7rem',  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
              background: 'rgba(255,255,255,0.15)', padding: '4px 14px', borderRadius: '999px', display: 'inline-block' },
};

function VideoPlayer({ scenes }) {
  const [sceneIdx, setSceneIdx] = React.useState(0);
  const [phase, setPhase] = React.useState('enter');
  const [playing, setPlaying] = React.useState(true);
  const timersRef = React.useRef([]);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  React.useEffect(() => {
    if (!playing) return;
    clearTimers();
    const scene = scenes[sceneIdx];
    const dur = (scene?.duration || 3) * 1000;
    timersRef.current = [
      setTimeout(() => setPhase('hold'), 50),
      setTimeout(() => setPhase('exit'), dur - 400),
      setTimeout(() => { setSceneIdx(i => (i + 1) % scenes.length); setPhase('enter'); }, dur),
    ];
    return clearTimers;
  }, [sceneIdx, playing]); // eslint-disable-line

  const scene = scenes?.[sceneIdx];
  if (!scene) return null;
  const visible = phase !== 'enter';

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: '10px', overflow: 'hidden', background: '#0a0a0a' }}>
      <div style={{
        position: 'absolute', inset: 0, background: scene.background || '#1a1a2e',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '32px', gap: '14px', textAlign: 'center',
        opacity: phase === 'exit' ? 0 : 1, transition: 'opacity 0.35s ease',
      }}>
        {scene.elements?.map((el, i) => {
          const preset = ANIM_PRESETS[el.animation] || ANIM_PRESETS.fade;
          return (
            <div key={i} style={{
              ...ELEM_BASE[el.style] || ELEM_BASE.body,
              color: el.color || '#ffffff',
              maxWidth: '82%',
              transition: `opacity 0.45s ease ${el.delay || 0}s, transform 0.45s cubic-bezier(0.22,1,0.36,1) ${el.delay || 0}s`,
              ...(visible ? preset.enter : preset.initial),
            }}>
              {el.text}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.55))', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
        <button onClick={() => setPlaying(p => !p)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
          {playing ? '⏸' : '▶'}
        </button>
        <div style={{ flex: 1, display: 'flex', gap: '4px' }}>
          {scenes.map((_, i) => (
            <div key={i} onClick={() => { setSceneIdx(i); setPhase('enter'); }} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i === sceneIdx ? '#fff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'background 0.2s' }} />
          ))}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>{sceneIdx + 1} / {scenes.length}</span>
      </div>
    </div>
  );
}

function InstructionsPanel({ text }) {
  const lines = text.split("\n");
  const bulletLines = [];

  return (
    <div className="di-textbox" role="note">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) return <div key={index} className="di-spacer" />;

        const bulletText = trimmed.replace(/^(\u2022|â€¢)\s*/, "");
        if (bulletText !== trimmed) {
          bulletLines.push(bulletText);
          return null;
        }

        return (
          <p key={index} className="di-paragraph">
            {trimmed}
          </p>
        );
      })}

      {bulletLines.length > 0 && (
        <ul className="di-list">
          {bulletLines.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function makeFaceTex(label, selected, isMirror) {
  const k = label + "|" + selected + "|" + isMirror;
  if (_texCache.has(k)) return _texCache.get(k);

  const sz = 512;
  const cv = document.createElement("canvas");
  cv.width = cv.height = sz;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, sz, sz);

  if (isMirror) {
    ctx.fillStyle = "rgba(255,248,230,0.22)";
    ctx.fillRect(0, 0, sz, sz);
    ctx.strokeStyle = "rgba(120,90,20,0.42)";
    ctx.lineWidth = 7;
    ctx.strokeRect(4, 4, sz - 8, sz - 8);
    ctx.save();
    ctx.translate(sz, 0);
    ctx.scale(-1, 1);
    ctx.fillStyle = "rgba(80,55,5,0.58)";
    ctx.font = 'bold 96px Georgia, serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, sz / 2, sz / 2);
    ctx.restore();
  } else if (selected) {
    ctx.fillStyle = "rgba(255,250,235,0.82)";
    ctx.fillRect(0, 0, sz, sz);
    ctx.strokeStyle = "rgba(180,130,40,0.95)";
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, sz - 18, sz - 18);
    ctx.strokeStyle = "rgba(200,155,60,0.5)";
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, sz - 48, sz - 48);
    ctx.fillStyle = "rgba(100,65,0,0.92)";
    ctx.font = 'bold 96px Georgia, serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, sz / 2, sz / 2);
  } else {
    ctx.fillStyle = "rgba(250,247,238,0.18)";
    ctx.fillRect(0, 0, sz, sz);
    ctx.strokeStyle = "rgba(90,70,20,0.38)";
    ctx.lineWidth = 7;
    ctx.strokeRect(4, 4, sz - 8, sz - 8);
    ctx.fillStyle = "rgba(40,28,5,0.78)";
    ctx.font = 'bold 96px Georgia, serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, sz / 2, sz / 2);
  }

  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  _texCache.set(k, t);
  return t;
}

// ─── GEOMETRY CONSTANTS ───────────────────────────────────────────────────────
// R  = octahedron circumradius
// S  = cube half-side so its vertices sit on the octahedron face centres
const R = 2.6;
const S = R / 3;

const FACE_XFORMS = [
  { pos: [S, 0, 0],  rotY:  Math.PI / 2 },  // +X  WHO
  { pos: [-S, 0, 0], rotY: -Math.PI / 2 },  // -X  WHAT
  { pos: [0, S, 0],  rotX: -Math.PI / 2 },  // +Y  WHEN
  { pos: [0, -S, 0], rotX:  Math.PI / 2 },  // -Y  WHERE
  { pos: [0, 0, S],  rotY:  0 },             // +Z  WHY
  { pos: [0, 0, -S], rotY:  Math.PI },       // -Z  HOW
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const Cosmos = () => {
  const { t } = useTranslation();

  const containerRef = useRef(null);

  // Hacker text (matches CubicLevel pattern)
  const [hackText, setHackText] = useState("");
  useEffect(() => {
    const target = t("ECS");
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,<.>/?";
    let rafId;
    const start = performance.now();
    const duration = 2000;
    const scramble = (now) => {
      const prog = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(prog * target.length);
      let out = "";
      for (let i = 0; i < target.length; i++) {
        out +=
          i < revealed || target[i] === " "
            ? target[i]
            : chars[Math.floor(Math.random() * chars.length)];
      }
      setHackText(out);
      if (revealed < target.length) rafId = requestAnimationFrame(scramble);
    };
    rafId = requestAnimationFrame(scramble);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // UI state
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(null);
  const [faceTexts, setFaceTexts] = useState({});
  const [inputText, setInputText] = useState("");
  const [faceFiles, setFaceFiles] = useState({});
  const [tempFaceFiles, setTempFaceFiles] = useState({});
  const [isDITextBoxVisible, setIsDITextBoxVisible] = useState(true);
  const [isXlsxModalOpen, setIsXlsxModalOpen] = useState(false);
  const [spreadsheetData, setSpreadsheetData] = useState([]);

  // ECS sector modal state
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [sectorModalTitle, setSectorModalTitle] = useState("");
  const [sectorModalSub, setSectorModalSub] = useState("");
  const [sectorModalBody, setSectorModalBody] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [hoveredQuadrant, setHoveredQuadrant] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const [wobbleResult, setWobbleResult] = useState(null);
  const [wobbleLoading, setWobbleLoading] = useState(false);
  const [wobbleMode, setWobbleMode] = useState('direct');
  const [wobbleDomain, setWobbleDomain] = useState('general');
  const [isWobbleModalOpen, setIsWobbleModalOpen] = useState(false);

  const [simulateResult, setSimulateResult] = useState(null);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  const [shareLoading, setShareLoading] = useState(false);
  const [shareToken, setShareToken] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [isTokenSimModalOpen, setIsTokenSimModalOpen] = useState(false);
  const [tokenSimData, setTokenSimData] = useState(null);
  const [tokenSimLoading, setTokenSimLoading] = useState(false);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoData, setVideoData] = useState(null);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef(null);

  const [username, setUsername] = useState(null);
  const [isShortDescModalOpen, setIsShortDescModalOpen] = useState(false);
  const [shortDescFace, setShortDescFace] = useState(null);
  const [shortDescText, setShortDescText] = useState('');
  const [shortDescLocked, setShortDescLocked] = useState(false);
  const [shortDescSaving, setShortDescSaving] = useState(false);
  const [isLongDescModalOpen, setIsLongDescModalOpen] = useState(false);
  const [longDescFace, setLongDescFace] = useState(null);
  const [longDescText, setLongDescText] = useState('');
  const [longDescLocked, setLongDescLocked] = useState(false);
  const [longDescSaving, setLongDescSaving] = useState(false);
  const [isAIShortDescModalOpen, setIsAIShortDescModalOpen] = useState(false);
  const [aiShortDescFace, setAiShortDescFace] = useState(null);
  const [aiShortDescQuery, setAiShortDescQuery] = useState('');
  const [aiShortDescResult, setAiShortDescResult] = useState('');
  const [aiShortDescLoading, setAiShortDescLoading] = useState(false);
  const [aiShortDescHistory, setAiShortDescHistory] = useState([]);
  const [isAILockedModalOpen, setIsAILockedModalOpen] = useState(false);
  const [aiShortDescReplaced, setAiShortDescReplaced] = useState(false);
  const [aiShortDescFiles, setAiShortDescFiles] = useState([]);
  const [shortDescFaceFiles, setShortDescFaceFiles] = useState({});
  const [longDescFaceFiles, setLongDescFaceFiles] = useState({});


  const faceTextsRef = useRef({});
  useEffect(() => { faceTextsRef.current = faceTexts; }, [faceTexts]);

  const buttonRowRef = useRef(null);
  const trashRef = useRef(null);
  const shortDescTextareaRef = useRef(null);
  const longDescTextareaRef = useRef(null);

  const handleWobbleEvaluate = async (modeOverride, domainOverride) => {
    const activeMode = typeof modeOverride === 'string' ? modeOverride : wobbleMode;
    const activeDomain = typeof domainOverride === 'string' ? domainOverride : wobbleDomain;
    setWobbleLoading(true);
    setIsWobbleModalOpen(true);
    setWobbleResult(null);

    const allFaceTexts = faceKeys.reduce((acc, key, i) => {
      acc[key] = (faceTexts[i] || '').trim();
      return acc;
    }, {});

    try {
      const response = await fetch('http://localhost:4000/api/wobble-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceTexts: allFaceTexts, mode: activeMode, cosmos: activeDomain })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Server error');
      setWobbleResult(data);
    } catch (err) {
      console.error('Wobble evaluation failed:', err);
      setWobbleResult({ _error: err.message });
    } finally {
      setWobbleLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulateLoading(true);
    setIsSimulateModalOpen(true);
    setSimulateResult(null);

    const allFaceTexts = faceKeys.reduce((acc, key, i) => {
      acc[key] = (faceTexts[i] || '').trim();
      return acc;
    }, {});

    try {
      const response = await fetch('http://localhost:4000/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceTexts: allFaceTexts }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Server error');
      setSimulateResult(data);
    } catch (err) {
      console.error('Simulate failed:', err);
      setSimulateResult({ _error: err.message });
    } finally {
      setSimulateLoading(false);
    }
  };

  const showToast = (msg) => {
    clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 4000);
  };

  const handleShareSim = async () => {
    setShareLoading(true);
    const allFaceTexts = faceKeys.reduce((acc, key, i) => {
      acc[key] = (faceTexts[i] || '').trim();
      return acc;
    }, {});
    try {
      const res = await fetch('http://localhost:4000/api/simulation-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceTexts: allFaceTexts, userId, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setShareToken(data.token);
      setIsShareModalOpen(true);
    } catch (err) {
      console.error('Share sim failed:', err);
    } finally {
      setShareLoading(false);
    }
  };

  const handleRunTokenSim = async () => {
    if (!tokenSimData) return;
    setTokenSimLoading(true);
    setIsSimulateModalOpen(true);
    setSimulateResult(null);
    setSimulateLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceTexts: tokenSimData.face_texts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      setSimulateResult(data);
    } catch (err) {
      setSimulateResult({ _error: err.message });
    } finally {
      setSimulateLoading(false);
      setTokenSimLoading(false);
    }
  };

  const handleRunTokenVideo = async () => {
    if (!tokenSimData) return;
    setVideoLoading(true);
    setVideoData(null);
    setIsVideoModalOpen(true);
    try {
      const res = await fetch('http://localhost:4000/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceTexts: tokenSimData.face_texts }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Server error');
      setVideoData(data);
    } catch (err) {
      setVideoData({ _error: err.message });
    } finally {
      setVideoLoading(false);
    }
  };

  const handleRunTokenEval = async () => {
    if (!tokenSimData) return;
    setWobbleLoading(true);
    setWobbleResult(null);
    setIsWobbleModalOpen(true);
    try {
      const res = await fetch('http://localhost:4000/api/wobble-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceTexts: tokenSimData.face_texts, mode: wobbleMode, cosmos: wobbleDomain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      setWobbleResult(data);
    } catch (err) {
      setWobbleResult({ _error: err.message });
    } finally {
      setWobbleLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    setVideoLoading(true);
    setVideoData(null);
    setIsVideoModalOpen(true);
    const allFaceTexts = faceKeys.reduce((acc, key, i) => {
      acc[key] = (faceTexts[i] || '').trim();
      return acc;
    }, {});
    try {
      const res = await fetch('http://localhost:4000/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceTexts: allFaceTexts }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Server error');
      setVideoData(data);
    } catch (err) {
      setVideoData({ _error: err.message });
    } finally {
      setVideoLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFaceIndex !== null && faceTexts[selectedFaceIndex] !== undefined) {
      setInputText(faceTexts[selectedFaceIndex] || "");
    }
  }, [selectedFaceIndex, faceTexts]);

  useEffect(() => {
    setValidationResult(null);
    setValidationError("");
    setIsValidationModalOpen(false);
    setHoveredQuadrant(null);
  }, [selectedFaceIndex]);

  // i18n label keys
  const faceKeys = ["who", "what", "when", "where", "why", "how"];
  const FACES = faceKeys.map((key, i) => ({
    key,
    label: t(`cube_faces.${key}`).toUpperCase() + "?",
    oppLabel: t(`cube_faces.${faceKeys[i % 2 === 0 ? i + 1 : i - 1]}`).toUpperCase() + "?",
  }));

  const getStatusLabel = (status) => {
    switch (status) {
      case "pass":
        return "Good";
      case "warn":
        return "Needs work";
      case "fail":
        return "Problem";
      case "needs_review":
        return "Review needed";
      case "revise":
        return "Revise";
      default:
        return "Check";
    }
  };

  // Three.js refs
  const frontMeshesRef = useRef([]);
  const rendererRef = useRef(null);
  const groupRef = useRef(null);
  const autoSpinRef = useRef(true);
  const cancelFaceAnimRef = useRef(null); // set by the Three.js effect to cancel in-flight reorientation

  // User / data
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    const storedUserId = localStorage.getItem("loggedInUserId");
    if (storedUserId) {
      setUserId(storedUserId);
      fetchSavedData(storedUserId);
      fetch(`http://localhost:4000/api/profile/${storedUserId}`)
        .then(r => r.json())
        .then(d => { if (d.username) setUsername(d.username); })
        .catch(() => {});
    } else {
      console.error("User ID not found in localStorage");
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!username) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;
    fetch(`http://localhost:4000/api/simulation-tokens/${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setTokenSimData(data); setIsTokenSimModalOpen(true); } })
      .catch(() => {});
  }, [username]);

  const fetchSavedData = async (uid) => {
    try {
      const response = await fetch(`http://localhost:4000/api/avdata/${uid}`);
      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
      const data = await response.json();
      setFaceTexts({
        0: data.who_text || "",
        1: data.what_text || "",
        2: data.when_text || "",
        3: data.where_text || "",
        4: data.why_text || "",
        5: data.how_text || "",
      });
      const newFaceFiles = {};
      for (let i = 0; i < 6; i++) {
        const face = faceKeys[i];
        try {
          const fileResponse = await fetch(`http://localhost:4000/api/avfiles/${uid}/${face}`);
          if (!fileResponse.ok) throw new Error(`No files for ${face}`);
          const files = await fileResponse.json();
          newFaceFiles[i] = {
            saved: files.map((file) => ({
              id: file.id,
              name: file.file_name,
              type: file.file_type,
              url: `http://localhost:4000/api/avfiles/download/${file.id}`,
            })),
            pending: [],
          };
        } catch {
          newFaceFiles[i] = { saved: [], pending: [] };
        }
      }
      setFaceFiles(newFaceFiles);
    } catch (error) {
      console.error("Error in fetchSavedData:", error);
    }
  };

  const toggleDITextBox = () => setIsDITextBoxVisible((v) => !v);
  useEffect(() => { setIsDITextBoxVisible(true); }, []);

  useEffect(() => {
    if (selectedFaceIndex !== null) {
      setTempFaceFiles((prev) => ({
        ...prev,
        [selectedFaceIndex]: {
          saved: prev[selectedFaceIndex]?.saved || [],
          pending: [],
        },
      }));
    }
  }, [selectedFaceIndex]);

  // Topbar menu toggle
  useEffect(() => {
    const handleClick = (e) => {
      const btn = e.target.closest(".menu-button");
      const wrapper = e.target.closest(".topbar-right");
      document.querySelectorAll(".topbar-right").forEach((el) => {
        if (el !== wrapper) el.classList.remove("open");
      });
      if (btn && wrapper) {
        wrapper.classList.toggle("open");
        btn.setAttribute("aria-expanded", wrapper.classList.contains("open"));
      } else {
        document.querySelectorAll(".topbar-right").forEach((el) =>
          el.classList.remove("open")
        );
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ─── THREE.JS SCENE ─────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const PW = container.clientWidth;
    const PH = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(PW, PH);
    renderer.setClearColor(0xffffff, 0);
    renderer.sortObjects = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, PW / PH, 0.1, 100);
    camera.position.set(0, 0, 10);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.1);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.45);
    fillLight.position.set(-4, -3, 3);
    scene.add(fillLight);

    // Build cube face meshes (front + back per face)
    const frontMeshes = [];
    const backMeshes = [];
    const faceLabels = faceKeys.map((k) => t(`cube_faces.${k}`).toUpperCase() + "?");

    FACE_XFORMS.forEach((xf, i) => {
      const label = faceLabels[i];
      const geo = new THREE.PlaneGeometry(S * 2, S * 2);

      const backMat = new THREE.MeshBasicMaterial({
        map: makeFaceTex(label, false, true),
        transparent: true,
        opacity: 0.52,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const backMesh = new THREE.Mesh(geo, backMat);
      backMesh.renderOrder = 1;

      const frontMat = new THREE.MeshBasicMaterial({
        map: makeFaceTex(label, false, false),
        transparent: true,
        opacity: 0.82,
        side: THREE.FrontSide,
        depthWrite: false,
      });
      const frontMesh = new THREE.Mesh(geo, frontMat);
      frontMesh.renderOrder = 3;

      [backMesh, frontMesh].forEach((m) => {
        m.position.set(...xf.pos);
        if (xf.rotY !== undefined) m.rotation.y = xf.rotY;
        if (xf.rotX !== undefined) m.rotation.x = xf.rotX;
      });

      frontMeshes.push(frontMesh);
      backMeshes.push(backMesh);
    });
    frontMeshesRef.current = frontMeshes;

    // Invisible proxy cube for raycasting
    const proxyCube = new THREE.Mesh(
      new THREE.BoxGeometry(S * 2, S * 2, S * 2),
      new THREE.MeshBasicMaterial({ visible: false })
    );

    // Gold wireframe on cube
    const cubeWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(S * 2, S * 2, S * 2)),
      new THREE.LineBasicMaterial({ color: 0xc8920a, transparent: true, opacity: 0.75 })
    );
    cubeWire.renderOrder = 4;

    // Octahedron
    const octGeo = new THREE.OctahedronGeometry(R, 0);
    const nonIndexed = octGeo.toNonIndexed();
    const faceCount = nonIndexed.attributes.position.count / 3;
    for (let i = 0; i < faceCount; i++) nonIndexed.addGroup(i * 3, 3, i % 2);
    const octFaceMats = [0, 1].map((j) =>
      new THREE.MeshPhongMaterial({
        color:       j === 0 ? 0x0d2a5e : 0x112f6a,
        emissive:    j === 0 ? 0x081428 : 0x0a1830,
        specular:    0x4488cc,
        shininess:   80,
        transparent: true,
        opacity:     j === 0 ? 0.38 : 0.30,
        side:        THREE.DoubleSide,
        depthWrite:  false,
      })
    );
    const octFaceMesh = new THREE.Mesh(nonIndexed, octFaceMats);
    octFaceMesh.renderOrder = 0;

    const octEdgeGeo = new THREE.EdgesGeometry(octGeo);
    const octWire = new THREE.LineSegments(
      octEdgeGeo,
      new THREE.LineBasicMaterial({ color: 0x5599ee, transparent: true, opacity: 1.0 })
    );
    octWire.renderOrder = 5;

    const octWireHalo = new THREE.LineSegments(
      octEdgeGeo.clone(),
      new THREE.LineBasicMaterial({ color: 0x2255bb, transparent: true, opacity: 0.28 })
    );
    octWireHalo.scale.setScalar(1.012);
    octWireHalo.renderOrder = 1;

    // Single group — everything rotates together
    const group = new THREE.Group();
    group.add(octFaceMesh, octWireHalo);
    backMeshes.forEach((m) => group.add(m));
    frontMeshes.forEach((m) => group.add(m));
    group.add(proxyCube, cubeWire, octWire);
    scene.add(group);
    group.rotation.x = 0.35;
    group.rotation.y = 0.5;
    groupRef.current = group;

    // ── Face reorientation animation ─────────────────────────────────────────
    // Target group rotations so each face's normal points toward the camera (+Z)
    const FACE_TARGET_ROTS = [
      { x: 0,              y: -Math.PI / 2 }, // Face 0: +X  WHO
      { x: 0,              y:  Math.PI / 2 }, // Face 1: -X  WHAT
      { x:  Math.PI / 2,   y: 0 },            // Face 2: +Y  WHEN
      { x: -Math.PI / 2,   y: 0 },            // Face 3: -Y  WHERE
      { x: 0,              y: 0 },             // Face 4: +Z  WHY
      { x: 0,              y: Math.PI },       // Face 5: -Z  HOW
    ];

    // Normalize angle to [-PI, PI] for shortest-path lerp
    const normalizeAngle = (a) => {
      const TWO_PI = 2 * Math.PI;
      return a - TWO_PI * Math.floor((a + Math.PI) / TWO_PI);
    };

    let faceTargetRot = null;
    let isAnimatingToFace = false;
    cancelFaceAnimRef.current = () => { isAnimatingToFace = false; faceTargetRot = null; };

    // ── Drag to rotate ──────────────────────────────────────────────────────
    let dragging = false;
    let moved = false;
    let px = 0, py = 0;

    const onMouseDown = (e) => {
      dragging = true;
      autoSpinRef.current = false;
      isAnimatingToFace = false;
      faceTargetRot = null;
      moved = false;
      px = e.clientX;
      py = e.clientY;
    };
    const onMouseUp = () => { dragging = false; };
    const onMouseMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      group.rotation.y += dx * 0.007;
      group.rotation.x += dy * 0.007;
      px = e.clientX;
      py = e.clientY;
    };
    const onTouchStart = (e) => {
      dragging = true;
      autoSpinRef.current = false;
      isAnimatingToFace = false;
      faceTargetRot = null;
      moved = false;
      px = e.touches[0].clientX;
      py = e.touches[0].clientY;
    };
    const onTouchEnd = () => { dragging = false; };
    const onTouchMove = (e) => {
      if (!dragging) return;
      const dx = e.touches[0].clientX - px, dy = e.touches[0].clientY - py;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      group.rotation.y += dx * 0.007;
      group.rotation.x += dy * 0.007;
      px = e.touches[0].clientX;
      py = e.touches[0].clientY;
    };

    // ── Scroll / pinch to zoom ───────────────────────────────────────────────
    const MIN_Z = 4, MAX_Z = 20;
    const onWheel = (e) => {
      e.preventDefault();
      camera.position.z = Math.max(MIN_Z, Math.min(MAX_Z, camera.position.z + e.deltaY * 0.01));
    };

    let pinchDist0 = null;
    let camZ0 = null;
    const getPinchDist = (e) =>
      Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

    const onPinchStart = (e) => {
      if (e.touches.length === 2) { pinchDist0 = getPinchDist(e); camZ0 = camera.position.z; }
    };
    const onPinchMove = (e) => {
      if (e.touches.length === 2 && pinchDist0 !== null) {
        const scale = pinchDist0 / getPinchDist(e);
        camera.position.z = Math.max(MIN_Z, Math.min(MAX_Z, camZ0 * scale));
      }
    };
    const onPinchEnd = () => { pinchDist0 = null; camZ0 = null; };

    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("touchstart", onPinchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", onPinchMove, { passive: true });
    window.addEventListener("touchend", onPinchEnd);

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: true });

    // ── Click to select face ────────────────────────────────────────────────
    const ray = new THREE.Raycaster();
    const mpos = new THREE.Vector2();

    const onCanvasClick = (e) => {
      if (moved) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mpos.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mpos.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      ray.setFromCamera(mpos, camera);
      const hits = ray.intersectObject(proxyCube);
      if (hits.length) {
        const faceIndex = Math.floor(hits[0].faceIndex / 2);
        selectFace(faceIndex);
      }
    };
    renderer.domElement.addEventListener("click", onCanvasClick);

    const selectFace = (idx) => {
      setSelectedFaceIndex(idx);
      setInputText(faceTextsRef.current[idx] || "");
      setIsDITextBoxVisible(false);
      autoSpinRef.current = false;

      // Normalize current rotation so the lerp takes the shortest path
      group.rotation.x = normalizeAngle(group.rotation.x);
      group.rotation.y = normalizeAngle(group.rotation.y);
      faceTargetRot = { ...FACE_TARGET_ROTS[idx] };
      isAnimatingToFace = true;

      frontMeshes.forEach((m, i) => {
        const sel = i === idx;
        const label = faceKeys.map((k) => t(`cube_faces.${k}`).toUpperCase() + "?")[i];
        const old = m.material.map;
        m.material.map = makeFaceTex(label, sel, false);
        m.material.opacity = sel ? 0.92 : 0.82;
        m.material.needsUpdate = true;
        if (old && old !== m.material.map) old.dispose();
      });
    };

    // ── Language change ─────────────────────────────────────────────────────
    const onLang = () => {
      frontMeshes.forEach((m, i) => {
        const label = faceKeys.map((k) => t(`cube_faces.${k}`).toUpperCase() + "?")[i];
        const old = m.material.map;
        m.material.map = makeFaceTex(label, false, false);
        m.material.needsUpdate = true;
        if (old && old !== m.material.map) old.dispose();
      });
    };
    i18n.on("languageChanged", onLang);

    // ── Resize ──────────────────────────────────────────────────────────────
    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // ── Render loop ─────────────────────────────────────────────────────────
    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (autoSpinRef.current) {
        group.rotation.y += 0.004;
        group.rotation.x += 0.0007;
      } else if (isAnimatingToFace && faceTargetRot) {
        const dx = faceTargetRot.x - group.rotation.x;
        const dy = faceTargetRot.y - group.rotation.y;
        group.rotation.x += dx * 0.1;
        group.rotation.y += dy * 0.1;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
          group.rotation.x = faceTargetRot.x;
          group.rotation.y = faceTargetRot.y;
          isAnimatingToFace = false;
          faceTargetRot = null;
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      i18n.off("languageChanged", onLang);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("touchstart", onPinchStart);
      renderer.domElement.removeEventListener("touchmove", onPinchMove);
      window.removeEventListener("touchend", onPinchEnd);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      window.removeEventListener("resize", handleResize);
      [octGeo, nonIndexed, octEdgeGeo].forEach((g) => g.dispose());
      octFaceMats.forEach((m) => m.dispose());
      frontMeshes.forEach((m) => { if (m.material.map) m.material.map.dispose(); m.material.dispose(); });
      backMeshes.forEach((m) => { if (m.material.map) m.material.map.dispose(); m.material.dispose(); });
      renderer.dispose();
      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // ─── ECS SECTOR ACTIONS ──────────────────────────────────────────────────────
  const SMETA = [
    {
      title: "Long description — Corpus Dimension",
      sub: (f) => `Read-only genre/corpus description — ${f.label}`,
      prompt: (f) =>
        `You are a scholarly ECS (Epistemic Coordinate System) assistant. For the 5W1H dimension "${f.label}", write a LONG, authoritative, read-only corpus/genre description (3 paragraphs). Explain its epistemic character, which traditions of inquiry it belongs to, and how it relates to its oppositional counterpart "${f.oppLabel}". Academic tone.`,
    },
    {
      title: "Brief description — Questions Dimension",
      sub: (f) => `Read-only simple-page summary — ${f.label}`,
      prompt: (f) =>
        `ECS assistant. For the 5W1H dimension "${f.label}", write a BRIEF (2–3 sentences) read-only summary of how this question-dimension is understood in this ECS. Emphasize its distinctive epistemic character vs. "${f.oppLabel}".`,
    },
    {
      title: "Consistency check — AI-aided",
      sub: (f) => `Internal + external consistency — ${f.label} vs ${f.oppLabel}`,
      prompt: (f) =>
        `ECS consistency analyst. For dimension "${f.label}": (a) what internal contradictions should be flagged in its long and short descriptions? (b) is it externally consistent with its oppositional counterpart "${f.oppLabel}" — are they properly distinguished (e.g. instrumental vs. teleological)? Give 3 concrete questions an editor should ask.`,
    },
  ];

  const handleClearConfirm = async () => {
    setShowClearConfirm(false);
    if (!userId) return;
    await fetch(`http://localhost:4000/api/avdata/clear/${userId}`, { method: "DELETE" });
    setFaceTexts({});
    setFaceFiles({});
    setTempFaceFiles({});
    setInputText("");
    setSelectedFaceIndex(null);
    setIsDITextBoxVisible(true);
  };

  const handleSector = async (n) => {
    if (n === 4) {
      // Reset & reactivate
      setSelectedFaceIndex(null);
      setIsDITextBoxVisible(true);
      cancelFaceAnimRef.current?.();
      autoSpinRef.current = true;
      const faceLabels = faceKeys.map((k) => t(`cube_faces.${k}`).toUpperCase() + "?");
      frontMeshesRef.current.forEach((m, i) => {
        const old = m.material.map;
        m.material.map = makeFaceTex(faceLabels[i], false, false);
        m.material.opacity = 0.82;
        m.material.needsUpdate = true;
        if (old && old !== m.material.map) old.dispose();
      });
      return;
    }
    if (selectedFaceIndex === null) return;

    const f = FACES[selectedFaceIndex];
    const meta = SMETA[n - 1];
    setSectorModalTitle(meta.title);
    setSectorModalSub(meta.sub(f));
    setSectorModalBody("Generating response…");
    setIsSectorModalOpen(true);

    try {
      const res = await fetch("http://localhost:4000/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: meta.prompt(f) }),
      });
      const data = await res.json();
      setSectorModalBody(data.text || "No response received.");
    } catch (err) {
      setSectorModalBody("Error: " + err.message);
    }
  };

  // ─── STANDARD HANDLERS (matching CubicLevel) ─────────────────────────────────
  const handleSave = async () => {
    if (!userId || selectedFaceIndex === null) return;
    const face = faceKeys[selectedFaceIndex];
    const textColumn = `${face}_text`;

    await fetch("http://localhost:4000/api/avdata/update", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, face: textColumn, text: inputText || "" }),
      headers: { "Content-Type": "application/json" },
    });

    const selectedFiles = tempFaceFiles[selectedFaceIndex]?.pending || [];
    if (selectedFiles.length > 0) {
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("face", face);
      selectedFiles.forEach((file) => formData.append("files", file));
      await fetch("http://localhost:4000/api/avfiles/upload", { method: "POST", body: formData });
    }

    fetchSavedData(userId);
    setInputText("");
    setValidationResult(null);
    setValidationError("");
    setSelectedFaceIndex(null);
    setIsDITextBoxVisible(true);
    cancelFaceAnimRef.current?.();
    autoSpinRef.current = true;

    const faceLabels = faceKeys.map((k) => t(`cube_faces.${k}`).toUpperCase() + "?");
    frontMeshesRef.current.forEach((m, i) => {
      const old = m.material.map;
      m.material.map = makeFaceTex(faceLabels[i], false, false);
      m.material.opacity = 0.82;
      m.material.needsUpdate = true;
      if (old && old !== m.material.map) old.dispose();
    });
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0 && selectedFaceIndex !== null) {
      setTempFaceFiles((prev) => {
        const currentPending = prev[selectedFaceIndex]?.pending || [];
        return {
          ...prev,
          [selectedFaceIndex]: {
            saved: prev[selectedFaceIndex]?.saved || [],
            pending: [...currentPending, ...files],
          },
        };
      });
      const newFileNames = files.map((f) => `• ${f.name}`).join("\n");
      setInputText((prevText) => (prevText ? `${prevText}\n${newFileNames}` : newFileNames));
    }
  };

  const handleDeleteFile = async (faceIndex, fileIndex, type) => {
    if (!userId) return;
    const fileToRemove =
      type === "saved"
        ? faceFiles[faceIndex]?.saved[fileIndex]
        : tempFaceFiles[faceIndex]?.pending[fileIndex];
    const fileId = fileToRemove?.id;
    try {
      if (type === "saved" && fileId) {
        const response = await fetch(`http://localhost:4000/api/avfiles/delete/${fileId}`, { method: "DELETE" });
        if (!response.ok) throw new Error((await response.json()).error || "Unknown error");
      }
      const fileNameToRemove = fileToRemove?.name;
      setFaceFiles((prev) => {
        const updated = { ...prev };
        if (updated[faceIndex]) {
          updated[faceIndex].saved = (updated[faceIndex].saved || []).filter(
            (_, i) => !(type === "saved" && i === fileIndex)
          );
        }
        return updated;
      });
      setTempFaceFiles((prev) => {
        const updated = { ...prev };
        if (updated[faceIndex]) {
          updated[faceIndex].pending = (updated[faceIndex].pending || []).filter(
            (_, i) => !(type === "pending" && i === fileIndex)
          );
        }
        return updated;
      });
      if (fileNameToRemove) {
        setInputText((prevText) =>
          prevText.split("\n").filter((line) => !line.includes(fileNameToRemove)).join("\n")
        );
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleValidateFace = async () => {
    if (selectedFaceIndex === null) return;

    const selectedFace = faceKeys[selectedFaceIndex];
    const draftFaceTexts = faceKeys.reduce((acc, key, index) => {
      acc[key] = index === selectedFaceIndex ? (inputText || "").trim() : (faceTexts[index] || "").trim();
      return acc;
    }, {});

    setIsValidationModalOpen(true);
    setValidationLoading(true);
    setValidationError("");

    try {
      const response = await fetch("http://localhost:4000/api/face-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedFace,
          faceTexts: draftFaceTexts,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Validation failed.");
      }

      setValidationResult(data);
    } catch (err) {
      console.error("Face validation failed:", err);
      setValidationError(err.message || "Validation failed.");
      setValidationResult(null);
    } finally {
      setValidationLoading(false);
    }
  };

  const formatText = (command) => {
    const textarea = document.getElementById("tet-text-area");
    const start = textarea.selectionStart;
    const textBefore = inputText.substring(0, start);
    const lines = inputText.split("\n");
    const lineIndex = lines.length - 1;
    let newText = inputText;
    switch (command) {
      case "bullet":
        if (lines[lineIndex].startsWith("•")) {
          lines[lineIndex] = lines[lineIndex].substring(2);
        } else {
          lines[lineIndex] = `• ${lines[lineIndex].trim()}`;
        }
        newText = lines.join("\n");
        break;
      case "numbered":
        if (/^\d+\.\s/.test(lines[lineIndex])) {
          lines[lineIndex] = lines[lineIndex].replace(/^\d+\.\s/, "");
        } else {
          const numberedCount = lines.filter(l => /^\d+\.\s/.test(l)).length;
          lines[lineIndex] = `${numberedCount + 1}. ${lines[lineIndex].trim()}`;
        }
        newText = lines.join("\n");
        break;
      default:
        break;
    }
    setInputText(newText);
  };

  const formatShortDesc = (command) => {
    const textarea = shortDescTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = shortDescText;
    const lines = text.split("\n");
    const lineIndex = text.substring(0, start).split("\n").length - 1;
    let newText = text;
    switch (command) {
      case "bullet":
        if (lines[lineIndex].startsWith("•")) {
          lines[lineIndex] = lines[lineIndex].substring(2);
        } else {
          lines[lineIndex] = `• ${lines[lineIndex].trim()}`;
        }
        newText = lines.join("\n");
        break;
      case "numbered":
        if (/^\d+\.\s/.test(lines[lineIndex])) {
          lines[lineIndex] = lines[lineIndex].replace(/^\d+\.\s/, "");
        } else {
          const numberedCount = lines.filter(l => /^\d+\.\s/.test(l)).length;
          lines[lineIndex] = `${numberedCount + 1}. ${lines[lineIndex].trim()}`;
        }
        newText = lines.join("\n");
        break;
      default:
        break;
    }
    setShortDescText(newText);
  };

  const formatLongDesc = (command) => {
    const textarea = longDescTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = longDescText;
    const lines = text.split("\n");
    const lineIndex = text.substring(0, start).split("\n").length - 1;
    let newText = text;
    switch (command) {
      case "bullet":
        if (lines[lineIndex].startsWith("•")) {
          lines[lineIndex] = lines[lineIndex].substring(2);
        } else {
          lines[lineIndex] = `• ${lines[lineIndex].trim()}`;
        }
        newText = lines.join("\n");
        break;
      case "numbered":
        if (/^\d+\.\s/.test(lines[lineIndex])) {
          lines[lineIndex] = lines[lineIndex].replace(/^\d+\.\s/, "");
        } else {
          const numberedCount = lines.filter(l => /^\d+\.\s/.test(l)).length;
          lines[lineIndex] = `${numberedCount + 1}. ${lines[lineIndex].trim()}`;
        }
        newText = lines.join("\n");
        break;
      default:
        break;
    }
    setLongDescText(newText);
  };

  const handleKeyDown = (event) => {
    const textarea = event.target;
    if (event.key === "Enter") {
      event.preventDefault();
      const start = textarea.selectionStart;
      const textBefore = inputText.substring(0, start);
      const textAfter = inputText.substring(start);
      const currentLine = textBefore.split("\n").pop();
      const numberedMatch = currentLine.match(/^(\d+)\.\s/);
      let newText;
      let cursorOffset;
      if (numberedMatch) {
        const nextNum = parseInt(numberedMatch[1], 10) + 1;
        const prefix = `${nextNum}. `;
        newText = `${textBefore}\n${prefix}${textAfter}`;
        cursorOffset = start + 1 + prefix.length;
      } else if (currentLine.trim().startsWith("•")) {
        newText = `${textBefore}\n• ${textAfter}`;
        cursorOffset = start + 3;
      } else {
        newText = `${textBefore}\n${textAfter}`;
        cursorOffset = start + 1;
      }
      setInputText(newText);
      setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = cursorOffset; }, 0);
    }
  };

  const handleXLSXClick = () => {
    const faceLabels = faceKeys.map((k) => t(`cube_faces.${k}`));
    const tableData = [
      ["", ...faceLabels],
      [t("text_label"), ...faceKeys.map((_, i) => faceTexts[i] || "")],
      [
        t("files_label"),
        ...faceKeys.map((_, i) => {
          const { saved = [] } = faceFiles[i] || {};
          return saved.map((f) => f.name).join(",\n");
        }),
      ],
    ];
    setSpreadsheetData(tableData);
    setIsXlsxModalOpen(true);
  };

  const handleDownloadClick = async () => {
    const faceLabels = faceKeys.map((k) => t(`cube_faces.${k}`));
    const zip = new JSZip();
    const ssData = [["", ...faceLabels]];
    const textRow = [t("text_label"), ...faceKeys.map((_, i) => faceTexts[i] || "")];
    const filesRow = [
      t("files_label"),
      ...faceKeys.map((_, i) => {
        const { saved = [] } = faceFiles[i] || {};
        return saved.map((f) => f.name).join(", \n");
      }),
    ];
    ssData.push(textRow, filesRow);
    const worksheet = XLSX.utils.aoa_to_sheet(ssData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ECS Data");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    zip.file("ECS-Data.xlsx", excelBuffer);
    for (let i = 0; i < 6; i++) {
      const { saved = [] } = faceFiles[i] || {};
      for (const file of saved) {
        try {
          const response = await fetch(file.url);
          if (!response.ok) throw new Error(`Failed to fetch ${file.name}`);
          zip.file(file.name, await response.arrayBuffer(), { binary: true });
        } catch (error) {
          console.error(`Error fetching file ${file.name}:`, error);
        }
      }
    }
    zip.generateAsync({ type: "blob" }).then((content) => saveAs(content, "ECSDataFolder.zip"));
  };

  // ─── QUADRANT HOVER HANDLERS ─────────────────────────────────────────────────
  const handleContainerMouseMove = (e) => {
    if (selectedFaceIndex === null) {
      setHoveredQuadrant(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - (rect.left + rect.width / 2);
    const my = e.clientY - (rect.top + rect.height / 2);
    // Octahedron vertex projects to ~0.72 of canvas half-height from center
    const scale = (rect.height / 2) * 0.72;
    const nx = mx / scale;
    const ny = my / scale;
    // Outside projected diamond shape
    if (Math.abs(nx) + Math.abs(ny) > 1.0) { setHoveredQuadrant(null); return; }
    // Inside center cube face (S/R ≈ 1/3)
    if (Math.abs(nx) < 0.34 && Math.abs(ny) < 0.34) { setHoveredQuadrant(null); return; }
    const q = mx <= 0 && my <= 0 ? 1 : mx > 0 && my <= 0 ? 2 : mx <= 0 && my > 0 ? 3 : 4;
    setHoveredQuadrant(q);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleContainerMouseLeave = () => setHoveredQuadrant(null);

  const handleOpenShortDesc = async (face) => {
    setShortDescFace(face);
    setShortDescText('');
    setShortDescLocked(false);
    setIsShortDescModalOpen(true);
    fetchDescFilesForFace(face, 'short');
    try {
      const res = await fetch(`http://localhost:4000/api/face-descriptions/${face}`);
      const data = await res.json();
      setShortDescText(data.short_description || '');
      setShortDescLocked(!!data.is_locked);
    } catch (err) {
      console.error('Failed to load short description:', err);
    }
  };

  const handleSaveShortDesc = async () => {
    if (!shortDescFace || !userId) return;
    setShortDescSaving(true);
    try {
      const res = await fetch(`http://localhost:4000/api/face-descriptions/${shortDescFace}/short`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, short_description: shortDescText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setIsShortDescModalOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setShortDescSaving(false);
    }
  };

  const handleToggleLock = async () => {
    const face = shortDescFace;
    if (!face || !userId) return;
    const newLocked = !shortDescLocked;
    try {
      const res = await fetch(`http://localhost:4000/api/face-descriptions/${face}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, is_locked: newLocked }),
      });
      if (res.ok) setShortDescLocked(newLocked);
    } catch (err) {
      console.error('Lock toggle failed:', err);
    }
  };

  const handleOpenAIShortDesc = async (face) => {
    let isLocked = false;
    try {
      const res = await fetch(`http://localhost:4000/api/face-descriptions/${face}`);
      const data = await res.json();
      isLocked = !!data.is_locked;
    } catch (err) {
      console.error('Failed to check lock state:', err);
    }
    if (isLocked && username !== 'admin') {
      setIsAILockedModalOpen(true);
    } else {
      setAiShortDescFace(face);
      setAiShortDescQuery('');
      setAiShortDescResult('');
      setAiShortDescHistory([]);
      setAiShortDescReplaced(false);
      setAiShortDescFiles([]);
      setIsAIShortDescModalOpen(true);
    }
  };

  const handleOpenLongDesc = async (face) => {
    setLongDescFace(face);
    setLongDescText('');
    setLongDescLocked(false);
    setIsLongDescModalOpen(true);
    fetchDescFilesForFace(face, 'long');
    try {
      const res = await fetch(`http://localhost:4000/api/face-descriptions/${face}`);
      const data = await res.json();
      setLongDescText(data.long_description || '');
      setLongDescLocked(!!data.long_desc_locked);
    } catch (err) {
      console.error('Failed to load long description:', err);
    }
  };

  const handleSaveLongDesc = async () => {
    if (!longDescFace || !userId) return;
    setLongDescSaving(true);
    try {
      const res = await fetch(`http://localhost:4000/api/face-descriptions/${longDescFace}/long`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, long_description: longDescText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setIsLongDescModalOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setLongDescSaving(false);
    }
  };

  const handleToggleLongLock = async () => {
    if (!longDescFace || !userId) return;
    const newLocked = !longDescLocked;
    try {
      const res = await fetch(`http://localhost:4000/api/face-descriptions/${longDescFace}/long-lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, long_desc_locked: newLocked }),
      });
      if (res.ok) setLongDescLocked(newLocked);
    } catch (err) {
      console.error('Long lock toggle failed:', err);
    }
  };

  const handleAIShortDescQuery = async () => {
    if (!aiShortDescQuery.trim()) return;
    setAiShortDescLoading(true);
    const allFaceTexts = faceKeys.reduce((acc, key, i) => {
      acc[key] = (faceTexts[i] || '').trim();
      return acc;
    }, {});
    const historyLines = aiShortDescHistory.map(h =>
      `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`
    ).join('\n');
    const fileContext = aiShortDescFiles.length
      ? `\nUploaded reference files: ${aiShortDescFiles.map(f => f.name).join(', ')}`
      : '';
    const prompt = `You are helping generate a short description for the "${aiShortDescFace}" face of a 5W1H event cube.

Cube context:
WHO: ${allFaceTexts.who || '(empty)'}
WHAT: ${allFaceTexts.what || '(empty)'}
WHEN: ${allFaceTexts.when || '(empty)'}
WHERE: ${allFaceTexts.where || '(empty)'}
WHY: ${allFaceTexts.why || '(empty)'}
HOW: ${allFaceTexts.how || '(empty)'}
${fileContext}${historyLines ? `\nPrevious conversation:\n${historyLines}\n` : ''}
User query: ${aiShortDescQuery}

Return only the short description text for the "${aiShortDescFace}" face, no preamble or explanation.`;
    try {
      const res = await fetch('http://localhost:4000/api/anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      const result = data.text || '';
      setAiShortDescResult(result);
      setAiShortDescHistory(prev => [
        ...prev,
        { role: 'user', content: aiShortDescQuery },
        { role: 'assistant', content: result },
      ]);
      setAiShortDescQuery('');
    } catch (err) {
      setAiShortDescResult('Error: ' + err.message);
    } finally {
      setAiShortDescLoading(false);
    }
  };

  const handleAcceptAIShortDesc = async () => {
    if (!aiShortDescResult || !aiShortDescFace || !userId) return;
    setShortDescText(aiShortDescResult);
    try {
      await fetch(`http://localhost:4000/api/face-descriptions/${aiShortDescFace}/short`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, short_description: aiShortDescResult }),
      });
    } catch (err) {
      console.error('Failed to save AI short desc:', err);
    }
    let existingFiles = [];
    try {
      const res = await fetch(`http://localhost:4000/api/descfiles/by-face/${aiShortDescFace}/short`);
      if (res.ok) existingFiles = await res.json();
    } catch {}
    await Promise.all(existingFiles.map(f =>
      fetch(`http://localhost:4000/api/descfiles/delete/${f.id}`, { method: 'DELETE' }).catch(() => {})
    ));
    if (aiShortDescFiles.length) {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('face', aiShortDescFace);
      formData.append('desc_type', 'short');
      aiShortDescFiles.forEach(f => formData.append('files', f));
      try {
        await fetch('http://localhost:4000/api/descfiles/upload', { method: 'POST', body: formData });
      } catch (err) {
        console.error('Failed to upload AI short desc files:', err);
      }
    }
    fetchDescFilesForFace(aiShortDescFace, 'short');
    setAiShortDescReplaced(true);
    setTimeout(() => setIsAIShortDescModalOpen(false), 2000);
  };

  const fetchDescFilesForFace = async (face, type) => {
    const faceIndex = faceKeys.indexOf(face);
    const setter = type === 'long' ? setLongDescFaceFiles : setShortDescFaceFiles;
    try {
      const res = await fetch(`http://localhost:4000/api/descfiles/by-face/${face}/${type}`);
      if (!res.ok) return;
      const files = await res.json();
      setter(prev => ({
        ...prev,
        [faceIndex]: files.map(f => ({
          id: f.id, name: f.file_name, type: f.file_type,
          url: `http://localhost:4000/api/descfiles/download/${f.id}`,
        })),
      }));
    } catch {}
  };

  const handleDeleteDescFile = async (faceIndex, fileId, type) => {
    const setter = type === 'long' ? setLongDescFaceFiles : setShortDescFaceFiles;
    try {
      await fetch(`http://localhost:4000/api/descfiles/delete/${fileId}`, { method: 'DELETE' });
      setter(prev => ({
        ...prev,
        [faceIndex]: (prev[faceIndex] || []).filter(f => f.id !== fileId),
      }));
    } catch (err) {
      console.error('Failed to delete desc file:', err);
    }
  };

  const handleDescFileUpload = async (face, type, event) => {
    const files = Array.from(event.target.files);
    if (!files.length || !userId) return;
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('face', face);
    formData.append('desc_type', type);
    files.forEach(f => formData.append('files', f));
    await fetch('http://localhost:4000/api/descfiles/upload', { method: 'POST', body: formData });
    fetchDescFilesForFace(face, type);
  };

  const handleContainerClick = (e) => {
    if (selectedFaceIndex === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - (rect.left + rect.width / 2);
    const my = e.clientY - (rect.top + rect.height / 2);
    const scale = (rect.height / 2) * 0.72;
    const nx = mx / scale;
    const ny = my / scale;
    if (Math.abs(nx) + Math.abs(ny) > 1.0) return;
    if (Math.abs(nx) < 0.34 && Math.abs(ny) < 0.34) return;
    if (mx <= 0 && my <= 0) {
      // Top-left — restart auto-spin
      setSelectedFaceIndex(null);
      setIsDITextBoxVisible(true);
      cancelFaceAnimRef.current?.();
      autoSpinRef.current = true;
      const faceLabels = faceKeys.map((k) => t(`cube_faces.${k}`).toUpperCase() + "?");
      frontMeshesRef.current.forEach((m, i) => {
        const old = m.material.map;
        m.material.map = makeFaceTex(faceLabels[i], false, false);
        m.material.opacity = 0.82;
        m.material.needsUpdate = true;
        if (old && old !== m.material.map) old.dispose();
      });
    } else if (mx > 0 && my <= 0) {
      // Top-right — open short description modal
      handleOpenShortDesc(faceKeys[selectedFaceIndex]);
    } else if (mx <= 0 && my > 0) {
      // Bottom-left — open long description modal
      handleOpenLongDesc(faceKeys[selectedFaceIndex]);
    } else if (mx > 0 && my > 0) {
      // Bottom-right — AI short description query
      handleOpenAIShortDesc(faceKeys[selectedFaceIndex]);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="tetrahedral-level">
      {/* TOP BAR */}
      <header className="topbar">
        <Link to="/" className="topbar-left" aria-label="Start Page">
          <img src={logo} alt="ECS Logo" className="topbar-logo" />
        </Link>
        <div className="topbar-right">
          <button className="menu-button" aria-haspopup="true" aria-expanded="false">
            <span className="menu-lines" />
          </button>
          <nav className="menu-dropdown" role="menu">
            <Link to="/" className="menu-item" role="menuitem">{t("start_page_label")}</Link>
            <Link to="/landing-page" className="menu-item" role="menuitem">{t("landing_page_label")}</Link>
            <Link to="/login" className="menu-item" role="menuitem">{t("login_button")}</Link>
            <Link to="/create-account" className="menu-item" role="menuitem">{t("create_account_button")}</Link>
            <Link to="/levels/Navigator" className="menu-item" role="menuitem">{t('NavigatorAI')}</Link>
          </nav>
        </div>
      </header>

      {/* Three.js canvas container */}
      <div
        ref={containerRef}
        className="tetrahedral-level-container"
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
        onClick={handleContainerClick}
      />

      {/* Quadrant hover tooltip */}
      {hoveredQuadrant !== null && (
        <div
          className="tet-quadrant-tooltip"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 14 }}
        >
          {hoveredQuadrant === 1 && (
            <>
              <div className="tet-tooltip-title">THE WORKSPACE</div>
              <div className="tet-tooltip-row"><span className="tet-tooltip-tag">CLICK</span> <span style={{ color: '#fff' }}>Restart the rotation.</span></div>
            </>
          )}
          {hoveredQuadrant === 2 && (
            <>
              <div className="tet-tooltip-title">THE SHORT DESCRIPTION</div>
              <div className="tet-tooltip-row"><span className="tet-tooltip-tag">CLICK</span> <span style={{ color: '#fff' }}>View the short description / questions for this surface.</span></div>
            </>
          )}
          {hoveredQuadrant === 3 && (
            <>
              <div className="tet-tooltip-title">THE LONG DESCRIPTION</div>
              <div className="tet-tooltip-row"><span className="tet-tooltip-tag">CLICK</span> <span style={{ color: '#fff' }}>View the long, detailed description of this surface.</span></div>
            </>
          )}
          {hoveredQuadrant === 4 && (
            <>
              <div className="tet-tooltip-title">THE 5W1H LLM PROCESSOR</div>
              <div className="tet-tooltip-row"><span className="tet-tooltip-tag">SHORT CLICK</span> Generate an AI-aided short description for this surface.</div>
              <div className="tet-tooltip-row"><span className="tet-tooltip-tag">LONG CLICK</span> Generate an AI-aided long description for this surface.</div>
            </>
          )}
        </div>
      )}

      {/* Default Instructions Text Box */}
      {isDITextBoxVisible && (
        <div className="text-input-overlay">
          <InstructionsPanel text={t("cubic_level_instructions")} />
        </div>
      )}

      {/* Face selected — text panel */}
      {selectedFaceIndex !== null && (
        <div className="text-input-overlay">
          <div className="face-header">
            <h2 className="face-label">
              {t(`cube_faces.${faceKeys[selectedFaceIndex]}`)} ?
            </h2>
          </div>

          <div className="text-area-container">
            <button className="textarea-bullet-btn" onClick={() => formatText("bullet")}>•</button>
            <button className="textarea-numbered-btn" onClick={() => formatText("numbered")}>123</button>
            <textarea
              id="tet-text-area"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setValidationResult(null);
                setValidationError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder={t("placeholder_t")}
            />
            <div className="file-list">
              {faceFiles[selectedFaceIndex]?.saved.map((file, index) => (
                <div key={`saved-${index}`} className="file-item">
                  <button className="delete-file-button" onClick={() => handleDeleteFile(selectedFaceIndex, index, "saved")}>X</button>
                  <span>{file.name}</span>
                </div>
              ))}
              {tempFaceFiles[selectedFaceIndex]?.pending.map((file, index) => (
                <div key={`pending-${index}`} className="file-item pending">
                  <button className="delete-file-button" onClick={() => handleDeleteFile(selectedFaceIndex, index, "pending")}>X</button>
                  <span>{file.name} (unsaved)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="button-container" ref={buttonRowRef}>
            <label className="upload-button">
              <input type="file" onChange={handleFileUpload} style={{ display: "none" }} multiple />
              {t("insert_files_button")}
            </label>
            <button onClick={handleSave} className="save-button">{t("save_button")}</button>
          </div>
        </div>
      )}

      {isValidationModalOpen && (
        <div className="tet-validation-modal-overlay">
          <div className="tet-validation-modal">
            <button
              className="close-button"
              onClick={() => setIsValidationModalOpen(false)}
              disabled={validationLoading}
            >
              X
            </button>
            <div className="tet-validation-head">
              <div>
                <h3>Face check</h3>
                <p>Checks length automatically and uses AI to review fit and consistency.</p>
              </div>
            </div>

            {validationLoading && <div className="tet-validation-loading">Checking this face now...</div>}
            {validationError && <div className="tet-validation-error">{validationError}</div>}

            {validationResult && (
              <div className="tet-validation-body">
                <div className={`tet-validation-badge is-${validationResult.overallStatus || "warn"}`}>
                  Overall: {getStatusLabel(validationResult.overallStatus)}
                </div>

                <div className="tet-validation-grid">
                  <div className="tet-validation-card">
                    <span className={`tet-validation-pill is-${validationResult.length?.status || "warn"}`}>
                      Length: {getStatusLabel(validationResult.length?.status)}
                    </span>
                    <p>{validationResult.length?.message}</p>
                    <small>
                      {validationResult.length?.wordCount || 0} words, {validationResult.length?.charCount || 0} characters
                    </small>
                  </div>

                  <div className="tet-validation-card">
                    <span className={`tet-validation-pill is-${validationResult.validity?.status || "warn"}`}>
                      Validity: {getStatusLabel(validationResult.validity?.status)}
                    </span>
                    <p>{validationResult.validity?.reason}</p>
                  </div>

                  <div className="tet-validation-card">
                    <span className={`tet-validation-pill is-${validationResult.correctness?.status || "warn"}`}>
                      Consistency: {getStatusLabel(validationResult.correctness?.status)}
                    </span>
                    <p>{validationResult.correctness?.reason}</p>
                  </div>
                </div>

                {Array.isArray(validationResult.suggestions) && validationResult.suggestions.length > 0 && (
                  <div className="tet-validation-suggestions">
                    <strong>Suggestions</strong>
                    <ul>
                      {validationResult.suggestions.map((suggestion, index) => (
                        <li key={`${suggestion}-${index}`}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ECS Sector Modal */}
      {isSectorModalOpen && (
        <div className="ci-modal-overlay">
          <div className="ci-modal-content">
            <button className="close-button" onClick={() => setIsSectorModalOpen(false)}>X</button>
            <h3 className="ci-modal-face-label">{sectorModalTitle}</h3>
            <p className="tet-modal-sub">{sectorModalSub}</p>
            <div className="tet-modal-body">{sectorModalBody}</div>
          </div>
        </div>
      )}

      {/* AI Locked Modal */}
      {isAILockedModalOpen && (
        <div className="tet-validation-modal-overlay" style={{ zIndex: 3300 }}>
          <div className="tet-validation-modal" style={{ maxWidth: '360px', textAlign: 'center' }}>
            <button className="close-button" onClick={() => setIsAILockedModalOpen(false)}>X</button>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔒</div>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Locked</h3>
            <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>
              The AI short description generator has been locked by the admin.
            </p>
            <button
              onClick={() => setIsAILockedModalOpen(false)}
              className="tet-mode-btn tet-mode-btn--active"
              style={{ marginTop: '16px', padding: '7px 24px' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* AI Short Description Modal */}
      {isAIShortDescModalOpen && (
        <div className="tet-validation-modal-overlay" style={{ zIndex: 3300 }}>
          <div className="tet-validation-modal" style={{ maxWidth: '560px' }}>
            <button className="close-button" onClick={() => setIsAIShortDescModalOpen(false)}>X</button>
            <h3 style={{ marginTop: '-6px', marginBottom: '14px' }}>
              Short Description Generator — {aiShortDescFace?.toUpperCase()}
            </h3>

            {aiShortDescResult && (
              <div style={{
                background: '#fefce8', border: '1.5px solid #fde047', borderRadius: '8px',
                padding: '12px 14px', marginBottom: '14px', fontSize: '0.92rem',
                lineHeight: 1.6, color: '#713f12', whiteSpace: 'pre-wrap',
              }}>
                {aiShortDescResult}
              </div>
            )}

            {aiShortDescResult && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <button
                  onClick={handleAcceptAIShortDesc}
                  style={{ padding: '5px 14px', background: aiShortDescReplaced ? '#991b1b' : '#dc2626', border: `1.5px solid ${aiShortDescReplaced ? '#991b1b' : '#dc2626'}`, borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.82em', cursor: aiShortDescReplaced ? 'default' : 'pointer' }}
                >
                  {aiShortDescReplaced ? 'Replaced' : 'Replace Short Description'}
                </button>
              </div>
            )}

            <div style={{ border: '1.5px solid #dde3ee', borderRadius: '8px', background: 'white', marginBottom: '10px' }}>
              <textarea
                value={aiShortDescQuery}
                onChange={e => setAiShortDescQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIShortDescQuery(); } }}
                placeholder={aiShortDescResult ? 'Follow-up query…' : 'Enter a query to generate a short description…'}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px', fontSize: '0.9rem',
                  border: 'none', borderRadius: '8px 8px 0 0', resize: 'vertical',
                  fontFamily: 'inherit', lineHeight: 1.5,
                }}
              />
              {aiShortDescFiles.length > 0 && (
                <div style={{ borderTop: '1px solid #e5e7eb', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {aiShortDescFiles.map((file, i) => (
                    <div key={i} className="file-item" style={{ background: '#eef2f7' }}>
                      <button className="delete-file-button" onClick={() => setAiShortDescFiles(prev => prev.filter((_, idx) => idx !== i))}>X</button>
                      <span style={{ color: '#1e2f52', fontSize: '0.85rem', marginLeft: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#222' }} title="Insert files">
                  <input type="file" multiple style={{ display: 'none' }} onChange={e => setAiShortDescFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
                    <line x1="12" y1="14" x2="12" y2="3"/>
                    <polyline points="8,7 12,3 16,7"/>
                    <path d="M4 17v1.5A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5V17"/>
                  </svg>
                </label>
                <button
                  onClick={handleAIShortDescQuery}
                  disabled={aiShortDescLoading || !aiShortDescQuery.trim()}
                  className="tet-mode-btn tet-mode-btn--active"
                  style={{ padding: '7px 18px', background: '#000', borderColor: '#000', opacity: aiShortDescLoading || !aiShortDescQuery.trim() ? 0.5 : 1 }}
                >
                  {aiShortDescLoading ? '…' : aiShortDescResult ? 'Re-generate' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Short Description Modal */}
      {isShortDescModalOpen && (
        <div className="tet-validation-modal-overlay">
          <div className="tet-validation-modal">
            <button className="close-button" onClick={() => setIsShortDescModalOpen(false)}>X</button>
            <h3 style={{ marginTop: '-6px' }}>Short Description — {shortDescFace?.toUpperCase()}</h3>

            {(username === 'admin' || !shortDescLocked) ? (
              <div style={{ position: 'relative', marginTop: '15px', border: '1.5px solid #dde3ee', borderRadius: '8px', background: 'white' }}>
                <button className="textarea-bullet-btn" onClick={() => formatShortDesc("bullet")}>•</button>
                <button className="textarea-numbered-btn" onClick={() => formatShortDesc("numbered")}>123</button>
                <textarea
                  ref={shortDescTextareaRef}
                  value={shortDescText}
                  onChange={(e) => setShortDescText(e.target.value)}
                  placeholder="Type here..."
                  rows={8}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px',
                    fontSize: '0.92em',
                    border: 'none',
                    borderRadius: '8px 8px 0 0',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
                {(shortDescFaceFiles[faceKeys.indexOf(shortDescFace)]?.length ?? 0) > 0 && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {shortDescFaceFiles[faceKeys.indexOf(shortDescFace)].map((file, i) => (
                      <div key={i} className="file-item" style={{ background: '#eef2f7' }}>
                        <button className="delete-file-button" onClick={() => handleDeleteDescFile(faceKeys.indexOf(shortDescFace), file.id, 'short')}>X</button>
                        <a href={file.url} target="_blank" rel="noopener noreferrer"
                          style={{ flex: 1, color: '#1e2f52', textDecoration: 'underline', fontSize: '0.85rem', marginLeft: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.name}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="tet-validation-card" style={{ minHeight: '120px', lineHeight: 1.6, fontSize: '0.92em', whiteSpace: 'pre-wrap', marginTop: '15px' }}>
                {shortDescText || <em style={{ color: '#9ca3af' }}>No short description yet.</em>}
                {(shortDescFaceFiles[faceKeys.indexOf(shortDescFace)]?.length ?? 0) > 0 && (
                  <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '10px', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {shortDescFaceFiles[faceKeys.indexOf(shortDescFace)].map((file, i) => (
                      <div key={i} className="file-item" style={{ background: '#eef2f7' }}>
                        <a href={file.url} target="_blank" rel="noopener noreferrer"
                          style={{ flex: 1, color: '#1e2f52', textDecoration: 'underline', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.name}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(username === 'admin' || !shortDescLocked) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                {username === 'admin' ? (
                  <button
                    onClick={handleToggleLock}
                    style={{
                      fontSize: '0.78em',
                      border: '1.5px solid #dde3ee',
                      borderRadius: '999px',
                      padding: '3px 12px',
                      background: shortDescLocked ? '#7f1d1d' : '#fbbf24',
                      color: shortDescLocked ? '#fff' : '#000',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {shortDescLocked ? '🔒 Locked' : '🔓 Unlocked'}
                  </button>
                ) : <span />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#222' }} title="Insert files">
                    <input type="file" multiple style={{ display: 'none' }} onChange={e => handleDescFileUpload(shortDescFace, 'short', e)} />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
                      <line x1="12" y1="14" x2="12" y2="3"/>
                      <polyline points="8,7 12,3 16,7"/>
                      <path d="M4 17v1.5A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5V17"/>
                    </svg>
                  </label>
                  <button
                    onClick={handleSaveShortDesc}
                    disabled={shortDescSaving}
                    className="tet-mode-btn tet-mode-btn--active"
                    style={{ borderRadius: '8px !important', padding: '6px 20px', opacity: shortDescSaving ? 0.5 : 1 }}
                  >
                    {shortDescSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Long Description Modal */}
      {isLongDescModalOpen && (
        <div className="tet-validation-modal-overlay">
          <div className="tet-validation-modal">
            <button className="close-button" onClick={() => setIsLongDescModalOpen(false)}>X</button>
            <h3 style={{ marginTop: '-6px' }}>Long Description — {longDescFace?.toUpperCase()}</h3>

            {(username === 'admin' || !longDescLocked) ? (
              <div style={{ position: 'relative', marginTop: '15px', border: '1.5px solid #dde3ee', borderRadius: '8px', background: 'white' }}>
                <button className="textarea-bullet-btn" onClick={() => formatLongDesc("bullet")}>•</button>
                <button className="textarea-numbered-btn" onClick={() => formatLongDesc("numbered")}>123</button>
                <textarea
                  ref={longDescTextareaRef}
                  value={longDescText}
                  onChange={(e) => setLongDescText(e.target.value)}
                  placeholder="Type here..."
                  rows={8}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px',
                    fontSize: '0.92em',
                    border: 'none',
                    borderRadius: '8px 8px 0 0',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
                {(longDescFaceFiles[faceKeys.indexOf(longDescFace)]?.length ?? 0) > 0 && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {longDescFaceFiles[faceKeys.indexOf(longDescFace)].map((file, i) => (
                      <div key={i} className="file-item" style={{ background: '#eef2f7' }}>
                        <button className="delete-file-button" onClick={() => handleDeleteDescFile(faceKeys.indexOf(longDescFace), file.id, 'long')}>X</button>
                        <a href={file.url} target="_blank" rel="noopener noreferrer"
                          style={{ flex: 1, color: '#1e2f52', textDecoration: 'underline', fontSize: '0.85rem', marginLeft: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.name}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="tet-validation-card" style={{ minHeight: '120px', lineHeight: 1.6, fontSize: '0.92em', whiteSpace: 'pre-wrap', marginTop: '15px' }}>
                {longDescText || <em style={{ color: '#9ca3af' }}>No long description yet.</em>}
                {(longDescFaceFiles[faceKeys.indexOf(longDescFace)]?.length ?? 0) > 0 && (
                  <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '10px', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {longDescFaceFiles[faceKeys.indexOf(longDescFace)].map((file, i) => (
                      <div key={i} className="file-item" style={{ background: '#eef2f7' }}>
                        <a href={file.url} target="_blank" rel="noopener noreferrer"
                          style={{ flex: 1, color: '#1e2f52', textDecoration: 'underline', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.name}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(username === 'admin' || !longDescLocked) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                {username === 'admin' ? (
                  <button
                    onClick={handleToggleLongLock}
                    style={{
                      fontSize: '0.78em',
                      border: '1.5px solid #dde3ee',
                      borderRadius: '999px',
                      padding: '3px 12px',
                      background: longDescLocked ? '#7f1d1d' : '#fbbf24',
                      color: longDescLocked ? '#fff' : '#000',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {longDescLocked ? '🔒 Locked' : '🔓 Unlocked'}
                  </button>
                ) : <span />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#222' }} title="Insert files">
                    <input type="file" multiple style={{ display: 'none' }} onChange={e => handleDescFileUpload(longDescFace, 'long', e)} />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
                      <line x1="12" y1="14" x2="12" y2="3"/>
                      <polyline points="8,7 12,3 16,7"/>
                      <path d="M4 17v1.5A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5V17"/>
                    </svg>
                  </label>
                  <button
                    onClick={handleSaveLongDesc}
                    disabled={longDescSaving}
                    className="tet-mode-btn tet-mode-btn--active"
                    style={{ borderRadius: '8px !important', padding: '6px 20px', opacity: longDescSaving ? 0.5 : 1 }}
                  >
                    {longDescSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="tet-validation-modal-overlay" style={{ zIndex: 3300 }}>
          <div className="tet-validation-modal" style={{ maxWidth: '640px', background: '#cecece' }}>
            <button className="close-button" onClick={() => setIsVideoModalOpen(false)}>X</button>
            <h3 style={{ marginTop: '-6px', marginBottom: '14px' }}>
              {videoData?.title || '5W1H Video Visual'}
            </h3>

            {videoLoading && (
              <div className="tet-validation-loading">Generating your video…</div>
            )}

            {videoData?._error && (
              <div className="tet-validation-error">{videoData._error}</div>
            )}

            {videoData?.scenes && (
              <VideoPlayer scenes={videoData.scenes} />
            )}
          </div>
        </div>
      )}

      {/* Share Simulation Link Modal */}
      {isShareModalOpen && (
        <div className="tet-validation-modal-overlay">
          <div className="tet-validation-modal">
            <button className="close-button" onClick={() => setIsShareModalOpen(false)}>X</button>
            <h3 style={{ marginTop: '-6px' }}>Share Link Ready</h3>
            <p style={{ fontSize: '0.85em', color: '#4b5563', margin: '4px 0 12px' }}>
              Anyone logged in can open this link to run a simulation, generate a video, or evaluate the consistency of your data.
            </p>
            <div style={{
              background: '#f3f4f6', border: '1.5px solid #dde3ee', borderRadius: '8px',
              padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.8em',
              wordBreak: 'break-all', color: '#1f2937', lineHeight: 1.5,
            }}>
              {`${window.location.origin}${window.location.pathname}?token=${shareToken}`}
            </div>
            <button
              onClick={() => {
                const link = `${window.location.origin}${window.location.pathname}?token=${shareToken}`;
                navigator.clipboard.writeText(link);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2500);
              }}
              className="tet-mode-btn tet-mode-btn--active"
              style={{ marginTop: '10px', padding: '7px 20px' }}
            >
              {linkCopied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Shared Link Modal */}
      {isTokenSimModalOpen && tokenSimData && (
        <div className="tet-validation-modal-overlay">
          <div className="tet-validation-modal">
            <button className="close-button" onClick={() => setIsTokenSimModalOpen(false)}>X</button>
            <h3 style={{ marginTop: '-6px' }}>Shared by <em>{tokenSimData.username || tokenSimData.user_id || 'unknown'}</em></h3>
            {tokenSimData.created_at && (
              <p style={{ fontSize: '0.85em', color: '#4b5563', margin: '4px 0 12px' }}>
                {new Date(tokenSimData.created_at).toLocaleString()}
              </p>
            )}

            <div className="tet-validation-grid" style={{ marginBottom: '16px' }}>
              {Object.entries(tokenSimData.face_texts).filter(([, v]) => v).map(([face, text]) => (
                <div key={face} className="tet-validation-card">
                  <strong style={{ fontSize: '0.78em', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>{face}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '0.88em', lineHeight: 1.5 }}>{text}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRunTokenSim}
                disabled={tokenSimLoading}
                style={{ flex: 1, padding: '8px 12px', background: '#2563eb', border: '1.5px solid #2563eb', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.9em', cursor: tokenSimLoading ? 'not-allowed' : 'pointer', opacity: tokenSimLoading ? 0.5 : 1 }}
              >
                {tokenSimLoading ? 'Running…' : 'Textual Simulation'}
              </button>
              <button
                onClick={handleRunTokenVideo}
                disabled={videoLoading}
                style={{ flex: 1, padding: '8px 12px', background: '#f5a623', border: '1.5px solid #f5a623', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.9em', cursor: videoLoading ? 'not-allowed' : 'pointer', opacity: videoLoading ? 0.5 : 1 }}
              >
                {videoLoading ? 'Generating…' : 'Video Visual'}
              </button>
              <button
                onClick={handleRunTokenEval}
                disabled={wobbleLoading}
                style={{ flex: 1, padding: '8px 12px', background: '#16a34a', border: '1.5px solid #16a34a', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.9em', cursor: wobbleLoading ? 'not-allowed' : 'pointer', opacity: wobbleLoading ? 0.5 : 1 }}
              >
                {wobbleLoading ? 'Evaluating…' : 'Consistency Evaluator'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wobble Modal */}
      {isWobbleModalOpen && (
        <div className="tet-validation-modal-overlay" style={{ zIndex: 3300 }}>
          <div className="tet-validation-modal">
            <button className="close-button" onClick={() => setIsWobbleModalOpen(false)}>X</button>
            <h3>5W1H Consistency Evaluation</h3>

            {/* Mode selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', marginTop: '10px', justifyContent: 'center' }}>
              {['direct', 'clues', 'socratic'].map((m) => (
                <button
                  key={m}
                  className={`tet-mode-btn${wobbleMode === m ? ' tet-mode-btn--active' : ''}`}
                  disabled={wobbleLoading}
                  onClick={() => { setWobbleMode(m); handleWobbleEvaluate(m); }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {/* Domain selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
              <label style={{ fontSize: '0.82em', color: '#4b5563', fontWeight: 600 }}>Domain</label>
              <select
                value={wobbleDomain}
                disabled={wobbleLoading}
                onChange={(e) => { setWobbleDomain(e.target.value); handleWobbleEvaluate(wobbleMode, e.target.value); }}
                style={{
                  fontSize: '0.82em',
                  border: '1.5px solid #dde3ee',
                  borderRadius: '999px',
                  padding: '3px 10px',
                  background: '#fff',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {[
                  { value: 'general',      label: 'General' },
                  { value: 'legal',        label: 'Legal' },
                  { value: 'medical',      label: 'Medical' },
                  { value: 'scientific',   label: 'Scientific' },
                  { value: 'journalistic', label: 'Journalistic' },
                ].map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {wobbleLoading && <div>Evaluating all faces...</div>}

            {wobbleResult?._error && (
              <div className="tet-validation-error">{wobbleResult._error}</div>
            )}

            {wobbleResult && !wobbleResult._error && (
              <div>
                {/* Wobble type badge */}
                <div className={`tet-validation-badge is-${
                  wobbleResult.wobble?.type === 'silent' ? 'pass' :
                  wobbleResult.wobble?.type === 'shimmer' ? 'warn' : 'fail'
                }`}>
                  {wobbleResult.wobble?.type === 'silent' ? '✦ SILENT' :
                   wobbleResult.wobble?.type === 'shimmer' ? '◈ SHIMMER' : '⟁ WOBBLE'}
                  {' — '}{Math.round((1 - (wobbleResult.wobble?.overall || 0)) * 100)}% tension
                </div>

                {/* Tier bars */}
                <div className="tet-validation-grid">
                  {['T1', 'T2', 'T3'].map(tier => (
                    <div key={tier} className="tet-validation-card">
                      <strong>{tier} ({tier === 'T1' ? 'WHO/WHAT' : tier === 'T2' ? 'WHERE/WHEN' : 'HOW/WHY'})</strong>
                      <div style={{ background: '#eee', borderRadius: 4, height: 8, margin: '6px 0' }}>
                        <div style={{
                          width: `${(wobbleResult.wobble?.[tier] || 0) * 100}%`,
                          background: (wobbleResult.wobble?.[tier] || 0) >= 0.9 ? '#27ae60' : (wobbleResult.wobble?.[tier] || 0) >= 0.5 ? '#f39c12' : '#c0392b',
                          height: '100%', borderRadius: 4
                        }} />
                      </div>
                      <p>{wobbleResult.tier_diagnoses?.[tier]}</p>
                    </div>
                  ))}
                </div>


                {/* Feedback */}
                <div className="tet-validation-suggestions">
                  <strong>Feedback ({wobbleMode})</strong>
                  <p>{renderMarkdown(wobbleResult.feedback)}</p>
                </div>
                <p><em>{renderMarkdown(wobbleResult.overall_assessment)}</em></p>

                {/* Mini octahedron */}
                <div style={{ marginTop: '20px' }}>
                  <MiniOctahedron wobbleType={wobbleResult.wobble?.type || 'silent'} overall={wobbleResult.wobble?.overall || 0} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simulate Modal */}
      {isSimulateModalOpen && (
        <div className="tet-validation-modal-overlay" style={{ zIndex: 3300 }}>
          <div className="tet-validation-modal" style={{ background: '#fdf3e8' }}>
            <button className="close-button" onClick={() => setIsSimulateModalOpen(false)}>X</button>
            <h3>5W1H Textual Simulation</h3>

            {simulateLoading && (
              <div className="tet-validation-loading">Generating simulation…</div>
            )}

            {simulateResult?._error && (
              <div className="tet-validation-error">{simulateResult._error}</div>
            )}

            {simulateResult && !simulateResult._error && (
              <div style={{ marginTop: '10px' }}>
                {/* Scenario */}
                <div style={{ marginBottom: '16px' }}>
                  <div className="tet-validation-badge" style={{ background: '#e8f0fe', color: '#1a3a6b', marginBottom: '10px', fontSize: '0.88rem' }}>
                    ◎ SCENARIO
                  </div>
                  <div className="tet-validation-card">
                    <p style={{ margin: 0, lineHeight: 1.6 }}>{simulateResult.scenario}</p>
                  </div>
                </div>

                {/* Gaps */}
                {simulateResult.gaps?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div className="tet-validation-badge" style={{ background: '#fef3c7', color: '#78350f', marginBottom: '10px', fontSize: '0.88rem' }}>
                      ⚠ GAPS
                    </div>
                    <div className="tet-validation-grid">
                      {simulateResult.gaps.map((g, i) => (
                        <div key={i} className="tet-validation-card">
                          <strong style={{ fontSize: '0.82em', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000000' }}>
                            {g.face}
                          </strong>
                          <p>{g.issue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variations */}
                {simulateResult.variations?.length > 0 && (
                  <div>
                    <div className="tet-validation-badge" style={{ background: '#f0fdf4', color: '#14532d', marginBottom: '10px', fontSize: '0.88rem' }}>
                      ⟳ VARIATIONS
                    </div>
                    <div className="tet-validation-grid">
                      {simulateResult.variations.map((v, i) => (
                        <div key={i} className="tet-validation-card">
                          <strong style={{ fontSize: '0.92em' }}>{v.label}</strong>
                          <p>{v.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Button — runs wobble evaluation */}
      <button
        className="tet-ai-button tet-ai-button--icon"
        onClick={handleWobbleEvaluate}
        disabled={wobbleLoading}
        title="Evaluate your entries for consistency and suggestions"
        style={{ width: '44px', height: '44px', right: '176px', background: 'transparent', padding: 0 }}
      >
        {wobbleLoading ? (
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>...</span>
        ) : (
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '38px', height: '38px' }}>
            {/* clipboard body */}
            <rect x="10" y="10" width="38" height="46" rx="4" ry="4" stroke="#222" strokeWidth="3.2" fill="white"/>
            {/* clipboard clip */}
            <rect x="22" y="6" width="14" height="8" rx="3" ry="3" stroke="#222" strokeWidth="3" fill="white"/>
            {/* check 1 */}
            <polyline points="16,22 19,26 25,19" stroke="#222" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            {/* line 1 */}
            <line x1="28" y1="22" x2="42" y2="22" stroke="#222" strokeWidth="2.8" strokeLinecap="round"/>
            {/* check 2 */}
            <polyline points="16,32 19,36 25,29" stroke="#222" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            {/* line 2 */}
            <line x1="28" y1="32" x2="42" y2="32" stroke="#222" strokeWidth="2.8" strokeLinecap="round"/>
            {/* check 3 */}
            <polyline points="16,42 19,46 25,39" stroke="#222" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            {/* line 3 */}
            <line x1="28" y1="42" x2="42" y2="42" stroke="#222" strokeWidth="2.8" strokeLinecap="round"/>
            {/* badge circle */}
            <circle cx="49" cy="49" r="12" fill="white" stroke="#222" strokeWidth="3"/>
            {/* badge check */}
            <polyline points="43,49 47,53 55,44" stroke="#222" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Simulate Button */}
      <button
        className="tet-ai-button tet-ai-button--icon"
        onClick={handleSimulate}
        disabled={simulateLoading}
        title="Generate a textual simulation of your data"
        style={{ width: '44px', height: '44px', right: '230px', background: 'transparent', padding: 0 }}
      >
        {simulateLoading ? (
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>...</span>
        ) : (
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '38px', height: '38px', marginLeft: '10px' }}>
            {/* outer orbital ring — horizontal ellipse */}
            <ellipse cx="32" cy="32" rx="28" ry="11" stroke="#222" strokeWidth="3" fill="none"/>
            {/* outer orbital ring — tilted ellipse (NW-SE) */}
            <ellipse cx="32" cy="32" rx="28" ry="11" stroke="#222" strokeWidth="3" fill="none" transform="rotate(60 32 32)"/>
            {/* outer orbital ring — tilted ellipse (NE-SW) */}
            <ellipse cx="32" cy="32" rx="28" ry="11" stroke="#222" strokeWidth="3" fill="none" transform="rotate(-60 32 32)"/>
            {/* cube — top face */}
            <polygon points="32,14 43,20 32,26 21,20" stroke="#222" strokeWidth="2.6" strokeLinejoin="round" fill="white"/>
            {/* cube — left face */}
            <polygon points="21,20 32,26 32,38 21,32" stroke="#222" strokeWidth="2.6" strokeLinejoin="round" fill="white"/>
            {/* cube — right face */}
            <polygon points="43,20 43,32 32,38 32,26" stroke="#222" strokeWidth="2.6" strokeLinejoin="round" fill="white"/>
          </svg>
        )}
      </button>

      {/* Video Button */}
      <button
        onClick={handleGenerateVideo}
        disabled={videoLoading}
        title="Generate a video animation using your data"
        style={{
          position: 'fixed', zIndex: 1000, bottom: '50px', right: '284px',
          width: '42px', height: '42px', borderRadius: '50%',
          background: '#222',
          border: 'none', cursor: videoLoading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: videoLoading ? 0.45 : 1,
          transition: 'transform 0.15s ease, opacity 0.15s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
        onMouseEnter={e => { if (!videoLoading) e.currentTarget.style.transform = 'translateY(-3px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
      >
        {videoLoading ? (
          <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>...</span>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="1.5" stroke="white" strokeWidth="2"/>
            <polygon points="9.5,8.5 9.5,15.5 16.5,12" fill="white"/>
          </svg>
        )}
      </button>

      {/* Share Simulation Button */}
      {username && (
        <button
          onClick={handleShareSim}
          disabled={shareLoading}
          title="Generate a link to share your simulation & animation"
          style={{
            position: 'fixed', zIndex: 1000, bottom: '50px', right: '128px',
            width: '38px', height: '38px', background: 'transparent', border: 'none',
            padding: 0, cursor: shareLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: shareLoading ? 0.45 : 1, transition: 'transform 0.15s ease, opacity 0.15s ease',
          }}
          onMouseEnter={e => { if (!shareLoading) e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
        >
          {shareLoading ? "..." : (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          )}
        </button>
      )}

      <button className="xlsx-button" onClick={handleXLSXClick} title="Spreadsheet view">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="3" y1="15" x2="21" y2="15"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
      </button>

      {/* XLSX Modal */}
      {isXlsxModalOpen && (
        <div className="ssh-modal-overlay">
          <div className="ssh-modal-content">
            <button className="close-button" onClick={() => setIsXlsxModalOpen(false)}>X</button>
            <table className="spreadsheet-table">
              <thead>
                <tr>{spreadsheetData[0].map((header, i) => <th key={i}>{header}</th>)}</tr>
              </thead>
              <tbody>
                {spreadsheetData.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        style={{
                          whiteSpace: "pre-wrap",
                          ...(cellIndex === 0 && { fontWeight: "bold", backgroundColor: "#f4f4f4" }),
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clear Button — only shown when a face is selected and button row is visible */}
      {selectedFaceIndex !== null && <button ref={trashRef} className="tet-clear-button" onClick={() => setShowClearConfirm(true)} title="Clear all data">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </button>}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="tet-clear-overlay">
          <div className="tet-clear-box">
            <p>Do you want to delete all of your data?</p>
            <div className="tet-clear-actions">
              <button className="tet-clear-yes" onClick={handleClearConfirm}>Yes</button>
              <button className="tet-clear-no" onClick={() => setShowClearConfirm(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      {/* Download Button */}
      <button className="download-button" onClick={handleDownloadClick} title="Download now">
        <img src="/images/buttons/downloadButton.jpg" alt="Download Button" className="download-image" />
      </button>

      {/* FOOTER */}
      <footer className="footer-bar">
        <div className="footer-left">{t("footer_left")}</div>
        <div className="footer-right">{t("footer_right")}</div>
      </footer>

      {/* Copy Link Toast */}
      <div style={{
        position: 'fixed', top: toastVisible ? '18px' : '-80px', left: '50%',
        transform: 'translateX(-50%)',
        background: '#1a2744', color: '#dce6f5',
        padding: '10px 20px', borderRadius: '10px',
        fontSize: '0.82em', fontWeight: 500,
        boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
        zIndex: 9999, maxWidth: '90vw', wordBreak: 'break-all', textAlign: 'center',
        transition: 'top 0.3s cubic-bezier(0.22,1,0.36,1)',
        pointerEvents: 'none',
      }}>
        {toastMessage}
      </div>
    </div>
  );
};

export default Cosmos;
