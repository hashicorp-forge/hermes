import * as React from "react";

interface ProjectIconProps {
  className?: string;
}

const ProjectIcon: React.FC<ProjectIconProps> = ({ className }) => {
  return (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 20 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        fill="#e9d5ff" 
        fillRule="evenodd" 
        d="M2.25 2A2.25 2.25 0 0 0 0 4.25v11.5A2.25 2.25 0 0 0 2.25 18h15.5A2.25 2.25 0 0 0 20 15.75v-9.5A2.25 2.25 0 0 0 17.75 4H9.871a.75.75 0 0 1-.53-.22L8.22 2.66A2.25 2.25 0 0 0 6.629 2H2.25Z" 
        clipRule="evenodd"
      />
      <path 
        fill="#c4b5fd" 
        fillRule="evenodd" 
        d="M2.25 2A2.25 2.25 0 0 0 0 4.25v11.5A2.25 2.25 0 0 0 2.25 18h15.5A2.25 2.25 0 0 0 20 15.75v-9.5A2.25 2.25 0 0 0 17.75 4H9.871a.75.75 0 0 1-.53-.22L8.22 2.66A2.25 2.25 0 0 0 6.629 2H2.25ZM1.5 4.25a.75.75 0 0 1 .75-.75h4.379a.75.75 0 0 1 .53.22L8.28 4.84a2.25 2.25 0 0 0 1.591.659h7.879a.75.75 0 0 1 .75.75v9.5a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1-.75-.75V8h5.81a.75.75 0 1 0 0-1.5H1.5V4.25Z" 
        clipRule="evenodd" 
        opacity=".6"
      />
      <path 
        stroke="#8b5cf6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth="1.5" 
        d="m14.518 7.501-2.75 3.776 4.544-.798-2.924 3.716" 
        opacity=".75"
      />
    </svg>
  );
};

export default ProjectIcon;