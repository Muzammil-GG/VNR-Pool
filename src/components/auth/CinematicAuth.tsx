"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import * as THREE from "three";
import { RealisticCar } from "../3d/RealisticCar";
import { AuthForm } from "../AuthForm";
import { VehicleBackground } from '@/components/VehicleBackground';
import { useTheme } from "next-themes";

gsap.registerPlugin(ScrollTrigger);

// A helper component to ensure the camera ALWAYS looks at the center
const CameraRig = ({ cameraRef }: { cameraRef: React.RefObject<THREE.PerspectiveCamera> }) => {
  useFrame(() => {
    if (cameraRef.current) {
      cameraRef.current.lookAt(0, 0, 0);
    }
  });
  return null;
};

// Abstract City Scenery to make the environment look premium and populated
const EnvironmentScenery = () => {
  return (
    <group>
      {/* Abstract Dark Monoliths framing the road with random neon glows */}
      {Array.from({ length: 30 }).map((_, i) => {
        const height = 20 + Math.random() * 40;
        return (
          <mesh key={`building-l-${i}`} position={[-15 - Math.random() * 10, height / 2 - 1, -100 + i * 8]}>
            <boxGeometry args={[4, height, 4]} />
            <meshStandardMaterial 
              color="#050505" 
              roughness={0.2} 
              metalness={0.8} 
              emissive={Math.random() > 0.8 ? "#0056A3" : "#000000"}
              emissiveIntensity={1.5}
            />
          </mesh>
        );
      })}
      {Array.from({ length: 30 }).map((_, i) => {
        const height = 20 + Math.random() * 40;
        return (
          <mesh key={`building-r-${i}`} position={[15 + Math.random() * 10, height / 2 - 1, -100 + i * 8]}>
            <boxGeometry args={[4, height, 4]} />
            <meshStandardMaterial 
              color="#050505" 
              roughness={0.2} 
              metalness={0.8} 
              emissive={Math.random() > 0.8 ? "#0056A3" : "#000000"}
              emissiveIntensity={1.5}
            />
          </mesh>
        );
      })}

      {/* Glowing Neon Rails bounding the road (VNR Blue) */}
      <mesh position={[-4.5, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.1, 250]} />
        <meshStandardMaterial color="#0056A3" emissive="#0056A3" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[4.5, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.1, 250]} />
        <meshStandardMaterial color="#0056A3" emissive="#0056A3" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
};

export function CinematicAuth() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const carGroupRef = useRef<THREE.Group>(null);
  const roadRef = useRef<THREE.Mesh>(null);
  const textOverlayRef = useRef<HTMLDivElement>(null);
  const brandTextRef = useRef<HTMLDivElement>(null);
  const authFormRef = useRef<HTMLDivElement>(null);
  const sceneBgRef = useRef<HTMLDivElement>(null);
  const classicBgRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);
  const { theme } = useTheme();

  // We use state to delay rendering AuthForm until needed, or just keep it opacity 0
  const [authInteractive, setAuthInteractive] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    // Initialize real MP3 audio
    audioRef.current = new Audio("/sounds/engine.mp3");
    audioRef.current.loop = false; // Never loop the cinematic sequence

    // Browsers block autoplay until interaction
    const unlockAudio = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('click', unlockAudio);
      }
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('click', unlockAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useGSAP(() => {
    if (!sceneReady || !cameraRef.current || !carGroupRef.current || !roadRef.current) return;

    // We create a master timeline tied to the scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.2, // Drastically reduced from 1 to make mobile touch-scrolling instantly responsive
        onUpdate: (self) => {
          // Enable pointer events on auth form only when near the end
          if (self.progress > 0.95 && !authInteractive) {
            setAuthInteractive(true);
          } else if (self.progress <= 0.95 && authInteractive) {
            setAuthInteractive(false);
          }

          // Handle real audio sync with car flow
          if (audioRef.current) {
            // Trigger audio much earlier (at 10% scroll).
            // It will fire exactly ONCE per scroll-down to prevent jittering 
            // if the user scrubs back and forth in the middle of the transition.
            if (self.progress > 0.10 && self.progress < 0.85) {
              
              // Play it only once
              if (!hasPlayedRef.current) {
                hasPlayedRef.current = true;
                audioRef.current.currentTime = 0;
                audioRef.current.volume = 1.0;
                audioRef.current.play().catch(() => {});
              }

              // Dynamically fade out the volume as the car visually vanishes
              let vol = 1.0;
              if (self.progress > 0.7) {
                vol = 1 - ((self.progress - 0.7) / 0.15); // Fade from 1.0 to 0.0
              }
              audioRef.current.volume = Math.max(0, Math.min(1, vol));
              
            } else if (self.progress <= 0.10) {
              // Reset the audio sequence ONLY when they scroll back up to the very top
              hasPlayedRef.current = false;
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            } else if (self.progress >= 0.85) {
               // Silence completely at the very end
               audioRef.current.pause();
            }
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
        if (mat && (mat.name === "brakeLightMaterial" || mat.name === "brakeLight")) {
          brakeMaterial = mat as THREE.MeshStandardMaterial;
        }
      }
    });

    // Setup initial states
    const isMobile = window.innerWidth < 768;

    // Responsive Camera Setup: push the camera further back on narrow mobile screens
    const startPos = isMobile ? { x: 18, y: 4, z: 8 } : { x: 12, y: 2, z: 4 };
    const phase1Pos = isMobile ? { x: 8, y: 12, z: -6 } : { x: 6, y: 10, z: -4 };
    const phase2Pos = isMobile ? { x: 0, y: 5, z: -18 } : { x: 0, y: 3, z: -12 };

    gsap.set(cameraRef.current.position, startPos); // Forward-right side view
    gsap.set(carGroupRef.current.position, { y: -0.15 }); // Negatively offset car to fix model origin gap and ground the tires

    // Phase 1 -> 2: Side to Top-Diagonal (0% to 25% of timeline)
    tl.to(cameraRef.current.position, {
      ...phase1Pos,
      duration: 1,
      ease: "none", // Linear ease prevents stopping in the middle of the arc
    }, 0);

    // Fade out initial scroll text
    tl.to(textOverlayRef.current, { opacity: 0, duration: 0.2 }, 0.1);

    // Phase 2 -> 3: Top-Diagonal to Direct Back (25% to 50% of timeline)
    tl.to(cameraRef.current.position, {
      ...phase2Pos,
      duration: 1,
      ease: "power2.out", // Softly land behind the car
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

    // Classic Background fades in
    tl.to(classicBgRef.current, {
      opacity: 1,
      duration: 1.5,
      ease: "power2.inOut",
    }, 2.5);

    // Post-transition buffer: add empty duration so the user can scroll more 
    // after the auth form is fully visible before hitting the footer
    tl.to({}, { duration: 1.5 });

  }, { scope: containerRef, dependencies: [sceneReady] });

  // A helper component to notify when the scene is ready
  const SceneNotifier = () => {
    useEffect(() => {
      // Just a tiny timeout to ensure refs are populated
      const timer = setTimeout(() => setSceneReady(true), 100);
      return () => clearTimeout(timer);
    }, []);
    return null;
  };

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "600vh" }}>
      
      {/* Fixed Background for color transitions */}
      <div 
        ref={sceneBgRef} 
        className="fixed inset-0 -z-20 bg-slate-200 dark:bg-slate-900 transition-colors duration-300"
      />

      {/* 3D Canvas Layer - pointer-events-none prevents it from blocking touch scrolling on mobile */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <Canvas shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <fog attach="fog" args={["#020617", 20, 120]} />
          <PerspectiveCamera ref={cameraRef} makeDefault fov={45} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          {/* Beautiful Blurred Environment Reflections (Removed background prop to fix weird skybox cutoff) */}
          <Environment preset="city" />

          {/* Group the car and its shadow together so the shadow moves with the car */}
          <group ref={carGroupRef}>
            {/* The Car - wrapped in Suspense to load smoothly */}
            <Suspense fallback={null}>
              <RealisticCar />
            </Suspense>

            {/* Baked shadow attached to the car, rendering exactly ONCE to fix mobile lag */}
            <ContactShadows position={[0, 0, 0]} resolution={512} frames={1} scale={30} blur={1.5} opacity={0.8} far={10} color="#000000" />
          </group>

          {/* The Road - Extruded very wide to prevent seeing the void edge */}
          <mesh ref={roadRef} position={[0, -0.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[500, 500]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>

          {/* Road Lines */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 250]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} opacity={0.5} transparent />
          </mesh>

          {/* Abstract City Scenery */}
          <EnvironmentScenery />
          
          <SceneNotifier />
          <CameraRig cameraRef={cameraRef} />
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

        {/* Phase 5 Classic Backgrounds */}
        <div 
          ref={classicBgRef} 
          className="absolute inset-0 z-0 pointer-events-none opacity-0"
        >
          <VehicleBackground />
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
