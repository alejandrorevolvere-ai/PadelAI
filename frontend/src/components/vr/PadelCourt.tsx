'use client'

import { useRef } from 'react'
import * as THREE from 'three'

// ─── Constants ──────────────────────────────────────────────────────────────
// Padel court: 20m x 10m (real dimensions), 1 unit = 1m
const COURT_LENGTH = 20 // z-axis
const COURT_WIDTH = 10 // x-axis
const COURT_HALF_LENGTH = COURT_LENGTH / 2
const COURT_HALF_WIDTH = COURT_WIDTH / 2
const WALL_HEIGHT = 4
const NET_HEIGHT = 0.88
const FLOOR_Y = 0

// ─── Components ─────────────────────────────────────────────────────────────

/** Court floor — green artificial grass */
function Floor() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
      <planeGeometry args={[COURT_WIDTH, COURT_LENGTH]} />
      <meshStandardMaterial
        color="#2d8a4e"
        roughness={0.9}
        metalness={0.0}
      />
    </mesh>
  )
}

/** White court lines painted on the floor */
function CourtLines() {
  const lineColor = '#ffffff'
  const lineWidth = 0.08
  const lineHeight = 0.01

  const makeLine = (
    width: number,
    length: number,
    position: [number, number, number]
  ) => (
    <mesh position={position} receiveShadow>
      <boxGeometry args={[width, lineHeight, length]} />
      <meshStandardMaterial color={lineColor} roughness={0.6} />
    </mesh>
  )

  return (
    <group>
      {/* Outer boundary lines */}
      {makeLine(COURT_WIDTH, lineWidth, [0, lineHeight / 2, -COURT_HALF_LENGTH])}
      {makeLine(COURT_WIDTH, lineWidth, [0, lineHeight / 2, COURT_HALF_LENGTH])}
      {makeLine(lineWidth, COURT_LENGTH, [-COURT_HALF_WIDTH, lineHeight / 2, 0])}
      {makeLine(lineWidth, COURT_LENGTH, [COURT_HALF_WIDTH, lineHeight / 2, 0])}

      {/* Service lines — 3m from each back wall */}
      {makeLine(COURT_WIDTH, lineWidth, [0, lineHeight / 2, -(COURT_HALF_LENGTH - 3)])}
      {makeLine(COURT_WIDTH, lineWidth, [0, lineHeight / 2, COURT_HALF_LENGTH - 3])}

      {/* Center service line */}
      {makeLine(lineWidth, (COURT_LENGTH - 6), [0, lineHeight / 2, 0])}
    </group>
  )
}

/** Back walls — semitransparent glass */
function BackWalls() {
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#88ccff',
    transparent: true,
    opacity: 0.25,
    roughness: 0.0,
    metalness: 0.0,
    envMapIntensity: 1,
    side: THREE.DoubleSide,
  })

  return (
    <group>
      {/* Back wall z = -10 */}
      <mesh position={[0, WALL_HEIGHT / 2, -COURT_HALF_LENGTH]}>
        <planeGeometry args={[COURT_WIDTH, WALL_HEIGHT]} />
        <primitive object={glassMat} attach="material" />
      </mesh>
      {/* Back wall z = 10 */}
      <mesh position={[0, WALL_HEIGHT / 2, COURT_HALF_LENGTH]}>
        <planeGeometry args={[COURT_WIDTH, WALL_HEIGHT]} />
        <primitive object={glassMat.clone()} attach="material" />
      </mesh>
    </group>
  )
}

/** Side walls — metal mesh pattern */
function SideWalls() {
  const meshMat = new THREE.MeshPhysicalMaterial({
    color: '#8899aa',
    transparent: true,
    opacity: 0.3,
    roughness: 0.7,
    metalness: 0.6,
    wireframe: false,
    side: THREE.DoubleSide,
  })

  // Use a grid of smaller planes to simulate mesh
  const segments = 20
  const cellSize = COURT_LENGTH / segments
  const verticalBars = 12
  const barHeight = WALL_HEIGHT / verticalBars

  const SidePanel = ({ xPos }: { xPos: number }) => {
    const ref = useRef<THREE.Group>(null)
    return (
      <group ref={ref} position={[xPos, WALL_HEIGHT / 2, 0]}>
        {Array.from({ length: segments }).map((_, i) => (
          <mesh key={`v-${i}`} position={[0, 0, -COURT_HALF_LENGTH + i * cellSize + cellSize / 2]}>
            <boxGeometry args={[0.04, WALL_HEIGHT - 0.2, cellSize]} />
            <primitive object={meshMat} attach="material" />
          </mesh>
        ))}
        {Array.from({ length: verticalBars }).map((_, i) => (
          <mesh key={`h-${i}`} position={[0, i * barHeight + barHeight / 2, 0]}>
            <boxGeometry args={[0.04, 0.04, COURT_LENGTH]} />
            <primitive object={meshMat} attach="material" />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group>
      <SidePanel xPos={-COURT_HALF_WIDTH} />
      <SidePanel xPos={COURT_HALF_WIDTH} />
    </group>
  )
}

/** Border frames for walls */
function WallFrames() {
  return (
    <group>
      {/* Top rails along side walls */}
      {[-COURT_HALF_WIDTH, COURT_HALF_WIDTH].map((x) => (
        <mesh key={`top-rail-${x}`} position={[x, WALL_HEIGHT, 0]}>
          <boxGeometry args={[0.1, 0.1, COURT_LENGTH]} />
          <meshStandardMaterial color="#667788" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}
      {/* Top rails along back walls */}
      {[-COURT_HALF_LENGTH, COURT_HALF_LENGTH].map((z) => (
        <mesh key={`top-rail-z-${z}`} position={[0, WALL_HEIGHT, z]}>
          <boxGeometry args={[COURT_WIDTH, 0.1, 0.1]} />
          <meshStandardMaterial color="#667788" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}
      {/* Corner posts */}
      {[
        [-COURT_HALF_WIDTH, -COURT_HALF_LENGTH],
        [COURT_HALF_WIDTH, -COURT_HALF_LENGTH],
        [-COURT_HALF_WIDTH, COURT_HALF_LENGTH],
        [COURT_HALF_WIDTH, COURT_HALF_LENGTH],
      ].map(([x, z]) => (
        <mesh key={`post-${x}-${z}`} position={[x, WALL_HEIGHT / 2, z]}>
          <cylinderGeometry args={[0.06, 0.06, WALL_HEIGHT]} />
          <meshStandardMaterial color="#667788" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/** Central net */
function Net() {
  const netColor = '#e8e8e8'

  return (
    <group position={[0, NET_HEIGHT / 2, 0]}>
      {/* Main net mesh */}
      <mesh>
        <planeGeometry args={[COURT_WIDTH, NET_HEIGHT]} />
        <meshPhysicalMaterial
          color={netColor}
          transparent
          opacity={0.7}
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Net top band */}
      <mesh position={[0, NET_HEIGHT / 2 + 0.01, 0]}>
        <boxGeometry args={[COURT_WIDTH, 0.04, 0.03]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      {/* Net bottom band */}
      <mesh position={[0, -NET_HEIGHT / 2 - 0.01, 0]}>
        <boxGeometry args={[COURT_WIDTH, 0.02, 0.03]} />
        <meshStandardMaterial color="#cccccc" roughness={0.6} />
      </mesh>
      {/* Net posts */}
      {[-COURT_HALF_WIDTH, COURT_HALF_WIDTH].map((x) => (
        <mesh key={`post-${x}`} position={[x, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, NET_HEIGHT + 0.1]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Main Export ────────────────────────────────────────────────────────────

export default function PadelCourt() {
  return (
    <group>
      {/* Ambient + directional lighting embedded in the court for portability */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-10, 15, -8]} intensity={0.5} />

      <Floor />
      <CourtLines />
      <BackWalls />
      <SideWalls />
      <WallFrames />
      <Net />
    </group>
  )
}
