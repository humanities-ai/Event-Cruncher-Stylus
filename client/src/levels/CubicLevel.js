import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Link } from 'react-router-dom';
import logo from '../ECS_logo6.png';
import '../LandingPage.css';
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import "./CubicLevel.css";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const _texCache = new Map();


function makeLabeledFace(text, opts = {}) {
  const {
    size = 1024,
    bg = null,                // <- add this
    border = "#000000",
    borderWidth = 18,
    fontFamily =
      'Noto Sans, "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
    fontWeight = "700",
    maxFontPx = 200,
    minFontPx = 28,
    padding = 80,
    textColor = "#000000",
    lineHeight = 1.15,
    wrap = true,
  } = opts;
  const safeMin = Math.min(minFontPx, maxFontPx);

  const cacheKey = [
    text,
    size,
    bg,
    border,
    borderWidth,
    fontFamily,
    fontWeight,
    maxFontPx,
    minFontPx,
    padding,
    textColor,
    lineHeight,
    wrap,
  ].join("|");
  if (_texCache.has(cacheKey)) return _texCache.get(cacheKey);

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // transparent base
  ctx.clearRect(0, 0, size, size);

  // fill with bg if provided
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }

  // 🔹 Border
  if (borderWidth > 0) {
    ctx.strokeStyle = border;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(
      borderWidth / 2,
      borderWidth / 2,
      size - borderWidth,
      size - borderWidth
    );
  }
  const boxW = size - padding * 2;
  const boxH = size - padding * 2;

  let fontPx = maxFontPx;
  let lines = [];
  const fit = () => {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = textColor;
    ctx.font = `${fontWeight} ${fontPx}px ${fontFamily}`;
    if (!wrap) {
      lines = [text];
    } else {
      const chars = [...text];
      lines = [];
      let line = "";
      for (const ch of chars) {
        const tryLine = line + ch;
        if (ctx.measureText(tryLine).width <= boxW) line = tryLine;
        else {
          if (line) lines.push(line);
          line = ch;
        }
      }
      if (line) lines.push(line);
    }
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    const h = lines.length * fontPx * lineHeight;
    return w <= boxW && h <= boxH;
  };
  while (fontPx >= minFontPx && !fit()) fontPx -= 4;

  fit();
  while (fontPx > safeMin && !fit()) fontPx -= 4;

  const startY = size / 2 - ((lines.length - 1) * fontPx * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, size / 2, startY + i * fontPx * lineHeight));

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  _texCache.set(cacheKey, tex);
  return tex;
}


function makeFaceMaterial(label, { borderColor = "#000000" } = {}) {
  return new THREE.MeshBasicMaterial({
    map: makeLabeledFace(label, { border: borderColor }),
    transparent: true,   // use texture alpha
    opacity: 1,          // keep letters fully bold
    alphaTest: 0.01,     // discard almost-fully-transparent pixels
    side: THREE.DoubleSide,
  });
}


const CubicLevel = () => {
  const { t } = useTranslation();

  const containerRef = useRef(null);

  // Hacker Text
  const [hackText, setHackText] = useState("");
  useEffect(() => {
    const target = t("cubic_level_title");
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,<.>/?";
    let rafId;
    const start = performance.now();
    const duration = 2000;
    const scramble = (now) => {
      const prog = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(prog * target.length);
      let out = "";
      for (let i = 0; i < target.length; i++) {
        out += i < revealed || target[i] === " "
          ? target[i]
          : chars[Math.floor(Math.random() * chars.length)];
      }
      setHackText(out);
      if (revealed < target.length) rafId = requestAnimationFrame(scramble);
    };
    rafId = requestAnimationFrame(scramble);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]); // re-run if language changes

  // UI state
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(null);
  const [activeFaceIndex, setActiveFaceIndex] = useState(null);

  const [faceTexts, setFaceTexts] = useState({});
  const [inputText, setInputText] = useState("");
  const [faceFiles, setFaceFiles] = useState({});
  const [tempFaceFiles, setTempFaceFiles] = useState({});

  const [isDITextBoxVisible, setIsDITextBoxVisible] = useState(true);

  const [isCIModalOpen, setIsCIModalOpen] = useState(false);
  const [criteriaInstructions, setCriteriaInstructions] = useState({
    0: "", 1: "", 2: "", 3: "", 4: "", 5: "",
  });

  const [isXlsxModalOpen, setIsXlsxModalOpen] = useState(false);
  const [spreadsheetData, setSpreadsheetData] = useState([]);

  const faceTextsRef = useRef({});
  useEffect(() => {
    faceTextsRef.current = faceTexts;
  }, [faceTexts]);

  useEffect(() => {
    if (selectedFaceIndex !== null && faceTexts[selectedFaceIndex] !== undefined) {
      setInputText(faceTexts[selectedFaceIndex] || "");
    }
  }, [selectedFaceIndex, faceTexts]);

  // i18n label keys (source of truth)
  const faceKeys = ["who", "what", "when", "where", "why", "how"];

  // three.js refs shared across handlers
  const materialsRef = useRef([]);
  const cubeRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const activeFaceRef = useRef(null);
  const cubeHighlightLockedRef = useRef(false);

  // Fetch userId + data
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    const storedUserId = localStorage.getItem("loggedInUserId");
    if (storedUserId) {
      setUserId(storedUserId);
      fetchSavedData(storedUserId);
    } else {
      console.error("User ID not found in localStorage");
    }
  }, []);

  const fetchSavedData = async (userId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/avdata/${userId}`);
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
          const fileResponse = await fetch(`http://localhost:4000/api/avfiles/${userId}/${face}`);
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

  const fetchCriteriaInstructions = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/get-criteria");
      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
      const data = await response.json();
      setCriteriaInstructions({
        0: data.who_text || t("placeholder_none"),
        1: data.what_text || t("placeholder_none"),
        2: data.when_text || t("placeholder_none"),
        3: data.where_text || t("placeholder_none"),
        4: data.why_text || t("placeholder_none"),
        5: data.how_text || t("placeholder_none"),
      });
    } catch (error) {
      console.error("Error fetching criteria instructions:", error);
    }
  };
  useEffect(() => { fetchCriteriaInstructions(); }, []); // eslint-disable-line

  const toggleDITextBox = () => setIsDITextBoxVisible((v) => !v);
  useEffect(() => { setIsDITextBoxVisible(true); }, []);
  const toggleCIModal = () => setIsCIModalOpen((v) => !v);
  const handleCIChange = (faceIndex, value) =>
    setCriteriaInstructions((prev) => ({ ...prev, [faceIndex]: value }));

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

  useEffect(() => {
    const handleClick = (e) => {
      const btn = e.target.closest('.menu-button');
      const wrapper = e.target.closest('.topbar-right');
      document.querySelectorAll('.topbar-right').forEach(el => {
        if (el !== wrapper) el.classList.remove('open');
      });
      if (btn && wrapper) {
        wrapper.classList.toggle('open');
        btn.setAttribute('aria-expanded', wrapper.classList.contains('open'));
      } else {
        document.querySelectorAll('.topbar-right').forEach(el => el.classList.remove('open'));
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const scene = new THREE.Scene();
    const container = containerRef.current;

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(4, 4, 4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping; 
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0xffffff);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // geometry + materials (use i18n)
    const geometry = new THREE.BoxGeometry(3, 3, 3);
    const labels = faceKeys.map((k) => t(`cube_faces.${k}`));
    const mats = labels.map((label) => makeFaceMaterial(label, { borderColor: "#000000" }));
    materialsRef.current = mats;

    const cube = new THREE.Mesh(geometry, mats);
    scene.add(cube);
    cubeRef.current = cube;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // --- Smooth camera tween state ---
    let isTweening = false;
    let tweenStart = null;
    const tweenDuration = 1000; // ms

    const startCamPos = new THREE.Vector3();
    const endCamPos = new THREE.Vector3();
    const startTarget = new THREE.Vector3();
    const endTarget = new THREE.Vector3();

    // --- Track user rotation + face normals ---
    let isUserRotating = false;

    // Local-space normals for each cube face: [right, left, top, bottom, front, back]
    const faceNormals = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];

    const cubeCenter = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    const tmpNormal = new THREE.Vector3();



    controls.addEventListener("start", () => {
      // User grabbed the cube → stop auto camera tween & exit focus mode
      isTweening = false;
      tweenStart = null;
      isUserRotating = true;

      if (cubeHighlightLockedRef.current) {
        cubeHighlightLockedRef.current = false;
        resetFaceTextures();  // restore all labels fully visible, only active red
      }
    });

    // When user stops interacting, stop fading and restore face opacity
    controls.addEventListener("end", () => {
      isUserRotating = false;
      // materialsRef.current.forEach((mat) => {
      //   if (!mat) return;
      //   mat.opacity = 1.0;
      // });
    });


    // raycaster selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const faceMap = [0, 1, 2, 3, 4, 5];

    // top 3 faces = fully visible, others = slightly transparent
    const updateFaceOpacityAroundCamera = () => {
      const cube = cubeRef.current;
      if (!cube || !camera || !materialsRef.current.length) return;

      // Direction from cube center to camera
      cube.getWorldPosition(cubeCenter);
      camera.getWorldPosition(camPos);
      const viewDir = camPos.sub(cubeCenter).normalize();

      // Compute dot products (how much each face faces the camera)
      const faceDots = faceNormals.map((localNormal, idx) => {
        tmpNormal.copy(localNormal).applyQuaternion(cube.quaternion); // to world space
        const dot = tmpNormal.dot(viewDir); // larger dot = more facing the camera
        return { idx, dot };
      });

      // Sort faces by "facingness" (most facing camera first)
      faceDots.sort((a, b) => b.dot - a.dot);

      // Take top 3 faces as "direct view"
      const visibleSet = new Set(faceDots.slice(0, 3).map((f) => f.idx));

      // Apply opacity: visible faces fully opaque, others slightly transparent
      materialsRef.current.forEach((mat, i) => {
        if (!mat) return;
        mat.transparent = true;
        mat.opacity = visibleSet.has(i) ? 1.0 : 0.25; // tweak 0.25 if you want more/less fade
      });
    };



  
    const setFaceBorder = (faceIdx, borderColor, textColor = "#000000") => {
      const label = t(`cube_faces.${faceKeys[faceIdx]}`);
      const mat = materialsRef.current[faceIdx];
      if (!mat) return;

      const oldMap = mat.map;
      mat.map = makeLabeledFace(label, {
        border: borderColor,
        textColor,
        maxFontPx: 200,
        minFontPx: 28,
      });
      mat.needsUpdate = true;
      if (oldMap) oldMap.dispose();
    };

    const resetFaceTextures = (currentFaceIndex) => {
      materialsRef.current.forEach((mat, i) => {
        if (!mat) return;

        // restore full opacity on every face
        mat.transparent = true;
        mat.opacity = 1.0;

        // restore normal black border on non-active faces
        if (i !== currentFaceIndex) {
          setFaceBorder(i, "#000000");
        }
      });
    };


    // Initialize the faces in baseline state
    resetFaceTextures();

    const handleMouseClick = (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(cube);

  if (intersects.length > 0) {
    const intersection = intersects[0];

    const triangleIndex = Math.floor(intersection.faceIndex / 2);
    const faceIndex = faceMap[triangleIndex];

    if (faceIndex >= 0 && faceIndex < materialsRef.current.length) {
      // --- 1. Enter "focus" mode ---
      cubeHighlightLockedRef.current = true;

      // --- 2. Compute camera target position in front of clicked face ---
      const worldNormal = intersection.face.normal
        .clone()
        .transformDirection(cube.matrixWorld)
        .normalize();

      const cubeCenter = new THREE.Vector3();
      cube.getWorldPosition(cubeCenter);

      const distance = 8; // distance away from the face
      const newCamPos = cubeCenter.clone().add(worldNormal.multiplyScalar(distance));

      // set up tween from current camera/target to new ones
      startCamPos.copy(camera.position);
      endCamPos.copy(newCamPos);
      startTarget.copy(controls.target);
      endTarget.copy(cubeCenter);
      isTweening = true;
      tweenStart = null;

      // --- 3. Face visuals ---
materialsRef.current.forEach((mat, i) => {
  if (!mat) return;

  // materials always stay fully opaque so the cube is still visible
  mat.transparent = true;
  mat.opacity = 1.0;

  if (i === faceIndex) {
    // Focused face: strong red border, solid text
    setFaceBorder(i, "#ff2b2b", "#000000");
  } else {
    // Other faces: slightly transparent border + very faint text
    // This keeps the cube outline visible without strong black spikes
    setFaceBorder(i, "rgba(0,0,0,0.0115)", "rgba(0,0,0,0.05)");
  }
});


      // --- 4. React state wiring ---
      setActiveFaceIndex(faceIndex);
      activeFaceRef.current = faceIndex;
      setSelectedFaceIndex(faceIndex);

      setInputText(() => {
        const texts = faceTextsRef.current;
        return texts?.[faceIndex] || "";
      });
    }
  }
};

    renderer.domElement.addEventListener("click", handleMouseClick);



    const animate = (time) => {
      requestAnimationFrame(animate);

      // Smooth tween toward endCamPos / endTarget if in focus mode
      if (isTweening) {
        if (tweenStart === null) tweenStart = time;
        const t = Math.min(1, (time - tweenStart) / tweenDuration);

        camera.position.lerpVectors(startCamPos, endCamPos, t);
        controls.target.lerpVectors(startTarget, endTarget, t);

        if (t >= 1) {
          isTweening = false;
          tweenStart = null;
        }
      }

      // 🔹 Always keep less-visible faces slightly transparent
      //     as long as we are NOT in a focused (clicked) state
      if (!cubeHighlightLockedRef.current) {
        updateFaceOpacityAroundCamera();
      }

      controls.update();
      renderer.render(scene, camera);
    };

    requestAnimationFrame(animate);


    // resize
    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // respond to language change
    const onLang = () => {
      const currentActive = activeFaceRef.current;
      if (cubeHighlightLockedRef.current) {
        // 🔹 Reapply locked state: active face transparent, others opaque
        materialsRef.current.forEach((_, i) => {
          if (i === currentActive) {
            setFaceBorder(i, "#ff2b2b", "#000000");
          } else {
            setFaceBorder(i, "#rgba(0,0,0,0.01)", "rgba(0,0,0,0.01)");
          }
        });
      } else {
        // 🔹 Baseline transparent state
        resetFaceTextures();
      }
    };
    i18n.on("languageChanged", onLang);

    // cleanup
    return () => {
      i18n.off("languageChanged", onLang);
      renderer.domElement.removeEventListener("click", handleMouseClick);
      window.removeEventListener("resize", handleResize);
      if (cube.geometry) cube.geometry.dispose();
      materialsRef.current.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
      renderer.dispose();
      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
    // re-run when texts used on faces change (rare)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]); // rebuild face textures if language changes (t reference)

  // keep ref in sync
  useEffect(() => {
    activeFaceRef.current = activeFaceIndex;
  }, [activeFaceIndex]);

  // handle face click from other UI (kept for compatibility)
  const handleFaceClick = (faceIndex) => {
    setSelectedFaceIndex(faceIndex);
    setInputText(faceTexts[faceIndex] || "");
  };

  // SAVE (also reset active face border to black)
  const handleSave = async () => {
    if (!userId || selectedFaceIndex === null) {
      console.error("Error: User ID or selected face is missing.");
      return;
    }
    const face = faceKeys[selectedFaceIndex];
    const textColumn = `${face}_text`;

    await fetch("http://localhost:4000/api/avdata/update", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        face: textColumn,
        text: inputText || "",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const selectedFiles = tempFaceFiles[selectedFaceIndex]?.pending || [];
    if (selectedFiles.length > 0) {
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("face", face);
      selectedFiles.forEach((file) => formData.append("files", file));
      await fetch("http://localhost:4000/api/avfiles/upload", {
        method: "POST",
        body: formData,
      });
    }

    fetchSavedData(userId);

    // reset selected face to black border
    const mat = materialsRef.current[selectedFaceIndex];
    if (mat) {
      const label = t(`cube_faces.${faceKeys[selectedFaceIndex]}`);
      const oldMap = mat.map;
      mat.map = makeLabeledFace(label, { border: "#000000", maxFontPx: 200 });
      mat.needsUpdate = true;
      if (oldMap) oldMap.dispose();
    }

    setInputText("");
    setActiveFaceIndex(null);
    activeFaceRef.current = null;
    setSelectedFaceIndex(null);
    setIsDITextBoxVisible(true);
  };

  const handleSaveCriteria = async () => {
    if (userId !== "1") {
      console.error("Unauthorized: Only admin (userId = 1) can save criteria.");
      return;
    }
    const faceColumns = ["who_text", "what_text", "when_text", "where_text", "why_text", "how_text"];
    const faceColumn = faceColumns[selectedFaceIndex];
    if (!faceColumn) return;

    try {
      const response = await fetch("http://localhost:4000/api/update-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          face: faceColumn,
          text: criteriaInstructions[selectedFaceIndex] || "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`Server Error: ${data.error || "Unknown error"}`);
      toggleCIModal();
    } catch (error) {
      console.error("Error saving criteria:", error);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0 && selectedFaceIndex !== null) {
      setTempFaceFiles((prev) => {
        const currentPending = prev[selectedFaceIndex]?.pending || [];
        const updatedPending = [...currentPending, ...files];
        return {
          ...prev,
          [selectedFaceIndex]: {
            saved: prev[selectedFaceIndex]?.saved || [],
            pending: updatedPending,
          },
        };
      });
      const newFileNames = files.map((file) => `• ${file.name}`).join("\n");
      setInputText((prevText) => (prevText ? `${prevText}\n${newFileNames}` : newFileNames));
    }
  };

  const handleDeleteFile = async (faceIndex, fileIndex, type) => {
    if (!userId) {
      console.error("Error: No user ID found.");
      return;
    }
    const fileToRemove =
      type === "saved"
        ? faceFiles[faceIndex]?.saved[fileIndex]
        : tempFaceFiles[faceIndex]?.pending[fileIndex];

    const fileId = fileToRemove?.id;
    try {
      if (type === "saved" && fileId) {
        const response = await fetch(`http://localhost:4000/api/avfiles/delete/${fileId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Unknown error");
        }
      }
      const fileNameToRemove = fileToRemove?.name;
      setFaceFiles((prev) => {
        const updated = { ...prev };
        if (updated[faceIndex]) {
          updated[faceIndex].saved = (updated[faceIndex].saved || []).filter((_, i) => {
            return !(type === "saved" && i === fileIndex);
          });
        }
        return updated;
      });
      setTempFaceFiles((prev) => {
        const updated = { ...prev };
        if (updated[faceIndex]) {
          updated[faceIndex].pending = (updated[faceIndex].pending || []).filter((_, i) => {
            return !(type === "pending" && i === fileIndex);
          });
        }
        return updated;
      });
      if (fileNameToRemove) {
        setInputText((prevText) =>
          prevText
            .split("\n")
            .filter((line) => !line.includes(fileNameToRemove))
            .join("\n")
        );
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const formatText = (command) => {
    const textarea = document.getElementById("text-area");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const textBefore = inputText.substring(0, start);
    const textAfter = inputText.substring(end);
    const currentLine = textBefore.split("\n").pop();

    const lines = inputText.split("\n");
    const lineIndex = lines.length - 1;
    let newText = inputText;

    switch (command) {
      case "bullet":
        if (currentLine.startsWith("•")) {
          lines[lineIndex] = currentLine.substring(2);
        } else {
          lines[lineIndex] = `• ${currentLine.trim()}`;
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
      const newText = currentLine.trim().startsWith("•")
        ? `${textBefore}\n• ${textAfter}`
        : `${textBefore}\n${textAfter}`;
      setInputText(newText);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 3;
      }, 0);
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

    const spreadsheetData = [["", ...faceLabels]];
    const textRow = [t("text_label"), ...faceKeys.map((_, i) => faceTexts[i] || "")];
    const filesRow = [
      t("files_label"),
      ...faceKeys.map((_, i) => {
        const { saved = [] } = faceFiles[i] || {};
        return saved.map((file) => file.name).join(", \n");
      }),
    ];
    spreadsheetData.push(textRow, filesRow);

    const worksheet = XLSX.utils.aoa_to_sheet(spreadsheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cube Data");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    zip.file("CubeData.xlsx", excelBuffer);

    for (let i = 0; i < 6; i++) {
      const { saved = [] } = faceFiles[i] || {};
      for (const file of saved) {
        try {
          const response = await fetch(file.url);
          if (!response.ok) throw new Error(`Failed to fetch ${file.name}`);
          const arrayBuffer = await response.arrayBuffer();
          zip.file(file.name, arrayBuffer, { binary: true });
        } catch (error) {
          console.error(`Error fetching file ${file.name}:`, error);
        }
      }
    }
    zip.generateAsync({ type: "blob" }).then((content) => saveAs(content, "CubeDataFolder.zip"));
  };

  return (
    <div className="cubic-level">
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
            <Link to="/" className="menu-item" role="menuitem">{t('start_page_label')}</Link>
            <Link to="/landing-page" className="menu-item" role="menuitem">{t('landing_page_label')}</Link>
            <Link to="/login" className="menu-item" role="menuitem">{t('login_button')}</Link>
            <Link to="/create-account" className="menu-item" role="menuitem">{t('create_account_button')}</Link>
          </nav>
        </div>
      </header>

      <h1 className="cubic-level-title">{hackText}</h1>
      <div ref={containerRef} className="cubic-level-container"></div>

      {/* Default Instructions Text Box */}
      {isDITextBoxVisible && (
        <div className="text-input-overlay">
          <h2 className="face-label"></h2>
          <textarea className="di-textbox" readOnly value={t("cubic_level_instructions")} />
        </div>
      )}

      {/* XLSX Button */}
      <button className="xlsx-button" onClick={handleXLSXClick}>
        <img src="/images/buttons/excelButton.jpg" alt="XLSX Button" className="xlsx-image" />
      </button>

      {/* XLSX Modal */}
      {isXlsxModalOpen && (
        <div className="ssh-modal-overlay">
          <div className="ssh-modal-content">
            <button className="close-button" onClick={() => setIsXlsxModalOpen(false)}>
              X
            </button>
            <table className="spreadsheet-table">
              <thead>
                <tr>
                  {spreadsheetData[0].map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spreadsheetData.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        style={{
                          whiteSpace: "pre-wrap",
                          ...(cellIndex === 0 && {
                            fontWeight: "bold",
                            backgroundColor: "#f4f4f4",
                          }),
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

      {/* Download Button */}
      <button className="download-button" onClick={handleDownloadClick}>
        <img src="/images/buttons/downloadButton.jpg" alt="Download Button" className="download-image" />
      </button>

      {/* Text Box */}
      {selectedFaceIndex !== null && (
        <div className="text-input-overlay">
          {/* Criteria Instructions Button */}
          <button className="ci-button" onClick={toggleCIModal}>
            ✱
          </button>

          <h2 className="face-label">
            {t(`cube_faces.${faceKeys[selectedFaceIndex]}`)} ?
          </h2>

          <div className="text-area-container">
            <textarea
              id="text-area"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("placeholder_t")}
            ></textarea>

            <div className="file-list">
              {/* Saved Files */}
              {faceFiles[selectedFaceIndex]?.saved.map((file, index) => (
                <div key={`saved-${index}`} className="file-item">
                  <button
                    className="delete-file-button"
                    onClick={() => handleDeleteFile(selectedFaceIndex, index, "saved")}
                  >
                    X
                  </button>
                  <span>{file.name}</span>
                </div>
              ))}

              {/* Unsaved (Pending) Files */}
              {tempFaceFiles[selectedFaceIndex]?.pending.map((file, index) => (
                <div key={`pending-${index}`} className="file-item pending">
                  <button
                    className="delete-file-button"
                    onClick={() => handleDeleteFile(selectedFaceIndex, index, "pending")}
                  >
                    X
                  </button>
                  <span>{file.name} (unsaved)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bullet Points Button */}
          <button className="bullet-button" onClick={() => formatText("bullet")}>
            <img src="/images/buttons/bulletpoint.jpg" alt="Bullet Point" className="bullet-image" />
          </button>

          {/* Upload & Save */}
          <div className="button-container">
            <label className="upload-button">
              <input type="file" onChange={handleFileUpload} style={{ display: "none" }} multiple />
              {t("insert_files_button")}
            </label>
            <button onClick={handleSave} className="save-button">
              {t("save_button")}
            </button>
          </div>
        </div>
      )}

      {/* Criteria Instructions Modal */}
      {isCIModalOpen && (
        <div className="ci-modal-overlay">
          <div className="ci-modal-content">
            <button className="close-button" onClick={toggleCIModal}>
              X
            </button>

            <h2 className="ci-modal-face-label">
              {t("criteria_instructions_t")} {t(`cube_faces.${faceKeys[selectedFaceIndex]}`)}
            </h2>

            <textarea
              className="ci-textbox"
              value={criteriaInstructions[selectedFaceIndex] || ""}
              onChange={(e) => {
                if (userId === "1") handleCIChange(selectedFaceIndex, e.target.value);
              }}
              readOnly={userId !== "1"}
              placeholder={t("placeholder_none")}
              ref={(textarea) => {
                if (textarea) {
                  textarea.style.height = "auto";
                  const newHeight = textarea.scrollHeight;
                  const maxHeight = parseInt(
                    window.getComputedStyle(textarea).getPropertyValue("max-height"),
                    10
                  );
                  if (newHeight > maxHeight) {
                    textarea.style.height = `${maxHeight}px`;
                    textarea.style.overflowY = "auto";
                  } else {
                    textarea.style.height = `${newHeight}px`;
                    textarea.style.overflowY = "hidden";
                  }
                }
              }}
            ></textarea>

            {userId === "1" && (
              <button className="ci-save-button" onClick={handleSaveCriteria}>
                {t("save_button")}
              </button>
            )}
          </div>
        </div>
      )}
    {/* FOOTER BAR */}
    <footer className="footer-bar">
      <div className="footer-left">{t('footer_left')}</div>
      <div className="footer-right">{t('footer_right')}</div>
    </footer>
  </div>
  );
};

export default CubicLevel;
