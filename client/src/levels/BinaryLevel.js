// import React, { useEffect, useRef, useState } from "react";
// import { Link, useNavigate } from 'react-router-dom';
// import * as THREE from "three";
// import { EdgesGeometry, LineSegments, LineBasicMaterial } from "three";
// import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
// import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
// import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
// import "./BinaryLevel.css";

// export default function DisplayPage() {
//   const mountRef = useRef(null);
//   const [hackText, setHackText] = useState("");
//   const navigate = useNavigate();

//   useEffect(() => {
//     const mount = mountRef.current;

//     // Renderer
//     const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     mount.appendChild(renderer.domElement);

//     // Scene & Camera
//     const scene = new THREE.Scene();
//     const camera = new THREE.PerspectiveCamera(
//       50,
//       window.innerWidth / window.innerHeight,
//       0.1,
//       1000
//     );
//     camera.position.set(0, 0, 10);

//     // Lights
//     scene.add(new THREE.AmbientLight(0xffffff, 0.9));
//     const key = new THREE.DirectionalLight(0xffffff, 0.8);
//     key.position.set(3, 4, 5);
//     scene.add(key);

//     // Groups (decouple octa from the inner stack)
//     const innerGroup = new THREE.Group();
//     const triGroup = new THREE.Group();
//     const cubeGroup = new THREE.Group();

//     // Inner stack root
//     const innerRoot = new THREE.Group();
//     scene.add(innerRoot);
//     innerRoot.add(cubeGroup);
//     cubeGroup.add(triGroup);
//     triGroup.add(innerGroup);

//     // Octa "precession rig"
//     const octaPrecessionPivot = new THREE.Group(); // rotates around world up
//     const octaTiltGroup = new THREE.Group();       // constant tilt (nutation optional)
//     const octaSpinGroup = new THREE.Group();       // spins around its own tilted axis

//     scene.add(octaPrecessionPivot);
//     octaPrecessionPivot.add(octaTiltGroup);
//     octaTiltGroup.add(octaSpinGroup);


//     // Colors
//     const BLUE = 0x88bbff; // Octahedron
//     const GREEN = 0x2e8b57; // Cube
//     const SKY = 0x114ddd; // Triangle
//     const WHITE = 0xffffff; // Plane

//     // Plane
//     const planeGeom = new THREE.PlaneGeometry(1.2, 0.18);
//     const planeMat = new THREE.MeshBasicMaterial({
//       color: WHITE,
//       transparent: true,
//       opacity: 0.15,
//       side: THREE.DoubleSide,
//     });
//     const plane = new THREE.Mesh(planeGeom, planeMat);
//     plane.rotation.z = Math.PI / 12;
//     innerGroup.add(plane);

//     // Triangle
//     const triGeom = new THREE.CircleGeometry(1.0, 3);
//     triGeom.rotateZ(Math.PI / 2);
//     const triMat = new THREE.MeshBasicMaterial({
//       color: SKY,
//       transparent: true,
//       opacity: 0.25,
//       side: THREE.DoubleSide,
//     });
//     const triMesh = new THREE.Mesh(triGeom, triMat);
//     triGroup.add(triMesh);

//     // const triEdges = new LineSegments(
//     //   new EdgesGeometry(triGeom),
//     //   new LineBasicMaterial({ color: SKY, linewidth: 5 })
//     // );
//     // triGroup.add(triEdges);
//     // Triangle edges (thick lines)
//     const triEdgesGeom = new EdgesGeometry(triGeom);
//     const triFatGeom = new LineSegmentsGeometry().fromEdgesGeometry(triEdgesGeom);

//     const triEdgeMat = new LineMaterial({
//       color: BLUE,
//       linewidth: 2, // thickness in screen space-ish units; tweak 0.002–0.01
//       transparent: true,
//       opacity: 0.8,
//     });
//     triEdgeMat.resolution.set(window.innerWidth, window.innerHeight);

//     const triEdges = new LineSegments2(triFatGeom, triEdgeMat);
//     // prevent z-fighting with transparent surfaces
//     triEdgeMat.depthTest = false;
//     triEdgeMat.depthWrite = false;
//     triEdges.renderOrder = 999;

//     triGroup.add(triEdges);

//     function makeTextTexture(word, {
//       size = 512,
//       font = "bold 140px Arial",
//       textColor = "#000",
//       bg = "rgba(255,255,255,0.0)", // transparent
//       rotate = 0,                   // radians
//     } = {}) {
//       const canvas = document.createElement("canvas");
//       canvas.width = size;
//       canvas.height = size;

//       const ctx = canvas.getContext("2d");
//       ctx.clearRect(0, 0, size, size);

//       // optional background (keep transparent like your cube)
//       if (bg && bg !== "transparent") {
//         ctx.fillStyle = bg;
//         ctx.fillRect(0, 0, size, size);
//       }

//       ctx.save();
//       ctx.translate(size / 2, size / 2);
//       ctx.rotate(rotate);

//       ctx.font = font;
//       ctx.fillStyle = textColor;
//       ctx.textAlign = "center";
//       ctx.textBaseline = "middle";
//       ctx.fillText(word, 0, 0);

//       ctx.restore();

//       const tex = new THREE.CanvasTexture(canvas);
//       tex.needsUpdate = true;
//       tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
//       return tex;
//     }



//     // Cube
//     const cubeGeom = new THREE.BoxGeometry(2.5, 2.5, 2.5);

//     // Face order: +X, -X, +Y, -Y, +Z, -Z
//     const labels = ["Who", "Why", "When", "How", "What", "Where"];

//     // Optional per-face rotation (so text reads upright on more faces)
//     const faceRot = [
//       0,                // +X
//       0,                // -X
//       Math.PI,          // +Y (top)
//       0,                // -Y (bottom)
//       0,                // +Z (front)
//       0,                // -Z (back)
//     ];

//     const cubeMats = labels.map((word, i) => {
//       const tex = makeTextTexture(word, { rotate: faceRot[i] });

//       const mat = new THREE.MeshBasicMaterial({
//         map: tex,
//         color: GREEN,        // tint (keeps your green cube vibe)
//         transparent: true,
//         opacity: 0.6,
//         side: THREE.DoubleSide,
//       });

//       // helps transparency behave better
//       mat.depthWrite = false;
//       return mat;
//     });

//     const cube = new THREE.Mesh(cubeGeom, cubeMats);
//     cubeGroup.add(cube);


//     const cubeEdgesGeom = new EdgesGeometry(cubeGeom);
//     const cubeFatGeom = new LineSegmentsGeometry().fromEdgesGeometry(cubeEdgesGeom);

//     const cubeEdgeMat = new LineMaterial({
//       color: GREEN,
//       linewidth: 2,
//       transparent: true,
//       opacity: 0.5,
//     });
//     cubeEdgeMat.resolution.set(window.innerWidth, window.innerHeight);

//     const cubeEdges = new LineSegments2(cubeFatGeom, cubeEdgeMat);
//     cubeEdgeMat.depthTest = false;
//     cubeEdgeMat.depthWrite = false;
//     cubeEdges.renderOrder = 998;

//     cubeGroup.add(cubeEdges);

//     // Octahedron
//     const octaGeom = new THREE.OctahedronGeometry(3.8);
//     const octaMat = new THREE.MeshBasicMaterial({
//       color: BLUE,
//       transparent: true,
//       opacity: 0.15,
//       side: THREE.DoubleSide,
//     });
//     const octa = new THREE.Mesh(octaGeom, octaMat);

//     // Edges (make sure this is defined; it is referenced later)
//     const octaEdgesGeom = new EdgesGeometry(octaGeom);
//     const octaFatGeom = new LineSegmentsGeometry().fromEdgesGeometry(octaEdgesGeom);

//     const octaEdgeMat = new LineMaterial({
//       color: BLUE,
//       linewidth: 2,
//       transparent: true,
//       opacity: 0.85,
//     });
//     octaEdgeMat.resolution.set(window.innerWidth, window.innerHeight);

//     const octaEdges = new LineSegments2(octaFatGeom, octaEdgeMat);
//     octaEdgeMat.depthTest = false;
//     octaEdgeMat.depthWrite = false;
//     octaEdges.renderOrder = 997;

//     // Add octa + edges to the precession rig (spin group) to the precession rig (spin group)
//     octaSpinGroup.add(octa);
//     octaSpinGroup.add(octaEdges);

//     // Animation
//     const clock = new THREE.Clock();
//     let frameId;
//     const animate = () => {
//       const t = clock.getElapsedTime();

//       innerGroup.rotation.z = t * 1.8;
//       triGroup.rotation.z = -t * 0.9;
//       cubeGroup.rotation.y = t * 0.6;
//       cubeGroup.rotation.x = t * 0.2;
//       // octaGroup.rotation.z = -t * 0.35;
//       // octaGroup.rotation.x = Math.sin(t * 0.25) * 0.15;
//       // --- Octa precession settings ---
//       const TILT = Math.PI / 8;          // ~22.5° tilt
//       const SPIN_RATE = 0.9;             // fast spin around its own axis
//       const PRECESS_RATE = 0.18;         // slow sweep of the axis around world up
//       const NUTATION = 0.05;             // tiny wobble amplitude (optional)

//       // If you want it to precess in a full circle (like the GIF):
//       octaPrecessionPivot.rotation.y = t * PRECESS_RATE;

//       // If you want “not completely around” (limited back-and-forth), use this instead:
//       // const MAX_SWEEP = Math.PI / 5; // 36° each side
//       // octaPrecessionPivot.rotation.y = Math.sin(t * PRECESS_RATE) * MAX_SWEEP;

//       // Tilt the spin axis (plus a subtle wobble)
//       octaTiltGroup.rotation.x = TILT + Math.sin(t * 0.8) * NUTATION;

//       // Spin around the *tilted* axis
//       octaSpinGroup.rotation.y = t * SPIN_RATE;


//       renderer.setSize(window.innerWidth, window.innerHeight);
//       camera.aspect = window.innerWidth / window.innerHeight;
//       camera.updateProjectionMatrix();

//       renderer.render(scene, camera);
//       frameId = requestAnimationFrame(animate);
//     };
//     frameId = requestAnimationFrame(animate);

//     // Resize
//     const onResize = () => {
//       renderer.setSize(window.innerWidth, window.innerHeight);
//       camera.aspect = window.innerWidth / window.innerHeight;
//       camera.updateProjectionMatrix();
//     };
//     window.addEventListener("resize", onResize);

//     // Cleanup
//     return () => {
//       cancelAnimationFrame(frameId);
//       window.removeEventListener("resize", onResize);
//       renderer.dispose();
//       mount.removeChild(renderer.domElement);

//       [planeGeom, triGeom, cubeGeom, octaGeom].forEach((g) => g.dispose());
//       [
//         plane.material,
//         triMat,
//         ...cubeMats,
//         octaMat,
//         triEdges.material,
//         cubeEdges.material,
//         octaEdges?.material,
//       ].filter(Boolean).forEach((m) => m.dispose());

//     };
//   }, []);

//   return (
//     <div className="display-page">
//       <div className="hack-overlay">
//         <span className="hack-text">{hackText}</span>
//       </div>
//       <div ref={mountRef} className="canvas-holder" />
//     </div>
//   );
// }


import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { EdgesGeometry } from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import "./BinaryLevel.css";

export default function DisplayPage() {
  const mountRef = useRef(null);
  const [hackText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 10);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(3, 4, 5);
    scene.add(key);

    // Groups (decouple octa from the inner stack)
    const innerGroup = new THREE.Group();
    const triGroup = new THREE.Group();
    const cubeGroup = new THREE.Group();

    // Inner stack root
    const innerRoot = new THREE.Group();
    scene.add(innerRoot);
    innerRoot.add(cubeGroup);
    cubeGroup.add(triGroup);
    triGroup.add(innerGroup);

    // Octa "precession rig"
    const octaPrecessionPivot = new THREE.Group(); // rotates around world up
    const octaTiltGroup = new THREE.Group();       // constant tilt (nutation optional)
    const octaSpinGroup = new THREE.Group();       // spins around its own tilted axis

    scene.add(octaPrecessionPivot);
    octaPrecessionPivot.add(octaTiltGroup);
    octaTiltGroup.add(octaSpinGroup);

    // Colors
    const BLUE = 0x88bbff;  // Octahedron
    const GREEN = 0x2e8b57; // Cube
    const SKY = 0x114ddd;   // Triangle
    const WHITE = 0xffffff; // Plane

    // -------------------------
    // Helpers: fat line material
    // -------------------------
    const makeFatLineMaterial = (color, linewidthPx, opacity) => {
      const mat = new LineMaterial({
        color,
        linewidth: 3, // pixels (worldUnits=false by default)
        transparent: opacity < 1,
        opacity,
      });
      mat.resolution.set(window.innerWidth, window.innerHeight);
      // Prevent z-fighting with transparent surfaces
      mat.depthTest = false;
      mat.depthWrite = false;
      return mat;
    };

    // -------------------------
    // Helpers: text texture (transparent BG)
    // -------------------------
    const labelMats = []; // for cleanup
    const labelPlanes = []; // for cleanup

    function makeTextTextureTransparent(word, {
      size = 512,
      font = "bold 140px Arial",
      textColor = "#000000",
      rotate = 0,
    } = {}) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(rotate);
      ctx.font = font;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(word, 0, 0);
      ctx.restore();

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    }

    // -------------------------
    // Plane (inner)
    // -------------------------
    const planeGeom = new THREE.PlaneGeometry(1.2, 0.18);
    const planeMat = new THREE.MeshBasicMaterial({
      color: WHITE,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    plane.rotation.z = Math.PI / 12;
    innerGroup.add(plane);

    // -------------------------
    // Triangle
    // -------------------------
    const triGeom = new THREE.CircleGeometry(1.0, 3);
    triGeom.rotateZ(Math.PI / 2);

    const triMat = new THREE.MeshBasicMaterial({
      color: SKY,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const triMesh = new THREE.Mesh(triGeom, triMat);
    triGroup.add(triMesh);

    // Triangle edges (thick)
    const triEdgesGeom = new EdgesGeometry(triGeom);
    const triFatGeom = new LineSegmentsGeometry().fromEdgesGeometry(triEdgesGeom);
    const triEdgeMat = makeFatLineMaterial(BLUE, 2, 0.8);
    const triEdges = new LineSegments2(triFatGeom, triEdgeMat);
    triEdges.renderOrder = 999;
    triGroup.add(triEdges);

    // -------------------------
    // Cube (solid green) + thick edges + label planes on each face
    // -------------------------
    const cubeSize = 2.5;
    const cubeGeom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    // Solid cube material (NOT textured; stays green)
    const cubeMat = new THREE.MeshBasicMaterial({
      color: GREEN,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const cube = new THREE.Mesh(cubeGeom, cubeMat);
    cubeGroup.add(cube);

    // Cube edges (thick)
    const cubeEdgesGeom = new EdgesGeometry(cubeGeom);
    const cubeFatGeom = new LineSegmentsGeometry().fromEdgesGeometry(cubeEdgesGeom);
    const cubeEdgeMat = makeFatLineMaterial(GREEN, 2, 0.9);
    const cubeEdges = new LineSegments2(cubeFatGeom, cubeEdgeMat);
    cubeEdges.renderOrder = 998;
    cubeGroup.add(cubeEdges);

    // Face labels: overlay planes slightly above each face
    // Face order idea (not required here because we place planes manually):
    // +X, -X, +Y, -Y, +Z, -Z
    const half = cubeSize / 2;
    const offset = 0.02; // push labels outward to avoid z-fighting

    const faceLabels = [
      { word: "Who",   pos: [ half + offset, 0, 0], rot: [0,  Math.PI / 2, 0] }, // +X
      { word: "Why",   pos: [-half - offset, 0, 0], rot: [0, -Math.PI / 2, 0] }, // -X
      { word: "When",  pos: [0,  half + offset, 0], rot: [-Math.PI / 2, 0, 0] }, // +Y
      { word: "How",   pos: [0, -half - offset, 0], rot: [ Math.PI / 2, 0, 0] }, // -Y
      { word: "What",  pos: [0, 0,  half + offset], rot: [0, 0, 0] },            // +Z
      { word: "Where", pos: [0, 0, -half - offset], rot: [0, Math.PI, 0] },       // -Z
    ];

    const labelGeom = new THREE.PlaneGeometry(cubeSize * 0.82, cubeSize * 0.82);

    faceLabels.forEach(({ word, pos, rot }) => {
      const tex = makeTextTextureTransparent(word);

      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: 0xffffff,      // do NOT tint the text
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      });

      // Keep text clean on top of the cube face
      mat.depthWrite = false;
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -1;
      mat.polygonOffsetUnits = -1;

      const labelPlane = new THREE.Mesh(labelGeom, mat);
      labelPlane.position.set(pos[0], pos[1], pos[2]);
      labelPlane.rotation.set(rot[0], rot[1], rot[2]);
      labelPlane.renderOrder = 1000;

      cubeGroup.add(labelPlane);
      labelMats.push(mat);
      labelPlanes.push(labelPlane);
    });

    // -------------------------
    // Octahedron (precession rig) + thick edges
    // -------------------------
    const octaGeom = new THREE.OctahedronGeometry(3.8);
    const octaMat = new THREE.MeshBasicMaterial({
      color: BLUE,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const octa = new THREE.Mesh(octaGeom, octaMat);

    const octaEdgesGeom = new EdgesGeometry(octaGeom);
    const octaFatGeom = new LineSegmentsGeometry().fromEdgesGeometry(octaEdgesGeom);
    const octaEdgeMat = makeFatLineMaterial(BLUE, 2, 0.9);
    const octaEdges = new LineSegments2(octaFatGeom, octaEdgeMat);
    octaEdges.renderOrder = 997;

    octaSpinGroup.add(octa);
    octaSpinGroup.add(octaEdges);

    // -------------------------
    // Animation
    // -------------------------
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      const t = clock.getElapsedTime();

      innerGroup.rotation.z = t * 1.8;
      triGroup.rotation.z = -t * 0.9;
      cubeGroup.rotation.y = t * 0.6;
      cubeGroup.rotation.x = t * 0.2;

      // Octa precession
      const TILT = Math.PI / 8;     // ~22.5° tilt
      const SPIN_RATE = 0.9;        // fast spin
      const PRECESS_RATE = 0.18;    // slow precession
      const NUTATION = 0.05;        // subtle wobble

      octaPrecessionPivot.rotation.y = t * PRECESS_RATE;
      octaTiltGroup.rotation.x = TILT + Math.sin(t * 0.8) * NUTATION;
      octaSpinGroup.rotation.y = t * SPIN_RATE;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    // Resize
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      // Update fat-line resolutions
      triEdgeMat.resolution.set(window.innerWidth, window.innerHeight);
      cubeEdgeMat.resolution.set(window.innerWidth, window.innerHeight);
      octaEdgeMat.resolution.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);

      // Remove label planes (so their textures can be GC'd)
      labelPlanes.forEach((p) => cubeGroup.remove(p));

      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }

      [planeGeom, triGeom, cubeGeom, labelGeom, octaGeom].forEach((g) => g.dispose());

      [
        planeMat,
        triMat,
        cubeMat,
        octaMat,
        ...labelMats,
      ].filter(Boolean).forEach((m) => m.dispose());

      // fat-line materials
      [triEdgeMat, cubeEdgeMat, octaEdgeMat].forEach((m) => m.dispose());
    };
  }, [navigate]);

  return (
    <div className="display-page">
      <div className="hack-overlay">
        <span className="hack-text">{hackText}</span>
      </div>
      <div ref={mountRef} className="canvas-holder" />
    </div>
  );
}
