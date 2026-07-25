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
    
    // The official Three.js Ferrari GLB uses specific mesh names:
    // 'body', 'glass', 'tires', 'rim_fl', 'trim', 'interior_dark', 'interior_light', 'steering_wheel'
    const body = scene.getObjectByName('body') as THREE.Mesh;
    if (body) {
      body.material = materials.body;
      body.castShadow = true;
      body.receiveShadow = true;
    }

    const glass = scene.getObjectByName('glass') as THREE.Mesh;
    if (glass) glass.material = materials.glass;

    // Apply tire materials
    const tires = scene.getObjectByName('tires') as THREE.Mesh;
    if (tires) tires.material = materials.wheels;

    // Apply rim materials
    ['rim_fl', 'rim_fr', 'rim_rl', 'rim_rr', 'trim'].forEach((name) => {
      const part = scene.getObjectByName(name) as THREE.Mesh;
      if (part) part.material = materials.chrome;
    });

    // Traverse to assign generic shadows and find brake lights
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        const name = mesh.name.toLowerCase();
        // If it's specifically a tail light, assign the brake material
        if (name.includes("tail") || name.includes("brake") || name.includes("rear")) {
           mesh.material = materials.brakeLight;
        }
      }
    });

  }, [scene, materials]);

  return (
    <group ref={ref} {...props} dispose={null}>
      {/* Lift it by 0 to let the wheel origin sit exactly on the floor */}
      <primitive object={scene} scale={[1.2, 1.2, 1.2]} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />
    </group>
  );
});

RealisticCar.displayName = "RealisticCar";

// Preload the model
useGLTF.preload("/models/ferrari.glb");
