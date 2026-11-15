"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SiteMetadata, TargetEphemeris } from "../lib/types";
import { Orbit, RotateCw, ZoomIn, ZoomOut, Crosshair } from "lucide-react";

interface LunarGlobe3DProps {
  site: SiteMetadata;
  currentSample: TargetEphemeris;
}

/** Deterministic PRNG (Mulberry32) for consistent procedural lunar surface detail. */
function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build paired albedo and height/bump textures for the Moon sphere. */
function buildLunarTextures() {
  const width = 1024;
  const height = 512;
  const rand = createSeededRandom(19690720);

  const albedoCanvas = document.createElement("canvas");
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const aCtx = albedoCanvas.getContext("2d");

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext("2d");

  if (aCtx && bCtx) {
    // Highland regolith base
    const baseGrad = aCtx.createLinearGradient(0, 0, 0, height);
    baseGrad.addColorStop(0, "#94a3b8");
    baseGrad.addColorStop(0.5, "#7c8ba1");
    baseGrad.addColorStop(0.85, "#8a99ad");
    baseGrad.addColorStop(1, "#64748b");
    aCtx.fillStyle = baseGrad;
    aCtx.fillRect(0, 0, width, height);

    bCtx.fillStyle = "#808080";
    bCtx.fillRect(0, 0, width, height);

    // Subtle mare & South Pole-Aitken basin patches
    const basins = [
      { x: 310, y: 185, rx: 130, ry: 78, rot: 0.2, color: "rgba(38, 49, 68, 0.55)" },
      { x: 465, y: 220, rx: 95, ry: 68, rot: -0.25, color: "rgba(42, 54, 74, 0.5)" },
      { x: 615, y: 170, rx: 145, ry: 95, rot: 0.12, color: "rgba(35, 46, 64, 0.55)" },
      { x: 760, y: 270, rx: 110, ry: 72, rot: -0.1, color: "rgba(48, 60, 82, 0.45)" },
      { x: 512, y: 460, rx: 280, ry: 48, rot: 0, color: "rgba(51, 65, 85, 0.45)" },
    ];
    for (const b of basins) {
      aCtx.fillStyle = b.color;
      aCtx.beginPath();
      aCtx.ellipse(b.x, b.y, b.rx, b.ry, b.rot, 0, Math.PI * 2);
      aCtx.fill();

      bCtx.fillStyle = "rgba(95, 95, 95, 0.35)";
      bCtx.beginPath();
      bCtx.ellipse(b.x, b.y, b.rx, b.ry, b.rot, 0, Math.PI * 2);
      bCtx.fill();
    }

    // Layered impact craters with bright ejecta rims and dark floors
    for (let i = 0; i < 650; i++) {
      const x = rand() * width;
      const y = rand() * height;
      const r = Math.pow(rand(), 2.2) * 14 + 1.2;

      // Dark crater bowl
      aCtx.fillStyle = `rgba(30, 41, 59, ${0.22 + rand() * 0.28})`;
      aCtx.beginPath();
      aCtx.arc(x, y, r, 0, Math.PI * 2);
      aCtx.fill();

      // Highlighted rim
      aCtx.strokeStyle = `rgba(226, 232, 240, ${0.18 + rand() * 0.25})`;
      aCtx.lineWidth = r > 6 ? 1.1 : 0.6;
      aCtx.beginPath();
      aCtx.arc(x, y, r, 0, Math.PI * 2);
      aCtx.stroke();

      // Matching bump depression + rim
      bCtx.fillStyle = "rgba(55, 55, 55, 0.45)";
      bCtx.beginPath();
      bCtx.arc(x, y, r * 0.88, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.strokeStyle = "rgba(225, 225, 225, 0.55)";
      bCtx.lineWidth = r > 6 ? 1.4 : 0.8;
      bCtx.beginPath();
      bCtx.arc(x, y, r, 0, Math.PI * 2);
      bCtx.stroke();
    }
  }

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.ClampToEdgeWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  return { albedoMap, bumpMap };
}

export function LunarGlobe3D({ site, currentSample }: LunarGlobe3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const moonGroupRef = useRef<THREE.Group | null>(null);
  const markerMeshRef = useRef<THREE.Group | null>(null);
  const pulseRingRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const earthArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const isRotatingRef = useRef<boolean>(true);
  const cameraDistRef = useRef<number>(4.8);

  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  useEffect(() => {
    isRotatingRef.current = isRotating;
  }, [isRotating]);

  const handleZoom = (delta: number) => {
    const nextDist = Math.min(7.5, Math.max(2.9, cameraDistRef.current + delta));
    cameraDistRef.current = nextDist;
    setZoomLevel(Number((4.8 / nextDist).toFixed(2)));
  };

  const focusSouthPole = () => {
    if (!moonGroupRef.current) return;
    setIsRotating(false);
    moonGroupRef.current.rotation.set(-0.55, 0.25, 0);
    cameraDistRef.current = 4.1;
    setZoomLevel(Number((4.8 / 4.1).toFixed(2)));
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const width = container.clientWidth || 560;
    const height = 380;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, -2.4, 4.2);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Deep-Space Starfield
    const rand = createSeededRandom(20261115);
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 45 + rand() * 55;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const tint = 0.75 + rand() * 0.25;
      starColors[i * 3] = tint;
      starColors[i * 3 + 1] = tint + (rand() > 0.7 ? 0.08 : 0);
      starColors[i * 3 + 2] = Math.min(1, tint + 0.12);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 3. Lighting (Earthshine ambient + Directional Sun + subtle rim fill)
    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.55);
    scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.28);
    rimLight.position.set(-6, -4, -5);
    scene.add(rimLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.75);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 4. Moon Group (Sphere + Graticule + South Pole Ring + Site Beacon rotate together)
    const moonGroup = new THREE.Group();
    moonGroup.rotation.x = -0.35;
    scene.add(moonGroup);
    moonGroupRef.current = moonGroup;

    const { albedoMap, bumpMap } = buildLunarTextures();
    const moonGeo = new THREE.SphereGeometry(1.8, 72, 72);
    const moonMat = new THREE.MeshStandardMaterial({
      map: albedoMap,
      bumpMap,
      bumpScale: 0.035,
      roughness: 0.88,
      metalness: 0.04,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    // Subtle lat/lon graticule wireframe
    const graticuleGeo = new THREE.SphereGeometry(1.808, 24, 18);
    const graticuleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.075,
    });
    moonGroup.add(new THREE.Mesh(graticuleGeo, graticuleMat));

    // South Pole 75S LOLA Domain Ring (y = -1.8 * sin(75 deg))
    const southLatRad = 75 * (Math.PI / 180);
    const ringRadius = 1.815 * Math.cos(southLatRad);
    const ringY = -1.815 * Math.sin(southLatRad);
    const poleRingGeo = new THREE.RingGeometry(ringRadius - 0.012, ringRadius + 0.012, 64);
    const poleRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const poleRing = new THREE.Mesh(poleRingGeo, poleRingMat);
    poleRing.rotation.x = Math.PI / 2;
    poleRing.position.y = ringY;
    moonGroup.add(poleRing);

    // Subtle orbital reference halo around the Moon
    const orbitHaloGeo = new THREE.RingGeometry(2.22, 2.235, 96);
    const orbitHaloMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.16,
    });
    const orbitHalo = new THREE.Mesh(orbitHaloGeo, orbitHaloMat);
    orbitHalo.rotation.x = Math.PI / 2.25;
    orbitHalo.rotation.y = 0.2;
    scene.add(orbitHalo);

    // 5. Landing Site Beacon (child of moonGroup so it stays locked to coordinates)
    const markerGroup = new THREE.Group();
    const pinGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.28, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.y = 0.14;
    markerGroup.add(pinMesh);

    const tipGeo = new THREE.SphereGeometry(0.036, 16, 16);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
    const tipMesh = new THREE.Mesh(tipGeo, tipMat);
    tipMesh.position.y = 0.29;
    markerGroup.add(tipMesh);

    const ringGeo = new THREE.RingGeometry(0.045, 0.075, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const pulseRing = new THREE.Mesh(ringGeo, ringMat);
    pulseRing.rotation.x = Math.PI / 2;
    pulseRing.position.y = 0.015;
    markerGroup.add(pulseRing);
    pulseRingRef.current = pulseRing;

    moonGroup.add(markerGroup);
    markerMeshRef.current = markerGroup;

    // 6. Celestial Direction Vectors (Sun & Earth)
    const sunArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      2.85,
      0xf59e0b,
      0.24,
      0.13
    );
    scene.add(sunArrow);
    sunArrowRef.current = sunArrow;

    const earthArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      2.65,
      0x38bdf8,
      0.22,
      0.11
    );
    scene.add(earthArrow);
    earthArrowRef.current = earthArrow;

    // Mouse Drag & Wheel Interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !moonGroupRef.current) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      moonGroupRef.current.rotation.y += dx * 0.006;
      moonGroupRef.current.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, moonGroupRef.current.rotation.x + dy * 0.006)
      );
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(e.deltaY > 0 ? 0.35 : -0.35);
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    dom.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Animation Loop
    let animId: number;
    const baseDir = new THREE.Vector3(0, -2.4, 4.2).normalize();
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) * 0.001;

      if (isRotatingRef.current && moonGroupRef.current && !isDragging) {
        moonGroupRef.current.rotation.y += 0.0022;
      }

      // Subtle starfield drift & beacon pulse
      stars.rotation.y = elapsed * 0.006;
      if (pulseRingRef.current) {
        const s = 1 + 0.45 * Math.sin(elapsed * 3.2);
        pulseRingRef.current.scale.set(s, s, 1);
      }

      // Smooth camera zoom interpolation
      const targetPos = baseDir.clone().multiplyScalar(cameraDistRef.current);
      camera.position.lerp(targetPos, 0.12);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener("mousedown", onMouseDown);
      dom.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", handleResize);
      albedoMap.dispose();
      bumpMap.dispose();
      renderer.dispose();
      if (container && dom.parentNode === container) {
        container.removeChild(dom);
      }
    };
  }, []);

  // Update Site Marker and Celestial Vectors when site/sample changes
  useEffect(() => {
    if (!markerMeshRef.current || !sunLightRef.current || !sunArrowRef.current || !earthArrowRef.current) return;

    const phi = (90 - site.latitude_deg) * (Math.PI / 180);
    const theta = (site.longitude_deg + 180) * (Math.PI / 180);
    const R = 1.8;

    const x = -R * Math.sin(phi) * Math.cos(theta);
    const z = R * Math.sin(phi) * Math.sin(theta);
    const y = R * Math.cos(phi);

    markerMeshRef.current.position.set(x, y, z);
    markerMeshRef.current.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(x, y, z).normalize()
    );

    const sunAzRad = (currentSample.sun.azimuth_deg - 90) * (Math.PI / 180);
    const sunElRad = currentSample.sun.elevation_deg * (Math.PI / 180);
    const sunDir = new THREE.Vector3(
      Math.cos(sunElRad) * Math.cos(sunAzRad),
      Math.sin(sunElRad),
      Math.cos(sunElRad) * Math.sin(sunAzRad)
    ).normalize();

    sunLightRef.current.position.set(sunDir.x * 10, sunDir.y * 10, sunDir.z * 10);
    sunArrowRef.current.setDirection(sunDir);

    const earthAzRad = (currentSample.earth.azimuth_deg - 90) * (Math.PI / 180);
    const earthElRad = currentSample.earth.elevation_deg * (Math.PI / 180);
    const earthDir = new THREE.Vector3(
      Math.cos(earthElRad) * Math.cos(earthAzRad),
      Math.sin(earthElRad),
      Math.cos(earthElRad) * Math.sin(earthAzRad)
    ).normalize();

    earthArrowRef.current.setDirection(earthDir);
  }, [site, currentSample]);

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col gap-4 relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Orbit className="w-5 h-5 text-cyan-400" />
              3D Lunar Globe & Celestial Orientation
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/80 font-bold">
              Contextual Visualization Only
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Macro Planetary Orientation Model • Drag to Orbit • Scroll to Zoom
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={focusSouthPole}
            title="Focus South Pole (75°S–90°S)"
            className="text-xs px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-mono flex items-center gap-1 transition-all"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">75°S</span>
          </button>
          <button
            onClick={() => handleZoom(-0.4)}
            title="Zoom In"
            className="text-xs p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(0.4)}
            title="Zoom Out"
            className="text-xs p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`text-xs px-2.5 py-1 rounded-lg border font-mono flex items-center gap-1.5 transition-all ${
              isRotating
                ? "bg-cyan-950/80 border-cyan-800 text-cyan-300"
                : "bg-slate-900 border-slate-700 text-slate-400"
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRotating ? "animate-spin" : ""}`} />
            <span>{isRotating ? "Auto-Rotate" : "Paused"}</span>
          </button>
        </div>
      </div>

      {/* Three.js Canvas Container + Mission Control HUD */}
      <div className="relative rounded-xl overflow-hidden bg-slate-950/70 border border-slate-800/60">
        <div
          ref={mountRef}
          className="w-full h-[380px] cursor-grab active:cursor-grabbing"
        />

        {/* Top-left HUD */}
        <div className="pointer-events-none absolute top-3 left-3 bg-slate-950/75 backdrop-blur-sm border border-slate-800/90 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-300 space-y-0.5">
          <div className="text-cyan-400 font-bold uppercase tracking-wider">
            {site.name}
          </div>
          <div>
            LAT {site.latitude_deg.toFixed(2)}° • LON {site.longitude_deg.toFixed(2)}°
          </div>
          <div className="text-slate-400">
            ZOOM {zoomLevel.toFixed(2)}× • 75°S LOLA RING
          </div>
        </div>

        {/* Bottom-right live celestial vector HUD */}
        <div className="pointer-events-none absolute bottom-3 right-3 bg-slate-950/75 backdrop-blur-sm border border-slate-800/90 rounded-lg px-2.5 py-1.5 text-[10px] font-mono space-y-0.5 text-right">
          <div className="text-amber-300">
            SUN EL {currentSample.sun.elevation_deg.toFixed(2)}° • AZ {currentSample.sun.azimuth_deg.toFixed(1)}°
          </div>
          <div className="text-cyan-300">
            EARTH EL {currentSample.earth.elevation_deg.toFixed(2)}° • AZ {currentSample.earth.azimuth_deg.toFixed(1)}°
          </div>
        </div>
      </div>

      {/* Overlays / Vectors Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
          <span className="text-slate-300">{site.name} Landing Site Pin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-amber-400" />
          <span className="text-amber-300">Sun Illumination Vector</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-cyan-400" />
          <span className="text-cyan-300">Earth Direct Line-of-Sight</span>
        </div>
      </div>

      <div className="text-[11px] font-mono text-amber-200/90 bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-800/50 flex items-center gap-2">
        <span className="text-amber-400 font-bold shrink-0">CRITICAL DISCLAIMER:</span>
        <span>
          The 3D interactive globe provides approximate macro planetary orientation and contextual geometry only. It is <strong>NEVER</strong> the scientific source of truth; all authoritative numerical visibility and margin calculations are computed by the deterministic LOLA/JPL science engine.
        </span>
      </div>
    </div>
  );
}
