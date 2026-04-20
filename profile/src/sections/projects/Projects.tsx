/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import './Projects.css'
import { useState, useEffect, useRef } from 'react';
import Project from './components/project/Project';
// import { motion } from 'framer-motion';
import gsap from 'gsap';
// import RoundedButton from '../../components/rounded-button/RoundedButton';

const projects = [
  {
    title: "Technical Manager",
    src: "c2montreal.png",
    color: "#000000",
    company: "Sansan Global Development Center, Inc.",
    isMultiple: true
  },
  {
    title: "Sr. Frontend Engineer",
    src: "officestudio.png",
    color: "#8C8C8C",
    company: "Cody Web Development, Inc. (formerly LIG Philippines)",
    isMultiple: false
  },
  {
    title: "Sr. Software Engineer",
    src: "locomotive.png",
    color: "#EFE8D3",
    company: "Sprobe, Inc",
    isMultiple: true
  },
  {
    title: "Software Engineer",
    src: "silencio.png",
    color: "#706D63",
    company: "Delta Co., Ltd",
    isMultiple: false
  },
  {
    title: "Programmer",
    src: "silencio.png",
    color: "#706D63",
    company: "PTMS Inc.",
    isMultiple: false
  }
];

const _scaleAnimation = {
  initial: { scale: 0, x: "-50%", y: "-50%" },
  enter: { scale: 1, x: "-50%", y: "-50%", transition: { duration: 0.4, ease: [0.76, 0, 0.24, 1] } },
  closed: { scale: 0, x: "-50%", y: "-50%", transition: { duration: 0.4, ease: [0.32, 0, 0.67, 0] } }
};

type ModalState = {
  active: boolean;
  index: number;
};

export default function Projects() {

  const [_modal, setModal] = useState<ModalState>({ active: false, index: 0 });
  // const { active, index } = modal;
  const modalContainer = useRef<HTMLDivElement | null>(null);
  const cursor = useRef<HTMLDivElement | null>(null);
  const cursorLabel = useRef<HTMLDivElement | null>(null);

  let xMoveContainer = useRef<any>(null);
  let yMoveContainer = useRef<any>(null);
  let xMoveCursor = useRef<any>(null);
  let yMoveCursor = useRef<any>(null);
  let xMoveCursorLabel = useRef<any>(null);
  let yMoveCursorLabel = useRef<any>(null);

  useEffect(() => {
    // Move Container
    xMoveContainer.current = gsap.quickTo(modalContainer.current, "left", { duration: 0.8, ease: "power3" });
    yMoveContainer.current = gsap.quickTo(modalContainer.current, "top", { duration: 0.8, ease: "power3" });

    // Move cursor
    xMoveCursor.current = gsap.quickTo(cursor.current, "left", { duration: 0.5, ease: "power3" });
    yMoveCursor.current = gsap.quickTo(cursor.current, "top", { duration: 0.5, ease: "power3" });

    // Move cursor label
    xMoveCursorLabel.current = gsap.quickTo(cursorLabel.current, "left", { duration: 0.45, ease: "power3" });
    yMoveCursorLabel.current = gsap.quickTo(cursorLabel.current, "top", { duration: 0.45, ease: "power3" });
  }, []);

  const moveItems = (x: number, y: number) => {
    xMoveContainer.current(x);
    yMoveContainer.current(y);
    xMoveCursor.current(x);
    yMoveCursor.current(y);
    xMoveCursorLabel.current(x);
    yMoveCursorLabel.current(y);
  };

  const manageModal = (active: boolean, index: number, x: number, y: number) => {
    moveItems(x, y);
    setModal({ active, index });
  };

  return (
    <main data-section="target" onMouseMove={(e) => { moveItems(e.clientX, e.clientY) }} className={`projects`}>
      <div className={`projects-body`}>
        {
          projects.map((project, index) => {
            return <Project index={index} title={project.title} manageModal={manageModal} key={index} company={project.company} />;
          })
        }
      </div>
      {/* <RoundedButton backgroundColor='#455CE9' type='rounded'>
        <p>More work</p>
      </RoundedButton> */}
      <>
        {/* <motion.div ref={cursor} className={`cursor`} variants={scaleAnimation} initial="initial" animate={active ? "enter" : "closed"}></motion.div> */}
        {/* <motion.div ref={cursorLabel} className={`cursorLabel`} variants={scaleAnimation} initial="initial" animate={active ? "enter" : "closed"}>View</motion.div> */}
      </>
    </main>
  );
}
