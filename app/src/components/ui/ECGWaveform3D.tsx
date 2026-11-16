"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCcw, Play, Pause, Sparkles } from "lucide-react";

interface ECGWaveform3DProps {
  cleanWaveform: number[];
  noisyWaveform: number[];
  noiseLevel?: number; // 0 to 1
  noiseType?: string;
}

export const ECGWaveform3D: React.FC<ECGWaveform3DProps> = ({
  cleanWaveform,
  noisyWaveform,
  noiseLevel = 0.2,
  noiseType = "Baseline Wander",
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const isRotatingRef = useRef(isRotating);
  isRotatingRef.current = isRotating;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 340;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f6fb); // Soft lavender-grey

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 18, 48);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. Soft Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    // 3. Delicate 3D Ground Grid
    const gridHelper = new THREE.GridHelper(50, 25, 0xd0d5e2, 0xe2e6f0);
    gridHelper.position.y = -6;
    scene.add(gridHelper);

    // 4. Construct 3D Curves from ECG Waveforms
    const group = new THREE.Group();
    scene.add(group);

    const sampleCount = Math.min(cleanWaveform.length, 180);
    const stepX = 40 / sampleCount;

    // Clean Line (Teal #16A6A1)
    const cleanPoints: THREE.Vector3[] = [];
    const minVal = Math.min(...cleanWaveform) || -1;
    const maxVal = Math.max(...cleanWaveform) || 2;
    const range = maxVal - minVal || 1;

    for (let i = 0; i < sampleCount; i++) {
      const normY = ((cleanWaveform[i] - minVal) / range) * 12 - 4;
      cleanPoints.push(new THREE.Vector3(-20 + i * stepX, normY, -3));
    }

    const cleanCurve = new THREE.CatmullRomCurve3(cleanPoints);
    const cleanGeometry = new THREE.TubeGeometry(cleanCurve, 180, 0.35, 12, false);
    const cleanMaterial = new THREE.MeshStandardMaterial({
      color: 0x16a6a1, // Teal
      roughness: 0.25,
      metalness: 0.1,
    });
    const cleanMesh = new THREE.Mesh(cleanGeometry, cleanMaterial);
    group.add(cleanMesh);

    // Corrupted Line (Coral #F46C83) floating forward (+3 in Z)
    const noisyPoints: THREE.Vector3[] = [];
    const nMin = Math.min(...noisyWaveform) || -1;
    const nMax = Math.max(...noisyWaveform) || 2;
    const nRange = nMax - nMin || 1;

    for (let i = 0; i < sampleCount; i++) {
      const normY = ((noisyWaveform[i] - nMin) / nRange) * 12 - 4;
      noisyPoints.push(new THREE.Vector3(-20 + i * stepX, normY, 3));
    }

    const noisyCurve = new THREE.CatmullRomCurve3(noisyPoints);
    const noisyGeometry = new THREE.TubeGeometry(noisyCurve, 180, 0.35, 12, false);
    const noisyMaterial = new THREE.MeshStandardMaterial({
      color: 0xf46c83, // Coral
      roughness: 0.25,
      metalness: 0.1,
    });
    const noisyMesh = new THREE.Mesh(noisyGeometry, noisyMaterial);
    group.add(noisyMesh);

    // Connecting Struts (translucent bars between clean and corrupted beats)
    const strutMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.25,
    });

    for (let i = 0; i < sampleCount; i += 6) {
      const p1 = cleanPoints[i];
      const p2 = noisyPoints[i];
      const geom = new THREE.CylinderGeometry(0.08, 0.08, p1.distanceTo(p2), 6);
      const strut = new THREE.Mesh(geom, strutMaterial);
      strut.position.copy(p1).lerp(p2, 0.5);
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
      group.add(strut);
    }

    // 5. Mouse Interaction for Gentle Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = mouseX * 0.45;
      targetRotationX = mouseY * 0.25;
    };

    container.addEventListener("mousemove", onMouseMove);

    // 6. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (isRotatingRef.current) {
        group.rotation.y += 0.005;
      } else {
        group.rotation.y += (targetRotationY - group.rotation.y) * 0.06;
      }
      group.rotation.x += (targetRotationX - group.rotation.x) * 0.06;

      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", onMouseMove);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      cleanGeometry.dispose();
      cleanMaterial.dispose();
      noisyGeometry.dispose();
      noisyMaterial.dispose();
      strutMaterial.dispose();
    };
  }, [cleanWaveform, noisyWaveform, noiseLevel, noiseType]);

  return (
    <div className="relative w-full h-[360px] bg-[#F6F6FB] rounded-3xl border border-white/80 shadow-soft overflow-hidden select-none">
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Meta Strip Top Left */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-float border border-white text-xs font-semibold text-primary">
        <Sparkles className="w-3.5 h-3.5 text-teal" />
        <span>Spatial Dimensional Waveform</span>
        <span className="text-[10px] text-secondary font-mono">Three.js</span>
      </div>

      {/* Floating Legend Top Right */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-float border border-white text-[11px] font-medium text-secondary">
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal" />
          <span className="text-primary font-semibold">Clean (MLII)</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-coral" />
          <span className="text-primary font-semibold">Corrupted</span>
        </span>
      </div>

      {/* Floating Bottom Interaction Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-float border border-white">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold text-primary hover:bg-surface-subtle transition-colors"
        >
          {isRotating ? (
            <>
              <Pause className="w-3.5 h-3.5 text-coral" />
              <span>Pause Rotation</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-teal" />
              <span>Auto Rotate</span>
            </>
          )}
        </button>
        <span className="text-secondary/40">|</span>
        <span className="text-[11px] text-secondary font-medium px-2">
          Move cursor to tilt depth
        </span>
      </div>
    </div>
  );
};
