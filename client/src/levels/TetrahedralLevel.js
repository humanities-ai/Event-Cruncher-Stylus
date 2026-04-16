import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Link } from "react-router-dom";
import logo from "../ECS_logo6.png";
import "../LandingPage.css";
import * as THREE from "three";
import "./TetrahedralLevel.css";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

// ─── TEXTURE CACHE ────────────────────────────────────────────────────────────
const _texCache = new Map();

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
const TetrahedralLevel = () => {
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

  const faceTextsRef = useRef({});
  useEffect(() => { faceTextsRef.current = faceTexts; }, [faceTexts]);

  const buttonRowRef = useRef(null);
  const trashRef = useRef(null);

  useEffect(() => {
    if (!buttonRowRef.current || !trashRef.current) return;
    const sync = () => {
      const rect = buttonRowRef.current.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      trashRef.current.style.top = `${center - 22}px`;
      trashRef.current.style.bottom = "auto";
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [selectedFaceIndex]);

  useEffect(() => {
    if (selectedFaceIndex !== null && faceTexts[selectedFaceIndex] !== undefined) {
      setInputText(faceTexts[selectedFaceIndex] || "");
    }
  }, [selectedFaceIndex, faceTexts]);

  useEffect(() => {
    setValidationResult(null);
    setValidationError("");
    setIsValidationModalOpen(false);
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
    } else {
      console.error("User ID not found in localStorage");
    }
  }, []); // eslint-disable-line

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
      <div ref={containerRef} className="tetrahedral-level-container" />

      {/* Default Instructions Text Box */}
      {isDITextBoxVisible && (
        <div className="text-input-overlay">
          <textarea className="di-textbox" readOnly value={t("cubic_level_instructions")} />
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

          {/* ECS Sector Buttons */}
          <div className="tet-sector-grid">
            <button className="tet-sector-btn" onClick={() => handleSector(1)}>
              <span className="tet-s-num">Sector 1</span>
              <span className="tet-s-lbl">Long description</span>
            </button>
            <button className="tet-sector-btn" onClick={() => handleSector(2)}>
              <span className="tet-s-num">Sector 2</span>
              <span className="tet-s-lbl">Brief description</span>
            </button>
            <button className="tet-sector-btn" onClick={() => handleSector(3)}>
              <span className="tet-s-num">Sector 3</span>
              <span className="tet-s-lbl">Consistency check</span>
            </button>
            <button className="tet-sector-btn" onClick={() => handleSector(4)}>
              <span className="tet-s-num">Sector 4</span>
              <span className="tet-s-lbl">Reset &amp; reactivate</span>
            </button>
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

      {/* XLSX Button */}
      <button
        className="tet-ai-button"
        onClick={handleValidateFace}
        title={selectedFaceIndex !== null ? "AI face check" : "Select a face first"}
        disabled={selectedFaceIndex === null || validationLoading}
      >
        {validationLoading ? "..." : "AI"}
      </button>

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
      <button className="download-button" onClick={handleDownloadClick}>
        <img src="/images/buttons/downloadButton.jpg" alt="Download Button" className="download-image" />
      </button>

      {/* FOOTER */}
      <footer className="footer-bar">
        <div className="footer-left">{t("footer_left")}</div>
        <div className="footer-right">{t("footer_right")}</div>
      </footer>
    </div>
  );
};

export default TetrahedralLevel;
