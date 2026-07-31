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
import { Righteous } from 'next/font/google';

const righteous = Righteous({ weight: '400', subsets: ['latin'] });

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
      {/* Performance Optimization: Removed the 60 heavy monoliths for mobile 60FPS lock */}

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
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const carGroupRef = useRef<THREE.Group>(null);
  const roadRef = useRef<THREE.Mesh>(null);
  const textOverlayRef = useRef<HTMLDivElement>(null);
  const brandTextRef = useRef<HTMLDivElement>(null);
  const authFormRef = useRef<HTMLDivElement>(null);
  const feature1Ref = useRef<HTMLDivElement>(null);
  const feature2Ref = useRef<HTMLDivElement>(null);
  const feature3Ref = useRef<HTMLDivElement>(null);
  const sceneBgRef = useRef<HTMLDivElement>(null);
  const classicBgRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);
  const { theme } = useTheme();

  // We use state to delay rendering AuthForm until needed, or just keep it opacity 0
  const [sceneReady, setSceneReady] = useState(false);
  const [dpr, setDpr] = useState<[number, number]>([1.5, 2]);

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

    // Boost DPR on mobile to ensure crisp, high-quality rendering
    if (window.innerWidth < 768) {
      setDpr([1.5, 2]); // High quality Retina DPR on mobile
    }

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
        scrub: 1, // Increased from 0.5 to 1 for much smoother mobile interpolation
        onUpdate: (self) => {
          // Handle real audio sync with car flow
          if (audioRef.current) {
            if (self.progress > 0.05 && self.progress < 0.60) {
              // Play it only once
              if (!hasPlayedRef.current) {
                hasPlayedRef.current = true;
                audioRef.current.currentTime = 0;
                audioRef.current.volume = 1.0;
                audioRef.current.play().catch(() => {});
              }

              // Dynamically fade out the volume as the car visually vanishes (around 40-50% mark)
              let vol = 1.0;
              if (self.progress > 0.40) {
                vol = 1 - ((self.progress - 0.40) / 0.10); // Fade from 1.0 to 0.0
              }
              audioRef.current.volume = Math.max(0, Math.min(1, vol));
              
            } else if (self.progress <= 0.05) {
              // Reset the audio sequence ONLY when they scroll back up to the very top
              hasPlayedRef.current = false;
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            } else if (self.progress >= 0.60) {
               // Silence completely
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
    gsap.set(carGroupRef.current.position, { y: -0.02 }); // Ultra-precise offset to prevent floating/clipping

    // PHASE 1: Intro (0 -> 1.5)
    tl.to(cameraRef.current.position, {
      ...phase1Pos,
      duration: 1.5,
      ease: "none", 
    }, 0);
    tl.to(textOverlayRef.current, { opacity: 0, duration: 0.2 }, 0.1);

    // PHASE 2: Swoop behind (1.5 -> 3.0)
    tl.to(cameraRef.current.position, {
      ...phase2Pos,
      duration: 1.5,
      ease: "power2.out",
    }, 1.5);

    // PHASE 3: Brake & Speed Away (3.0 -> 4.5)
    if (brakeMaterial) {
      tl.to(brakeMaterial, { emissiveIntensity: 5, duration: 0.1, yoyo: true, repeat: 3 }, 3.0);
      tl.to(brakeMaterial, { emissiveIntensity: 2, duration: 0.1 }, 3.4);
    }

    tl.to(carGroupRef.current.position, { z: 30, duration: 1.5, ease: "power2.in" }, 3.2);
    tl.to(sceneBgRef.current, { backgroundColor: "#020617", duration: 1.5 }, 3.2);
    tl.to(roadRef.current.position, { y: -10, duration: 1.5, ease: "power2.in" }, 4.0);
    
    // Brand Text Reveal
    tl.to(brandTextRef.current, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 4.0);

    // PHASE 4: Features Showcase (4.5 -> 9.0)
    // Feature 1: Exclusive
    tl.to(feature1Ref.current, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 4.5);
    tl.to(feature1Ref.current, { opacity: 0, y: -40, duration: 0.5, ease: "power2.in" }, 5.5);
    
    // Feature 2: Pricing
    tl.to(feature2Ref.current, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 6.0);
    tl.to(feature2Ref.current, { opacity: 0, y: -40, duration: 0.5, ease: "power2.in" }, 7.0);

    // Feature 3: Safe & Eco
    tl.to(feature3Ref.current, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 7.5);
    tl.to(feature3Ref.current, { opacity: 0, y: -40, duration: 0.5, ease: "power2.in" }, 8.5);

    // PHASE 5: Classic Background (9.0 -> 10.5)
    // Classic Background fades in (Auth form will naturally scroll up over this)
    tl.to(classicBgRef.current, { opacity: 1, duration: 1.5, ease: "power2.inOut" }, 9.0);

    // Post-transition buffer 
    tl.to({}, { duration: 1.0 });

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
    <div ref={containerRef} className="relative w-full" style={{ height: "1000vh" }}>
      
      {/* Fixed Background for color transitions */}
      <div 
        ref={sceneBgRef} 
        className="fixed inset-0 -z-20 bg-slate-200 dark:bg-slate-900 transition-colors duration-300"
      />

      {/* 3D Canvas Layer - pointer-events-none prevents it from blocking touch scrolling on mobile */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Pass DPR and enable antialiasing for ultra-crisp edges */}
        <Canvas shadows dpr={dpr} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <fog attach="fog" args={["#020617", 20, 120]} />
          <PerspectiveCamera ref={cameraRef} makeDefault fov={45} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          {/* High resolution environment for premium, crisp reflections on the Ferrari paint */}
          <Environment preset="city" resolution={512} />

          {/* Group the car and its shadow together so the shadow moves with the car */}
          <group ref={carGroupRef}>
            {/* The Car - wrapped in Suspense to load smoothly */}
            <Suspense fallback={null}>
              <RealisticCar />
            </Suspense>

            {/* Baked shadow attached to the car, rendering exactly ONCE to fix mobile lag */}
            <ContactShadows position={[0, 0, 0]} resolution={256} frames={1} scale={15} blur={1.5} opacity={0.8} far={10} color="#000000" />
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
        <div ref={textOverlayRef} className="absolute bottom-12 text-center will-change-transform will-change-opacity">
          <p className="text-sm md:text-lg font-medium tracking-widest uppercase text-slate-800 dark:text-slate-300 opacity-70">
            Scroll to begin your journey
          </p>
          <div className="w-px h-12 bg-slate-800 dark:bg-slate-300 mx-auto mt-4 animate-pulse opacity-50" />
        </div>

        {/* Phase 3 Brand Text */}
        <div 
          ref={brandTextRef} 
          className="absolute top-[15%] md:top-1/4 text-center opacity-0 translate-y-8"
        >
          <h1 className={`text-6xl md:text-8xl tracking-tighter ${righteous.className}`} style={{ color: "#0056A3" }}>
            VNR Pool
          </h1>
        </div>

        {/* Phase 4 Features */}
        <div 
          ref={feature1Ref}
          className="absolute inset-0 flex items-center justify-center opacity-0 translate-y-16"
        >
          <div className="w-full max-w-[500px] p-8 mx-4 glass-card rounded-[2rem] shadow-2xl border border-slate-200/50 dark:border-white/10 bg-white/20 dark:bg-black/30 backdrop-blur-xl text-center">
            <div className="text-4xl mb-4">🎓</div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">Exclusive Community</h2>
            <p className="text-slate-700 dark:text-slate-300 text-lg md:text-xl font-light">
              Built strictly for VNR VJIET. Connect with verified students and staff. No strangers allowed.
            </p>
          </div>
        </div>

        <div 
          ref={feature2Ref}
          className="absolute inset-0 flex items-center justify-center opacity-0 translate-y-16"
        >
          <div className="w-full max-w-[500px] p-8 mx-4 glass-card rounded-[2rem] shadow-2xl border border-slate-200/50 dark:border-white/10 bg-white/20 dark:bg-black/30 backdrop-blur-xl text-center">
            <div className="text-4xl mb-4">💰</div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">Dynamic Splitting</h2>
            <p className="text-slate-700 dark:text-slate-300 text-lg md:text-xl font-light">
              Join mid-route and pay less. Our smart algorithm calculates fractional fares automatically.
            </p>
          </div>
        </div>

        <div 
          ref={feature3Ref}
          className="absolute inset-0 flex items-center justify-center opacity-0 translate-y-16"
        >
          <div className="w-full max-w-[500px] p-8 mx-4 glass-card rounded-[2rem] shadow-2xl border border-slate-200/50 dark:border-white/10 bg-white/20 dark:bg-black/30 backdrop-blur-xl text-center">
            <div className="text-4xl mb-4">🌱</div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">Safe & Eco-Friendly</h2>
            <p className="text-slate-700 dark:text-slate-300 text-lg md:text-xl font-light">
              Build your Trust Score, use SOS alerts, and earn Eco Points for reducing campus traffic.
            </p>
          </div>
        </div>

        {/* Phase 5 Classic Backgrounds */}
        <div 
          ref={classicBgRef} 
          className="absolute inset-0 z-0 pointer-events-none opacity-0 will-change-opacity"
        >
          <VehicleBackground />
        </div>
      </div>

      {/* Normal Flow Auth Form at the very bottom of 1000vh container */}
      {/* This perfectly allows the global footer to follow right below it without popping over fixed elements */}
      <div 
        ref={authFormRef}
        className="absolute bottom-0 left-0 right-0 min-h-screen flex items-center justify-center z-20 pointer-events-auto"
      >
        <div className="w-full max-w-[420px] p-6 glass-card rounded-[2.5rem] shadow-2xl border border-white/10 bg-black/20 backdrop-blur-xl mt-12 mb-12">
          <AuthForm isCinematic={true} />
        </div>
      </div>

    </div>
  );
}
