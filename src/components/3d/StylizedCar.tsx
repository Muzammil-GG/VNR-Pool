"use client";

import { forwardRef } from "react";
import * as THREE from "three";

export const StylizedCar = forwardRef<THREE.Group, React.ComponentProps<"group">>((props, ref) => {
  // Materials
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: "#0a0a0a", // Metallic Black
    metalness: 0.9,
    roughness: 0.1,
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    metalness: 1,
    roughness: 0.05,
  });

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: "#050505",
    metalness: 0.9,
    roughness: 0.1,
    envMapIntensity: 1,
  });

  const tireMaterial = new THREE.MeshStandardMaterial({
    color: "#111111",
    metalness: 0.2,
    roughness: 0.9,
  });

  const brakeLightMaterial = new THREE.MeshStandardMaterial({
    color: "#ff0000",
    emissive: "#ff0000",
    emissiveIntensity: 0, // Starts off, flickers on in Phase 3
    toneMapped: false,
    name: "brakeLightMaterial"
  });

  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#ffffff",
    emissiveIntensity: 1.5,
    toneMapped: false,
  });

  return (
    <group ref={ref} {...props} dispose={null}>
      {/* Lower Body */}
      <mesh material={bodyMaterial} position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.5, 4.5]} />
      </mesh>

      {/* Cabin */}
      <mesh material={windowMaterial} position={[0, 1, -0.2]} castShadow>
        <boxGeometry args={[1.8, 0.6, 2.2]} />
      </mesh>

      {/* Front Grill */}
      <mesh material={chromeMaterial} position={[0, 0.5, 2.26]}>
        <boxGeometry args={[1.4, 0.3, 0.05]} />
      </mesh>

      {/* Headlights */}
      <mesh material={headlightMaterial} position={[0.7, 0.6, 2.26]}>
        <boxGeometry args={[0.3, 0.2, 0.05]} />
      </mesh>
      <mesh material={headlightMaterial} position={[-0.7, 0.6, 2.26]}>
        <boxGeometry args={[0.3, 0.2, 0.05]} />
      </mesh>

      {/* Brake Lights (Tail Lights) */}
      <mesh name="brakeLights" material={brakeLightMaterial} position={[0, 0.6, -2.26]}>
        <boxGeometry args={[1.6, 0.15, 0.05]} />
      </mesh>

      {/* Bumpers */}
      <mesh material={chromeMaterial} position={[0, 0.35, 2.3]}>
        <boxGeometry args={[2.05, 0.15, 0.1]} />
      </mesh>
      <mesh material={chromeMaterial} position={[0, 0.35, -2.3]}>
        <boxGeometry args={[2.05, 0.15, 0.1]} />
      </mesh>

      {/* Wheels */}
      {/* Front Left */}
      <mesh material={tireMaterial} position={[1, 0.3, 1.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.3, 32]} />
      </mesh>
      {/* Front Right */}
      <mesh material={tireMaterial} position={[-1, 0.3, 1.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.3, 32]} />
      </mesh>
      {/* Rear Left */}
      <mesh material={tireMaterial} position={[1, 0.3, -1.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.3, 32]} />
      </mesh>
      {/* Rear Right */}
      <mesh material={tireMaterial} position={[-1, 0.3, -1.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.3, 32]} />
      </mesh>
    </group>
  );
});
StylizedCar.displayName = "StylizedCar";
