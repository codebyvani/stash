import { scale, slide } from '../../Animation';
import { motion } from 'framer-motion';

interface NavLinkProps {
  data: {
    title: string;
    href: string;
    index: number;
  };
  isActive: boolean;
  setSelectedIndicator: (href: string) => void;
}

export default function NavLink({ data, isActive, setSelectedIndicator }: NavLinkProps) {
  const { title, href, index } = data;

  return (
    <motion.div 
      className="link"
      onMouseEnter={() => setSelectedIndicator(href)}
      custom={index} 
      variants={slide} 
      initial="initial" 
      animate="enter" 
      exit="exit"
    >
      <motion.div 
        variants={scale} 
        animate={isActive ? "open" : "closed"} 
        className="indicator"
      />
      <a href={href}>{title}</a>
    </motion.div>
  );
}
