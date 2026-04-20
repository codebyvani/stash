/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import './RoundedButton.css'
import { ReactNode, useEffect, useRef } from "react";
import Magnetic from "../magnetic/Magnetic";
import gsap from 'gsap'

// Define props interface
interface RoundedButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  backgroundColor?: string; // Optional with default
  type?: "button" | "rounded"; // Restrict to allowed values
}

const RoundedButton: React.FC<RoundedButtonProps> = ({
  children,
  backgroundColor = "#455CE9", // Default value
  type = "rounded",
  ...props
}) => {
  const circle = useRef<HTMLDivElement | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  let timeoutId: any | null = null;

  useEffect(() => {
    timeline.current = gsap.timeline({ paused: true });
    timeline.current
      .to(circle.current, { top: "-25%", width: "150%", duration: 0.4, ease: "power3.in" }, "enter")
      .to(circle.current, { top: "-150%", width: "125%", duration: 0.25 }, "exit");
  }, []);

  const manageMouseEnter = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeline.current?.tweenFromTo('enter', 'exit');
  };

  const manageMouseLeave = () => {
    timeoutId = setTimeout(() => {
      timeline.current?.play();
    }, 300);
  };

  return (
    <Magnetic>
      <div
        className={type === "button" ? "button" : "roundedButton"}
        style={{ overflow: "hidden" }}
        onMouseEnter={manageMouseEnter}
        onMouseLeave={manageMouseLeave}
        {...props}
      >
        {children}
        <div ref={circle} style={{ backgroundColor }} className="circle"></div>
      </div>
    </Magnetic>
  );
};

export default RoundedButton;
