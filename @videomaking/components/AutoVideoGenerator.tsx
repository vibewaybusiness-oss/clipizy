import React from 'react';
import { VideoProject } from '../types';

interface AutoVideoGeneratorProps {
  project: VideoProject;
  onProjectChange: (project: VideoProject) => void;
  className?: string;
}

export const AutoVideoGenerator: React.FC<AutoVideoGeneratorProps> = ({ project, onProjectChange, className }) => {
  return (
    <div className={`auto-video-generator ${className || ''}`}>
      <h3>Auto Video Generator</h3>
      <p>Auto video generation functionality will be implemented here.</p>
      <p>Current project: {project.name}</p>
    </div>
  );
};