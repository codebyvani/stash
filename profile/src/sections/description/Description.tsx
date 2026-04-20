/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { useRef } from 'react';
import './Description.css'
import { motion, useInView, useScroll, useTransform } from "motion/react"
import RoundedButton from '../../components/rounded-button/RoundedButton';

const slideUp = {
  initial: {
    y: "100%"
  },
  open: (i: number) => ({
    y: "0%",
    transition: {duration: 0.5, delay: 0.01 * i}
  }),
  closed: {
    y: "100%",
    transition: {duration: 0.5}
  }
}

function Description({scrollYProgress}) {
  const phrase = "Crafting code since 2014, I thrive on curiosity—unraveling the magic behind software that shapes our world. From elegant algorithms to innovative solutions, I love exploring the vast tech landscape. For me, creativity isn’t just for code—it’s a way of life.";
  const description = useRef(null);
  const isInView = useInView(description)


  const y = useTransform(scrollYProgress, [0, 1], [400, -600])
  return (
    <motion.div className={`description`}>
      <div className={`description-body`}>
        <p ref={description} >
          {
            phrase.split(" ").map( (word, index) => {
                return <span key={index} className={`mask`}><motion.span variants={slideUp} custom={index} animate={isInView ? "open" : "closed"} key={index}>{word}</motion.span></span>
            })
          }
        </p>
        <div style={{
          zIndex: 2
        }}>
          <motion.div style={{ y }} className="buttonContainer">
            <RoundedButton type={`button`} backgroundColor='#334BD3'>
                <p>About me</p>
            </RoundedButton>
          </motion.div>
          </div>
      </div>
    </motion.div>
  )
}

export default Description