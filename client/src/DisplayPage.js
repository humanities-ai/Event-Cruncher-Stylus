import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import * as THREE from "three";
import { EdgesGeometry, LineSegments, LineBasicMaterial } from "three";
import "./DisplayPage.css";

export default function DisplayPage() {
  const mountRef = useRef(null);
  const [hackText, setHackText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const target = "EVENT CRUNCHER STYLUS";
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,<.>/?";
    let rafId;
    let start = performance.now();
    const duration = 3600; // ms to fully settle

    const scramble = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(t * target.length);

      let out = "";
      for (let i = 0; i < target.length; i++) {
        if (i < revealed || target[i] === " ") {
          out += target[i];
        } else {
          out += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setHackText(out);

      if (revealed < target.length) {
        rafId = requestAnimationFrame(scramble);
      }
    };

    rafId = requestAnimationFrame(scramble);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;

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

    // Groups
    const innerGroup = new THREE.Group();
    const triGroup = new THREE.Group();
    const cubeGroup = new THREE.Group();
    const octaGroup = new THREE.Group();

    scene.add(octaGroup);
    octaGroup.add(cubeGroup);
    cubeGroup.add(triGroup);
    triGroup.add(innerGroup);

    // Colors
    const BLUE = 0x88bbff; // Octahedron
    const GREEN = 0x2e8b57; // Cube
    const SKY = 0x114ddd; // Triangle
    const WHITE = 0xffffff; // Plane

    // Plane
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

    // Triangle
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

    const triEdges = new LineSegments(
      new EdgesGeometry(triGeom),
      new LineBasicMaterial({ color: SKY, linewidth: 5 })
    );
    triGroup.add(triEdges);

    // Cube
    const cubeGeom = new THREE.BoxGeometry(2.5, 2.5, 2.5);
    const cubeMat = new THREE.MeshBasicMaterial({
      color: GREEN,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const cube = new THREE.Mesh(cubeGeom, cubeMat);
    cubeGroup.add(cube);

    const cubeEdges = new LineSegments(
      new EdgesGeometry(cubeGeom),
      new LineBasicMaterial({ color: GREEN, linewidth: 5 })
    );
    cubeGroup.add(cubeEdges);

    // Octahedron
    const octaGeom = new THREE.OctahedronGeometry(3.8);
    const octaMat = new THREE.MeshBasicMaterial({
      color: BLUE,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const octa = new THREE.Mesh(octaGeom, octaMat);
    octaGroup.add(octa);

    const octaEdges = new LineSegments(
      new EdgesGeometry(octaGeom),
      new LineBasicMaterial({ color: BLUE, linewidth: 5 })
    );
    octaGroup.add(octaEdges);

    // Animation
    const clock = new THREE.Clock();
    let frameId;
    const animate = () => {
      const t = clock.getElapsedTime();

      innerGroup.rotation.z = t * 1.8;
      triGroup.rotation.z = -t * 0.9;
      cubeGroup.rotation.y = t * 0.6;
      cubeGroup.rotation.x = t * 0.2;
      octaGroup.rotation.z = -t * 0.35;
      octaGroup.rotation.x = Math.sin(t * 0.25) * 0.15;

      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    // Resize
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);

      [planeGeom, triGeom, cubeGeom, octaGeom].forEach((g) => g.dispose());
      [
        plane.material,
        triMat,
        cubeMat,
        octaMat,
        triEdges.material,
        cubeEdges.material,
        octaEdges.material,
      ].forEach((m) => m.dispose());
    };
  }, []);

  return (
    <div className="display-page">
      <div className="hack-overlay">
        <span className="hack-text">{hackText}</span>
        <button 
            className="start-button"
            onClick={() => navigate("/landing-page")}
        >
            START
        </button>
      </div>
      <div ref={mountRef} className="canvas-holder" />
    </div>
  );
}
