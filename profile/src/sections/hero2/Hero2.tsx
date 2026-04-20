/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import "./Hero2.css";
import { motion, useScroll, useTransform } from "framer-motion"
import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import {ScrollTrigger} from 'gsap/all'
import RoundedButton from "../../components/rounded-button/RoundedButton";

const slideUp = {
  initial: {
    y: 300
  },
  enter: {
    y: 0,
    transition: {duration: 0.6, ease: [0.33, 1, 0.68, 1], delay: 2.5}
  }
}

function Hero2({scrollYProgress}) {
  const firstText = useRef<any>(null);
  const secondText = useRef<any>(null);
  const slider = useRef<any>(null);
  let xPercent = 0;
  let direction = -1;

  const xImageRef = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])
  const xDescRef = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 400])

  useLayoutEffect( () => {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(slider.current, {
      scrollTrigger: {
        trigger: document.documentElement,
        scrub: 0.25,
        start: 0,
        end: window.innerHeight,
        onUpdate: e => direction = e.direction * -1
      },
      x: "-500px",
    })
    requestAnimationFrame(animate);
  }, [slider])

  const animate = () => {
    if(xPercent < -100){
      xPercent = 0;
    }
    else if(xPercent > 0){
      xPercent = -100;
    }
    gsap.set(firstText.current, {xPercent: xPercent})
    gsap.set(secondText.current, {xPercent: xPercent})
    requestAnimationFrame(animate);
    xPercent += 0.1 * direction;
  }

  return (
    <motion.main variants={slideUp} initial="initial" animate="enter" className="hero">
      <div className="wrapper">
        <div className="hero-imageContainer">
          <motion.img style={{y: xImageRef}} src="/my-image (2).png" alt="" />
        </div>
        <motion.div style={{y: xDescRef}} className="heroDescription">
          <div className="textContainer">
            {/* <div className={`hero-description`}> */}
              <motion.svg style={{ rotate, scale: 2 }} width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 8.5C8.27614 8.5 8.5 8.27614 8.5 8L8.5 3.5C8.5 3.22386 8.27614 3 8 3C7.72386 3 7.5 3.22386 7.5 3.5V7.5H3.5C3.22386 7.5 3 7.72386 3 8C3 8.27614 3.22386 8.5 3.5 8.5L8 8.5ZM0.646447 1.35355L7.64645 8.35355L8.35355 7.64645L1.35355 0.646447L0.646447 1.35355Z" fill="white"/>
              </motion.svg>
              <span>Software Engineer</span>
              <span>Technical Manager</span>
              <span>AI Enthusiast</span>
            {/* </div> */}
          </div>
        <div className="test2">
          <RoundedButton backgroundColor="#334BD3" type="rounded">
            <p>Get Resume</p>
          </RoundedButton>
        </div>
        </motion.div>
      </div>
      <div className={`sliderContainer`}>
        <div ref={slider} className={`slider`}>
          <p ref={firstText}>Jovanie Limbagan -</p>
          <p className="second" ref={secondText}>Jovanie Limbagan -</p>
        </div>
      </div>
    </motion.main>
  );
};

export default Hero2;
