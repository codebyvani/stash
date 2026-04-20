/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// import './SlidingImages.css'
import { motion, useScroll, useTransform } from "motion/react"

interface Project {
  color: string
  src: string
  title: string
  issuer: string
  issuedDate: string
  status: string
}

const _slider1: Project[] = [
  { color: "#e3e5e7", src: "gcp-ace-certificate.png", title: "Associate Cloud Engineer Certification", issuer: "Google Cloud", issuedDate: "02/25/2025", status: "active" },
  { color: "#d6d7dc", src: "infra-modernization-badge.png", title: "Set Up an App Dev Environment on Google Cloud Skill Badge", issuer: "Google Cloud", issuedDate: "02/25/2025", status: "active" },
  { color: "#e3e3e3", src: "infra-modernization-2.png", title: "Set Up a Google Cloud Network Skill Badge", issuer: "Google Cloud", issuedDate: "02/25/2025", status: "active" },
  { color: "#21242b", src: "infra-modernization-3.png", title: "Cloud Architecture: Design, Implement, and Manage Skill Badge", issuer: "Google Cloud", issuedDate: "02/25/2025", status: "active" },
];

const _slider2: Project[] = [
  { color: "#e3e5e7", src: "gcp-ace-certificate.png", title: "Associate Cloud Engineer Certification", issuer: "Google Cloud", issuedDate: "02/25/2025", status: "active" },
  { color: "#d6d7dc", src: "infra-modernization-badge.png", title: "Set Up an App Dev Environment on Google Cloud Skill Badge", issuer: "Google Cloud", issuedDate: "02/25/2025", status: "active" },
  { color: "#e3e3e3", src: "infra-modernization-2.png", title: "Set Up a Google Cloud Network Skill Badge", issuer: "Google Cloud", issuedDate: "02/25/2025", status: "active" },
  { color: "#21242b", src: "infra-modernization-3.png", title: "Cloud Architecture: Design, Implement, and Manage Skill Badge", issuer: "Google Cloud", issuedDate: "02/25/2025", status: "active" },
];


export default function SlidingImages () {
  // const container = useRef(null);
  const { scrollYProgress } = useScroll()
  const _x1 = useTransform(scrollYProgress, [0, 1], [0, 120])
  const _x2 = useTransform(scrollYProgress, [0, 1], [0, -120])
  const height = useTransform(scrollYProgress, [0, 1], [80, 0])

  return (
    <div data-section="next" className="slidingImages">
      {/* <motion.div style={{ x: x1 }} className="image-slider">
        {slider1.map((project, index) => (
          <div
            key={index}
            className="sliding-image-item"
            style={{ backgroundColor: project.color }}
          >
            <div className="sliding-image-item-content">
              <div className="imageContainer">
                <img src={`/images/certificates/${project.src}`}></img>
              </div>
              <p className='item-title'>{project.title}</p>
              <p className='item-issuer'>{project.issuer}</p>
              <p className='item-issued-date'>{project.issuedDate}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div style={{ x: x2 }} className="image-slider">
        {slider2.map((project, index) => (
          <div
            key={index}
            className="sliding-image-item"
            style={{ backgroundColor: project.color }}
          >
            <div className="sliding-image-item-content">
              <div className="imageContainer">
                <img src={`/images/certificates/${project.src}`}></img>
              </div>
              <p className='item-title'>{project.title}</p>
              <p className='item-issuer'>{project.issuer}</p>
              <p className='item-issued-date'>{project.issuedDate}</p>
            </div>
          </div>
        ))}
      </motion.div> */}

      <motion.div style={{ height }} className="circleContainer">
        <div className="circle"></div>
      </motion.div>
    </div>
  );
}
