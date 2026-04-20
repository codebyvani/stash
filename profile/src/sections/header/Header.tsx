
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './Header.css';
import { AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Magnetic from '../../components/magnetic/Magnetic';
import Nav from './nav/Nav';
import RoundedButton from '../../components/rounded-button/RoundedButton';

export default function Header() {
    const header = useRef(null);
    const [isActive, setIsActive] = useState(false);
    const button = useRef(null);
    const [currentPath, setCurrentPath] = useState(window.location.pathname);

    useEffect(() => {
      const handlePathChange = () => {
          setCurrentPath(window.location.pathname);
      };

      window.addEventListener('popstate', handlePathChange);
      return () => window.removeEventListener('popstate', handlePathChange);
    }, []);

    // Close menu when navigating to a new page
    useEffect(() => {
        if (isActive) setIsActive(false);
    }, [currentPath]);

    useLayoutEffect(() => {
      if (typeof window === "undefined") return;

      gsap.registerPlugin(ScrollTrigger);

      gsap.to(button.current, {
          scrollTrigger: {
              trigger: document.documentElement,
              start: 0,
              end: window.innerHeight,
              onLeave: () => {
                  gsap.to(button.current, { scale: 1, duration: 0.25, ease: "power1.out" });
              },
              onEnterBack: () => {
                  gsap.to(button.current, { scale: 0, duration: 0.25, ease: "power1.out" });
                  setIsActive(false);
              }
          }
      });

      const targetSection = document.querySelector('[data-section="target"]');
      const nextSection = document.querySelector('[data-section="next"]');
      const buttonInnerDiv = button.current?.querySelector('.roundedButton');

        if (targetSection && nextSection) {
            gsap.to(buttonInnerDiv, {
                backgroundColor: "#455CE9",
                border: "1px solid transparent",
                scrollTrigger: {
                    trigger: targetSection,
                    start: "top top",
                    endTrigger: nextSection,
                    end: "bottom top",
                    toggleActions: "play reverse play reverse",
                }
            });
        }

    }, []);

    return (
      <>
        <div ref={header} className="header">
          <div className="logo">
              <p className="copyright">©</p>
              <div className="name">
                  <p className="codeBy">Code by</p>
                  <p className="vani">Vani</p>
                  <p className="limbagan">Limbagan</p>
              </div>
          </div>
          {/* <div className="nav">
              <Magnetic>
                  <div className="el">
                      <a href="#">Work</a>
                      <div className="indicator"></div>
                  </div>
              </Magnetic>
              <Magnetic>
                  <div className="el">
                      <a href="#">About</a>
                      <div className="indicator"></div>
                  </div>
              </Magnetic>
              <Magnetic>
                  <div className="el">
                      <a href="#">Contact</a>
                      <div className="indicator"></div>
                  </div>
              </Magnetic>
          </div> */}
        </div>
        <div ref={button} className="headerButtonContainer">
            <RoundedButton backgroundColor="#334BD3" onClick={() => setIsActive(!isActive)} type="rounded">
                {/* <div className={`burger ${isActive ? "burgerActive" : ""}`}></div> */}
                <p>Get Resume</p>
            </RoundedButton>
        </div>
        <AnimatePresence mode="wait">
            {isActive && <Nav />}
        </AnimatePresence>
      </>
    );
}
