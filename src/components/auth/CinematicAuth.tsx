"use client";

import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import * as THREE from "three";
import { StylizedCar } from "../3d/StylizedCar";
import { AuthForm } from "../AuthForm";

gsap.registerPlugin(ScrollTrigger);

export function CinematicAuth() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const carGroupRef = useRef<THREE.Group>(null);
  const roadRef = useRef<THREE.Mesh>(null);
  const textOverlayRef = useRef<HTMLDivElement>(null);
  const brandTextRef = useRef<HTMLDivElement>(null);
  const authFormRef = useRef<HTMLDivElement>(null);
  const sceneBgRef = useRef<HTMLDivElement>(null);

  // We use state to delay rendering AuthForm until needed, or just keep it opacity 0
  const [authInteractive, setAuthInteractive] = useState(false);

  useGSAP(() => {
    if (!cameraRef.current || !carGroupRef.current || !roadRef.current) return;

    // We create a master timeline tied to the scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1, // Smooth scrubbing
        onUpdate: (self) => {
          // Enable pointer events on auth form only when near the end
          if (self.progress > 0.95 && !authInteractive) {
            setAuthInteractive(true);
          } else if (self.progress <= 0.95 && authInteractive) {
            setAuthInteractive(false);
          }
        },
      },
    });

    // Extract materials for manipulation
    let brakeMaterial: THREE.MeshStandardMaterial | null = null;
    carGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.Material;
        if (mat && mat.name === "brakeLightMaterial") {
          brakeMaterial = mat as THREE.MeshStandardMaterial;
        }
      }
    });

    // Setup initial states
    gsap.set(cameraRef.current.position, { x: 10, y: 2, z: 0 }); // Side view
    cameraRef.current.lookAt(0, 0, 0);

    // Phase 1 -> 2: Side to Top (0% to 25% of timeline)
    tl.to(cameraRef.current.position, {
      x: 0,
      y: 12,
      z: 0.1, // Slight offset to prevent gimbal lock
      duration: 1,
      ease: "power1.inOut",
      onUpdate: () => cameraRef.current?.lookAt(0, 0, 0),
    }, 0);

    // Fade out initial scroll text
    tl.to(textOverlayRef.current, { opacity: 0, duration: 0.2 }, 0.1);

    // Phase 2 -> 3: Top to Back (25% to 50% of timeline)
    tl.to(cameraRef.current.position, {
      x: 0,
      y: 3,
      z: -12, // Behind the car
      duration: 1,
      ease: "power1.inOut",
      onUpdate: () => cameraRef.current?.lookAt(0, 0, 0),
    }, 1);

    // 50% Mark: Brake lights flicker on
    if (brakeMaterial) {
      tl.to(brakeMaterial, {
        emissiveIntensity: 5,
        duration: 0.1,
        yoyo: true,
        repeat: 3, // Flicker
      }, 2);
      // Leave them on slightly
      tl.to(brakeMaterial, {
        emissiveIntensity: 2,
        duration: 0.1,
      }, 2.4);
    }

    // Phase 3 -> 4: Dive away (50% to 75% of timeline)
    // Car moves forward (positive Z)
    tl.to(carGroupRef.current.position, {
      z: 30,
      duration: 1,
      ease: "power2.in",
    }, 2);
    // Background fades to dark void
    tl.to(sceneBgRef.current, {
      backgroundColor: "#020617", // slate-950
      duration: 1,
    }, 2);
    // Brand text fades in
    tl.to(brandTextRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "power2.out",
    }, 2.5);

    // Phase 4 -> 5: Road exit & Auth reveal (75% to 100% of timeline)
    tl.to(roadRef.current.position, {
      y: -10, // Drops out
      duration: 1,
      ease: "power2.in",
    }, 3);
    
    // Auth form fades in
    tl.to(authFormRef.current, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1,
      ease: "power3.out",
    }, 3);

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "400vh" }}>
      
      {/* Fixed Background for color transitions */}
      <div 
        ref={sceneBgRef} 
        className="fixed inset-0 -z-20 bg-slate-200 dark:bg-slate-900 transition-colors duration-300"
      />

      {/* 3D Canvas Layer */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
          <PerspectiveCamera ref={cameraRef} makeDefault fov={45} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          <Environment preset="city" />

          {/* The Car */}
          <StylizedCar ref={carGroupRef} />

          {/* The Road */}
          <mesh ref={roadRef} position={[0, -0.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 200]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
          </mesh>

          {/* Road Lines */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 200]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} opacity={0.5} transparent />
          </mesh>

          <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />
        </Canvas>
      </div>

      {/* HTML Overlay Layer */}
      <div className="fixed inset-0 z-10 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
        
        {/* Phase 1 Text */}
        <div ref={textOverlayRef} className="absolute bottom-12 text-center">
          <p className="text-sm md:text-lg font-medium tracking-widest uppercase text-slate-800 dark:text-slate-300 opacity-70">
            Scroll to begin your journey
          </p>
          <div className="w-px h-12 bg-slate-800 dark:bg-slate-300 mx-auto mt-4 animate-pulse opacity-50" />
        </div>

        {/* Phase 4 Brand Text */}
        <div 
          ref={brandTextRef} 
          className="absolute top-1/4 text-center opacity-0 translate-y-8"
        >
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter" style={{ color: "#0056A3" }}>
            VNR Pool
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mt-4 font-light">
            Verified rideshares for your daily commute.
          </p>
        </div>

        {/* Phase 5 Auth Form */}
        <div 
          ref={authFormRef}
          className={`absolute inset-0 flex items-center justify-center opacity-0 scale-95 transition-all ${
            authInteractive ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* We wrap AuthForm in a glassmorphism container */}
          <div className="w-full max-w-[420px] p-6 glass-card rounded-[2.5rem] shadow-2xl border border-white/10 bg-black/20 backdrop-blur-xl">
            <AuthForm isCinematic={true} />
          </div>
        </div>

      </div>
    </div>
  );
}
