/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import * as THREE from "three";
import { useRef, useState, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { generate } from "random-words";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Skills.css"

gsap.registerPlugin(ScrollTrigger);

function Word({ children, ...props }) {
  const color = new THREE.Color();
  const fontProps = {
    fontFamily: "Acumin Pro Bold",
    fontSize: 2.5,
    letterSpacing: -0.05,
    lineHeight: 1,
    "material-toneMapped": false,
    fontWeight: "bold"
  };
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  const over = (e) => (e.stopPropagation(), setHovered(true));
  const out = () => setHovered(false);

  useEffect(() => {
    if (hovered) document.body.style.cursor = "pointer";
    return () => (document.body.style.cursor = "auto");
  }, [hovered]);

  useFrame(() => {
    if (ref.current) {
      ref.current.material.color.lerp(
        color.set(hovered ? "#fa2720" : "white"),
        0.1
      );
    }
  });

  return (
    <Billboard {...props}>
      <Text
        ref={ref}
        onPointerOver={over}
        onPointerOut={out}
        {...fontProps}
        children={children}
      />
    </Billboard>
  );
}

const SKILLS = [
  "JavaScript", "TypeScript", "React", "Three.js", "GSAP", "Node.js",
  "Next.js", "GraphQL", "Angular", "CSS", "HTML", "Redux", "Vue.js",
  "RestAPI", "Docker", "Kubernetes", "AWS", "GCP", "Kotlin", "ElectronJS",
  "Android Native", "PHP", "Laravel", "Yii2", "CakePHP", "Serverless",
  "System Design", "Agile", "Strategic Planning", "Typescript"
];

function Cloud({ count = 4, radius = 20, rotationRef, scrollSpeed }) {
  const words = useMemo(() => {
    const temp = [];
    const spherical = new THREE.Spherical();
    const phiSpan = Math.PI / (count + 1);
    const thetaSpan = (Math.PI * 2) / count;
    let skillIndex = 0; // Track skill index

    for (let i = 1; i < count + 1; i++) {
      for (let j = 0; j < count; j++) {
        temp.push([
          new THREE.Vector3().setFromSpherical(
            spherical.set(radius, phiSpan * i, thetaSpan * j)
          ),
          SKILLS[skillIndex % SKILLS.length] // Loop through skills
        ]);
        skillIndex++;
      }
    }
    return temp;
  }, [count, radius]);

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handlePointerMove = (e) => {
    if (isDragging.current && rotationRef.current) {
      const deltaX = (e.clientX - lastMousePos.current.x) * 0.01;
      const deltaY = (e.clientY - lastMousePos.current.y) * 0.01;
      rotationRef.current.rotation.y += deltaX;
      rotationRef.current.rotation.x += deltaY;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  useFrame(() => {
    if (!isDragging.current && rotationRef.current) {
      rotationRef.current.rotation.y += scrollSpeed.current;
    }
  });

  return (
    <group
      ref={rotationRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      {words.map(([pos, skill], index) => (
        <Word key={index} position={pos} children={skill} />
      ))}
    </group>
  );
}

export default function Skills() {
  const sectionRef = useRef(null);
  const sphereRef = useRef(null);
  const scrollSpeed = useRef(null);

  useEffect(() => {
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top center",
      end: "bottom center",
      scrub: 1,
      onUpdate: (self) => {
        scrollSpeed.current = self.getVelocity() * 0.00003;
      },
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <section
      ref={sectionRef}
      id="skills-section"
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 35], fov: 90 }}>
        <fog attach="fog" args={["#202025", 0, 80]} />
        <Suspense fallback={null}>
          <Cloud count={8} radius={20} rotationRef={sphereRef} scrollSpeed={scrollSpeed} />
        </Suspense>
      </Canvas>
    </section>
  );
}
