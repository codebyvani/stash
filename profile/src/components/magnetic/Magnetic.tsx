/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unsafe-optional-chaining */
import React, { useEffect, useRef } from 'react'
import gsap from 'gsap';


interface MagneticProps {
  children: any
}

function Magnetic({children}: MagneticProps) {
  const magnetic = useRef<HTMLInputElement>(null);

  useEffect( () => {
    // console.log(children)
    const xTo = gsap.quickTo(magnetic.current, "x", {duration: 1, ease: "elastic.out(1, 0.3)"})
    const yTo = gsap.quickTo(magnetic.current, "y", {duration: 1, ease: "elastic.out(1, 0.3)"})

    if(magnetic !== null && magnetic.current !== null) {
      magnetic.current.addEventListener("mousemove", (e) => {
        if(magnetic !== null && magnetic.current !== null) {
          const { clientX, clientY } = e;
          const {height, width, left, top} = magnetic.current.getBoundingClientRect();
          const x = clientX - (left + width/2)
          const y = clientY - (top + height/2)
          xTo(x * 0.35);
          yTo(y * 0.35)
        }
      })
      magnetic?.current.addEventListener("mouseleave", () => {
        xTo(0);
        yTo(0)
      })
    }
  }, [children])

  return (
      React.cloneElement(children, {ref:magnetic})
  )
}


export default Magnetic