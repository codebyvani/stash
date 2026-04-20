/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import './Project.css';

interface ProjectProps {
  index: number
  title: any
  manageModal: any
  company: string
}

export default function Project({index, title, manageModal, company}: ProjectProps) {
  return (
    <div onMouseEnter={(e) => {manageModal(true, index, e.clientX, e.clientY)}} onMouseLeave={(e) => {manageModal(false, index, e.clientX, e.clientY)}} className={`project`}>
      <h2>{title}</h2>
      <p>{company}</p>
    </div>
)
}
