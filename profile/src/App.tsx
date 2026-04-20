/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
'use client';
import './App.css'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, useScroll } from 'framer-motion'
import Preloader from './components/preloader/Preloader'
import Hero from './sections/hero/Hero';
import Description from './sections/description/Description';
import {ScrollTrigger} from 'gsap/ScrollTrigger'
import Contact from './sections/contact/Contact';
import SlidingImages from './sections/sliding-images/SlidingImages';
import Projects from './sections/projects/Projects';
import Header from './sections/header/Header';
import Skills from './sections/skills/Skills';
import Hero2 from './sections/hero2/Hero2';
import Lenis from 'lenis';
import { Test } from './sections/test/Test';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const container = useRef();
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"]
  })

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
      document.body.style.cursor = 'default';
      window.scrollTo(0, 0);
  
      // Force GSAP to recalculate scroll positions after reset
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    }, 2000);
  }, []);
  
  useEffect(() => {
    const lenis = new Lenis();
  
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
  
    requestAnimationFrame(raf);
  
    // Sync GSAP's ScrollTrigger with Lenis
    lenis.on('scroll', ScrollTrigger.update);
  
    return () => {
      lenis.destroy(); // Clean up
    };
  }, []);
  
  return (
    <main ref={container} className='app-container'>
      <AnimatePresence mode='wait'>
        {isLoading && <Preloader />}
      </AnimatePresence>
      <Header />
      {/* <Hero /> */}
      <Hero2 scrollYProgress={scrollYProgress}/>
      <Description scrollYProgress={scrollYProgress}/>
      <Skills />
      <Projects />
      <Test/>
      {/* <SlidingImages/> */}
      <Contact />
    </main>
  )
}

export default App
