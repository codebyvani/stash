/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import './Nav.css';
import { motion } from 'framer-motion';
import { menuSlide } from '../Animation';
import Link from './link/Link';
import Curve from './curve/Curve';
import Footer from './footer/Footer';

const navItems = [
  { title: "Home", href: "/" },
  { title: "Work", href: "/work" },
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
];

export default function Nav() {
  const [selectedIndicator, setSelectedIndicator] = useState(window.location.pathname);

  useEffect(() => {
    const handlePathChange = () => {
      setSelectedIndicator(window.location.pathname);
    };

    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  return (
    <motion.div 
      variants={menuSlide} 
      initial="initial" 
      animate="enter" 
      exit="exit" 
      className="menu"
    >
      <div className="body">
        <div onMouseLeave={() => setSelectedIndicator(window.location.pathname)} className="nav">
          <div className="nav-header">
            <p>Navigation</p>
          </div>
          {navItems.map((data, index) => (
            <Link 
              key={index} 
              data={{ ...data, index }} 
              isActive={selectedIndicator === data.href} 
              setSelectedIndicator={setSelectedIndicator}
            />
          ))}
        </div>
        <Footer />
      </div>
      <Curve />
    </motion.div>
  );
}
