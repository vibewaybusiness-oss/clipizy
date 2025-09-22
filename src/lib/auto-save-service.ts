import { projectsService } from './api/projects';

export const autoSaveService = {
  scheduleSave: (projectId: string, data: any) => {
    projectsService.scheduleSave(projectId, data);
  },
  
  flushAllSaves: () => {
    projectsService.flushAllSaves();
  },
  
  getQueueStatus: () => {
    return projectsService.getQueueStatus();
  }
};
