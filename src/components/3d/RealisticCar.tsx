"use client";

import { forwardRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

export const RealisticCar = forwardRef<THREE.Group, React.ComponentProps<"group">>((props, ref) => {
  // Load the downloaded GLB model
  const { scene } = useGLTF("/models/ferrari.glb");

  // Create our ultra-realistic materials
  const materials = useMemo(() => {
    return {
      body: new THREE.MeshPhysicalMaterial({
        color: "#050505", // Deep metallic black
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        metalness: 1,
        roughness: 0,
        transmission: 1.0, // Glass effect
        ior: 1.5,
        thickness: 0.5,
        transparent: true,
        opacity: 1,
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        metalness: 1,
        roughness: 0.01,
      }),
      wheels: new THREE.MeshStandardMaterial({
        color: "#111111",
        metalness: 0.2,
        roughness: 0.8,
      }),
      // This is the material we will animate with GSAP
      brakeLight: new THREE.MeshStandardMaterial({
        color: "#ff0000",
        emissive: "#ff0000",
        emissiveIntensity: 0, // Starts off
        toneMapped: false,
        name: "brakeLightMaterial", // Used by GSAP to find it
      }),
      headLight: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#ffffff",
        emissiveIntensity: 2,
        toneMapped: false,
      })
    };
  }, []);

  useEffect(() => {
    if (!scene) return;
    
    // Traverse the model to assign materials and enable shadows
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const name = mesh.name.toLowerCase();
        
        // The three.js ferrari model has specific mesh names. We use includes to guess.
        if (name.includes("body") || name.includes("paint") || name.includes("hood") || name.includes("door")) {
          mesh.material = materials.body;
        } else if (name.includes("glass") || name.includes("window")) {
          mesh.material = materials.glass;
        } else if (name.includes("wheel") || name.includes("tire") || name.includes("alloy")) {
          mesh.material = materials.wheels;
        } else if (name.includes("chrome") || name.includes("metal") || name.includes("rim")) {
          mesh.material = materials.chrome;
        } else if (name.includes("tail") || name.includes("brake") || name.includes("red")) {
          mesh.material = materials.brakeLight;
        } else if (name.includes("head") || name.includes("light") || name.includes("white")) {
          mesh.material = materials.headLight;
        }
      }
    });
  }, [scene, materials]);

  return (
    <group ref={ref} {...props} dispose={null}>
      {/* We scale and position it to match the previous stylized car size roughly */}
      <primitive object={scene} scale={[1.2, 1.2, 1.2]} position={[0, -0.3, 0]} rotation={[0, Math.PI, 0]} />
    </group>
  );
});

RealisticCar.displayName = "RealisticCar";

// Preload the model
useGLTF.preload("/models/ferrari.glb");
