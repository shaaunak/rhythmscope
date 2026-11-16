"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCcw, Play, Pause, Sparkles, Box } from "lucide-react";

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

    const width = container.clientWidth || 680;
    const height = container.clientHeight || 360;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f6fb); // Soft luxury lavender-grey

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 16, 44);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Sophisticated Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(15, 25, 20);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x94d2bd, 0.6);
    fillLight.position.set(-20, 10, -10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf46c83, 0.5);
    rimLight.position.set(0, -10, 20);
    scene.add(rimLight);

    // 3. Floating Architectural Ground Grid
    const gridHelper = new THREE.GridHelper(52, 26, 0xc8d0e0, 0xe2e6f0);
    gridHelper.position.y = -6;
    scene.add(gridHelper);

    // 4. Waveform Sculpture Group
    const group = new THREE.Group();
    scene.add(group);

    const sampleCount = Math.min(cleanWaveform.length, 180);
    const stepX = 42 / sampleCount;

    // Clean Line (Teal #16A6A1)
    const cleanPoints: THREE.Vector3[] = [];
    const minVal = Math.min(...cleanWaveform) || -1;
    const maxVal = Math.max(...cleanWaveform) || 2;
    const range = maxVal - minVal || 1;

    for (let i = 0; i < sampleCount; i++) {
      const normY = ((cleanWaveform[i] - minVal) / range) * 12 - 4;
      cleanPoints.push(new THREE.Vector3(-21 + i * stepX, normY, -3.2));
    }

    const cleanCurve = new THREE.CatmullRomCurve3(cleanPoints);
    const cleanGeometry = new THREE.TubeGeometry(cleanCurve, 180, 0.38, 12, false);
    const cleanMaterial = new THREE.MeshStandardMaterial({
      color: 0x16a6a1, // Pure teal
      roughness: 0.18,
      metalness: 0.22,
    });
    const cleanMesh = new THREE.Mesh(cleanGeometry, cleanMaterial);
    cleanMesh.castShadow = true;
    group.add(cleanMesh);

    // Corrupted Line (Coral #F46C83) floating in front (+3.2 in Z)
    const noisyPoints: THREE.Vector3[] = [];
    const nMin = Math.min(...noisyWaveform) || -1;
    const nMax = Math.max(...noisyWaveform) || 2;
    const nRange = nMax - nMin || 1;

    for (let i = 0; i < sampleCount; i++) {
      const normY = ((noisyWaveform[i] - nMin) / nRange) * 12 - 4;
      noisyPoints.push(new THREE.Vector3(-21 + i * stepX, normY, 3.2));
    }

    const noisyCurve = new THREE.CatmullRomCurve3(noisyPoints);
    const noisyGeometry = new THREE.TubeGeometry(noisyCurve, 180, 0.38, 12, false);
    const noisyMaterial = new THREE.MeshStandardMaterial({
      color: 0xf46c83, // Pure coral
      roughness: 0.2,
      metalness: 0.18,
    });
    const noisyMesh = new THREE.Mesh(noisyGeometry, noisyMaterial);
    noisyMesh.castShadow = true;
    group.add(noisyMesh);

    // Translucent Harmonic Ribs (Connecting struts between clean and noisy samples)
    const strutMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.3,
      roughness: 0.3,
      metalness: 0.1,
    });

    for (let i = 0; i < sampleCount; i += 5) {
      const p1 = cleanPoints[i];
      const p2 = noisyPoints[i];
      const geom = new THREE.CylinderGeometry(0.08, 0.08, p1.distanceTo(p2), 6);
      const strut = new THREE.Mesh(geom, strutMaterial);
      strut.position.copy(p1).lerp(p2, 0.5);
      strut.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        p2.clone().sub(p1).normalize()
      );
      group.add(strut);
    }

    // 5. Cursor Parallax
    let targetRotationY = 0;
    let targetRotationX = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = mouseX * 0.4;
      targetRotationX = mouseY * 0.2;
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

    // 7. Cleanup
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
    <div className="relative w-full h-[370px] bg-[#F6F6FB] rounded-3xl border border-white/80 shadow-soft overflow-hidden select-none">
      {/* 3D Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Meta Badge Top Left */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-float border border-white text-xs font-semibold text-primary">
        <Sparkles className="w-3.5 h-3.5 text-teal" />
        <span>Spatial 3D Waveform Sculpture</span>
        <span className="text-[10px] text-secondary font-mono">Three.js</span>
      </div>

      {/* Floating Legend Top Right */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-3 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-float border border-white text-[11px] font-medium text-secondary">
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal" />
          <span className="text-primary font-semibold">Clean (MLII)</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-coral" />
          <span className="text-primary font-semibold">Corrupted Trace</span>
        </span>
      </div>

      {/* Floating Control Pill Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-float border border-white">
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
          Move cursor to tilt spatial depth
        </span>
      </div>
    </div>
  );
};
