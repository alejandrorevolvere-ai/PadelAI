'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PalaProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Pala({
  position = [2, 0.8, -2],
  rotation = [-0.3, 0.4, 0],
}: PalaProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    // Subtle idle animation — gentle sway
    const t = state.clock.elapsedTime
    groupRef.current.rotation.z = (rotation[2] ?? 0) + Math.sin(t * 0.6) * 0.02
    groupRef.current.position.y = position[1] + Math.sin(t * 0.4) * 0.01
  })

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[
        rotation[0] ?? -0.3,
        rotation[1] ?? 0.4,
        rotation[2] ?? 0,
      ]}
    >
      {/* Face / blade of the paddle */}
      <mesh castShadow position={[0, 0, 0]}>
        {/* Rounded rectangular shape using a cylinder-ish approach or simple box */}
        <boxGeometry args={[0.22, 0.28, 0.015]} />
        <meshPhysicalMaterial
          color="#e63946"
          roughness={0.3}
          metalness={0.15}
          clearcoat={0.4}
          emissive="#e63946"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Face rim — slightly thicker edge */}
      <mesh position={[0, 0, 0.008]}>
        <planeGeometry args={[0.2, 0.26]} />
        <meshStandardMaterial
          color="#c1121f"
          roughness={0.4}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -0.008]}>
        <planeGeometry args={[0.2, 0.26]} />
        <meshStandardMaterial
          color="#c1121f"
          roughness={0.4}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Handle / grip */}
      <mesh castShadow position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.12, 8]} />
        <meshStandardMaterial
          color="#2d2d2d"
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* Grip tape wrapping */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.04, 8]} />
        <meshStandardMaterial
          color="#444444"
          roughness={1.0}
          metalness={0.0}
        />
      </mesh>

      {/* Handle end cap */}
      <mesh position={[0, -0.26, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 8]} />
        <meshStandardMaterial
          color="#555555"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Cord loop */}
      <mesh position={[0, -0.27, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.015, 0.003, 8, 12]} />
        <meshStandardMaterial
          color="#666666"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
    </group>
  )
}
