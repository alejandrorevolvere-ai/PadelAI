'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PelotaProps {
  position?: [number, number, number]
  speed?: number
  visible?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Pelota({
  position = [0, 1.5, -4],
  speed = 1,
  visible = true,
}: PelotaProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current || !glowRef.current) return

    const t = state.clock.elapsedTime * speed

    // Bounce animation: y = |sin(t)| * amplitude + baseY
    const baseY = position[1] ?? 1.5
    const amplitude = 1.2
    const bounce = Math.abs(Math.sin(t * 2.5)) * amplitude + baseY

    meshRef.current.position.y = bounce
    glowRef.current.position.y = bounce

    // Slow rotation
    meshRef.current.rotation.x = t * 0.5
    meshRef.current.rotation.z = t * 0.3

    // Glow pulsing
    const pulse = 0.6 + Math.sin(t * 3) * 0.4
    glowRef.current.scale.setScalar(1.4 + pulse * 0.3)
    const glowMat = glowRef.current.material as THREE.MeshBasicMaterial
    glowMat.opacity = 0.15 + pulse * 0.15
  })

  if (!visible) return null

  return (
    <group position={[position[0] ?? 0, 0, position[2] ?? -4]}>
      {/* Glow aura */}
      <mesh ref={glowRef} scale={1.6}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial
          color="#6ee7b7"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>

      {/* Main ball */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.065, 24, 24]} />
        <meshPhysicalMaterial
          color="#f0f8e8"
          emissive="#6ee7b7"
          emissiveIntensity={0.15}
          roughness={0.2}
          metalness={0.1}
          envMapIntensity={0.6}
        />
      </mesh>

      {/* Small highlight dot */}
      <mesh position={[0.02, 0.02, 0.06]} scale={0.3}>
        <sphereGeometry args={[0.065, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
