'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'

import PadelCourt from './PadelCourt'
import Pelota from './Pelota'
import Pala from './Pala'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VRSceneProps {
  mode?: string
}

// ─── Loading fallback ───────────────────────────────────────────────────────

function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-blue-900">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        <p className="text-sm text-white/60">Cargando escena 3D...</p>
      </div>
    </div>
  )
}

// ─── Scene Content ──────────────────────────────────────────────────────────

function SceneContent({ mode = 'pared' }: { mode?: string }) {
  const isFreePlay = mode === 'freeplay'

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={20}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-10, 15, -8]} intensity={0.5} />
      <directionalLight position={[0, 25, -2]} intensity={0.3} />
      <hemisphereLight args={['#87ceeb', '#1a3a1a', 0.4]} />

      {/* Court */}
      <PadelCourt />

      {/* Ball */}
      <Pelota
        position={isFreePlay ? [0, 1.5, 0] : [1.2, 1.5, -4]}
        speed={isFreePlay ? 0.8 : 1.3}
      />

      {/* Paddle */}
      <Pala
        position={isFreePlay ? [2.5, 0.8, 2] : [3.2, 0.8, -3.5]}
        rotation={[-0.2, isFreePlay ? 0.8 : -0.6, 0.1]}
      />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0.5, 0]}
      />

      {/* Stats in dev */}
      {process.env.NODE_ENV === 'development' && <Stats />}
    </>
  )
}

// ─── Main Export ────────────────────────────────────────────────────────────

export default function VRScene({ mode = 'pared' }: VRSceneProps) {
  return (
    <div className="h-full w-full">
      <Canvas
        shadows
        camera={{ position: [9, 7, 11], fov: 45, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Gradient sky: dark blue/teal background */}
        <color attach="background" args={['#0f172a']} />

        {/* Fog for depth */}
        <fog attach="fog" args={['#0f172a', 25, 45]} />

        <Suspense fallback={null}>
          <SceneContent mode={mode} />
        </Suspense>
      </Canvas>
    </div>
  )
}
