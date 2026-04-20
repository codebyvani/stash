/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import './Contact.css';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from "motion/react"
import RoundedButton from '../../components/rounded-button/RoundedButton';
import Magnetic from '../../components/magnetic/Magnetic';
import background from '../../assets/background.jpg';

export default function Contact() {
    const container = useRef<any>(null);

    // Scroll progress hooks for smooth transitions
    const { scrollYProgress } = useScroll({
        target: container,
        offset: ["start start", "end end"],  // Adjusting the offset for better scroll control
    });


    // Transform scroll progress to move elements
    const x = useTransform(scrollYProgress, [0, 1], [0, 100])
    const rotate = useTransform(scrollYProgress, [0, 1], [120, 90])
    const height = useTransform(scrollYProgress, [0, 1], [150, 0]);
    // const curveHeight = useTransform(scrollYProgress, [0, 1], ['80vh', '0vh']);
    // const borderRadius = useTransform(scrollYProgress, [0, 1], ['0 0 50% 50%', '0']);


    return (
        <motion.section
            ref={container}
            id="contact"
        >
            <motion.div
                className="circleContainer"
                style={{
                    height,
                    width: '100%',
                    position: 'absolute',
                    top: '0',
                    background: "linear-gradient(180deg, #232427 0%, #141516 100%)",
                    borderRadius: '0 0 50% 50%',
                    boxShadow: '0px -20px 40px rgba(0, 0, 0, 0.3)',
                    zIndex: 2,
                    // borderRadius
                }}
            />
            <div className="body">
                <div className="title">
                    <span>
                        <div className="contact-imageContainer">
                            <img
                                src={background}
                                alt="background"
                                className="background-image"
                            />
                        </div>
                        <h2>Let’s build</h2>
                    </span>
                    <h2>something great!</h2>
                    <motion.div style={{ x }} className="buttonContainer">
                        <RoundedButton backgroundColor="#334BD3" type="button">
                            <p>Get in touch</p>
                        </RoundedButton>
                    </motion.div>
                    <motion.svg
                        style={{ rotate, scale: 2 }}
                        width="9"
                        height="9"
                        viewBox="0 0 9 9"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M8 8.5C8.27614 8.5 8.5 8.27614 8.5 8L8.5 3.5C8.5 3.22386 8.27614 3 8 3C7.72386 3 7.5 3.22386 7.5 3.5V7.5H3.5C3.22386 7.5 3 7.72386 3 8C3 8.27614 3.22386 8.5 3.5 8.5L8 8.5ZM0.646447 1.35355L7.64645 8.35355L8.35355 7.64645L1.35355 0.646447L0.646447 1.35355Z"
                            fill="white"
                        />
                    </motion.svg>
                </div>

                <div className="contact-nav">
                    <RoundedButton backgroundColor="#334BD3" type="rounded">
                        <p>vanilimbagan18@gmail.com</p>
                    </RoundedButton>
                    <RoundedButton backgroundColor="#334BD3" type="rounded">
                        <p>+639958359698</p>
                    </RoundedButton>
                </div>

                <div className="info">
                    <div>
                        <span>
                            <h3>Version</h3>
                            <p>2025 © Edition</p>
                        </span>
                    </div>
                    <div>
                        <span>
                            <h3>Socials</h3>
                            <Magnetic>
                                <p>Facebook</p>
                            </Magnetic>
                        </span>
                        <Magnetic>
                            <p>Instagram</p>
                        </Magnetic>
                        <Magnetic>
                            <p>Linkedin</p>
                        </Magnetic>
                    </div>
                </div>
            </div>
        </motion.section>
    );
}
