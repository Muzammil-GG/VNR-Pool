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
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={`building-l-${i}`} position={[-15 - Math.random() * 10, 5 + Math.random() * 10, -100 + i * 8]}>
          <boxGeometry args={[4, 20 + Math.random() * 20, 4]} />
          <meshStandardMaterial 
            color="#050505" 
            roughness={0.2} 
            metalness={0.8} 
            emissive={Math.random() > 0.8 ? "#0056A3" : "#000000"}
            emissiveIntensity={1.5}
          />
        </mesh>
      ))}
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={`building-r-${i}`} position={[15 + Math.random() * 10, 5 + Math.random() * 10, -100 + i * 8]}>
          <boxGeometry args={[4, 20 + Math.random() * 20, 4]} />
          <meshStandardMaterial 
            color="#050505" 
            roughness={0.2} 
            metalness={0.8} 
            emissive={Math.random() > 0.8 ? "#0056A3" : "#000000"}
            emissiveIntensity={1.5}
          />
        </mesh>
      ))}

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
  
  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  
  const { theme } = useTheme();

  // We use state to delay rendering AuthForm until needed, or just keep it opacity 0
  const [authInteractive, setAuthInteractive] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    // Procedural Engine Sound using Web Audio API
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; // Raspy engine sound
      osc.frequency.value = 40; // Idle RPM rumble

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 120; // Muffle it to sound like a distant engine

      const gain = ctx.createGain();
      gain.gain.value = 0; // Start silent

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      engineOscRef.current = osc;
      engineGainRef.current = gain;

      const unlockAudio = () => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('click', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
      window.addEventListener('click', unlockAudio);

      return () => {
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('click', unlockAudio);
        osc.stop();
        ctx.close();
      };
    }
  }, []);

  useGSAP(() => {
    if (!sceneReady || !cameraRef.current || !carGroupRef.current || !roadRef.current) return;

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

          // Handle procedural audio engine fading and revving
          if (audioCtxRef.current && engineOscRef.current && engineGainRef.current) {
            let vol = 0;
            let pitch = 40; // Idle

            if (self.progress > 0.01 && self.progress < 0.95) {
              vol = 0.6; // Base volume
              
              // Phase 3 (50% to 75%) is where car drives away
              if (self.progress > 0.5) {
                // Fade out volume
                vol = 0.6 * (1 - ((self.progress - 0.5) / 0.25));
                // Rev up engine pitch as it accelerates
                pitch = 40 + ((self.progress - 0.5) / 0.25) * 80; // revs up to 120hz
              }
              vol = Math.max(0, Math.min(0.6, vol));
            }
            
            // Smoothly ramp audio parameters
            const now = audioCtxRef.current.currentTime;
            engineGainRef.current.gain.setTargetAtTime(vol, now, 0.1);
            engineOscRef.current.frequency.setTargetAtTime(pitch, now, 0.1);
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
    gsap.set(cameraRef.current.position, { x: 12, y: 2, z: 4 }); // Forward-right side view
    gsap.set(carGroupRef.current.position, { y: 0 }); // Set car back on the ground

    // Phase 1 -> 2: Side to Top-Diagonal (0% to 25% of timeline)
    tl.to(cameraRef.current.position, {
      x: 6,
      y: 10,
      z: -4, // smoothly orbit towards the back
      duration: 1,
      ease: "none", // Linear ease prevents stopping in the middle of the arc
    }, 0);

    // Fade out initial scroll text
    tl.to(textOverlayRef.current, { opacity: 0, duration: 0.2 }, 0.1);

    // Phase 2 -> 3: Top-Diagonal to Direct Back (25% to 50% of timeline)
    tl.to(cameraRef.current.position, {
      x: 0,
      y: 3,
      z: -12, // Behind the car
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

      {/* 3D Canvas Layer */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
          <fog attach="fog" args={["#020617", 20, 120]} />
          <PerspectiveCamera ref={cameraRef} makeDefault fov={45} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          {/* Beautiful Blurred Environment Reflections (Removed background prop to fix weird skybox cutoff) */}
          <Environment preset="city" />

          {/* The Car - wrapped in Suspense to load smoothly */}
          <Suspense fallback={null}>
            <RealisticCar ref={carGroupRef} />
          </Suspense>

          {/* Ground reflection shadow for realism */}
          <ContactShadows resolution={2048} scale={30} blur={1.5} opacity={0.8} far={10} color="#000000" />

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
