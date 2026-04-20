/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck

import * as THREE from 'three'
import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Image, useTexture } from '@react-three/drei'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { easing, geometry } from 'maath'
import './util'
import { RoundedPlaneGeometry } from 'maath/dist/declarations/src/geometry'
import { extend } from '@react-three/fiber'

export const Test = () => {
  const canvasScrollRef = useRef()

  const { scrollYProgress } = useScroll({
    target: canvasScrollRef,
    offset: ['start start', 'end start'] // Ensures pinning triggers properly
  })

  const height = useTransform(scrollYProgress, [0.8, 1], ['100vh', '0vh'])


  // Controls rotation and opacity
  const rotation = useTransform(scrollYProgress, [0, 1], [0, Math.PI * 2])

  const [position, setPosition] = useState('absolute')

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest > 0 && latest < 1) {
      setPosition('fixed')
    } else {
      setPosition('absolute')
    }
  })

  return (
    <section
      data-section="next"
      ref={canvasScrollRef}
      style={{
        height: '700vh',
        position: 'relative',
        background: 'white'
      }}
    >
      <motion.div
        id="canvas-container"
        style={{
          height: '100vh',
          width: '100vw',
          top: 0,
          position
        }}
      >
          <Canvas camera={{ position: [0, 0, 100], fov: 15 }}>
           <fog attach="fog" args={['#242424', 8.5, 12]} />
            <Rig rotation={rotation}>
              <Carousel />
            </Rig>
            <Environment preset="city" background blur={0.5} />

            <Banner rotation={rotation} position={[0, -0.15, 0]} />
          </Canvas>
      </motion.div>
    </section>
  )
}

function Rig({ rotation, ...props }) {
  const ref = useRef()

  useFrame((state, delta) => {
    ref.current.rotation.y = rotation.get()
    state.events.update()
    easing.damp3(state.camera.position, [-state.pointer.x * 1, state.pointer.y + 3.5, 10], 0.3, delta)
    state.camera.lookAt(0, 0, 0)
  })

  return <group ref={ref} {...props} />
}

function Carousel({ radius = 1.6, count = 9 }) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    return (
      <Card
        key={i}
        url={`/img${(i % 10) + 1}_.jpg`}
        position={[
          Math.sin(angle) * radius,
          0,
          Math.cos(angle) * radius
        ]}
        rotation={[0, Math.PI + angle, 0]} // Face outward
      />
    )
  })
}


function Card({ url, ...props }) {
  const ref = useRef()

  const [hovered, hover] = useState(false)

  const pointerOver = (e) => (e.stopPropagation(), hover(true))
  const pointerOut = () => hover(false)

  useFrame((state, delta) => {
    easing.damp3(ref.current.scale, hovered ? 1.15 : 1, 0.1, delta)
    easing.damp(ref.current.material, 'radius', hovered ? 0.25 : 0.1, 0.2, delta)
  })

  extend({ RoundedPlaneGeometry: geometry.RoundedPlaneGeometry })

  return (
    <Image
      ref={ref}
      url={url}
      scale={[1, 1, 1]}
      transparent
      side={THREE.DoubleSide}
      onPointerOver={pointerOver}
      onPointerOut={pointerOut}
      {...props}
    >
  <bentPlaneGeometry args={[0.1, 1, 1, 20, 20]} />
</Image>

  )
}


function Banner({ rotation, ...props }) {
  const ref = useRef()
  const texture = useTexture('/work__.png')
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping

  useFrame((state, delta) => {
    if (ref.current?.material) {
      ref.current.material.map.offset.x += delta / 2
    }
  })

  return (
    <mesh ref={ref} {...props}>
      <cylinderGeometry args={[1.8, 1.8, 0.14, 128, 16, true]} />
      <meshSineMaterial
        map={texture}
        map-anisotropy={16}
        map-repeat={[30, 1]}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}
