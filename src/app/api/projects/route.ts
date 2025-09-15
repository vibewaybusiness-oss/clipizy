import { NextRequest, NextResponse } from 'next/server';
import { VideoProject } from '../../../../@videomaking/types';

// Mock database - in a real app, this would be a database
let projects: VideoProject[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      return NextResponse.json(project);
    }
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const project: VideoProject = await request.json();
    
    // Validate project
    if (!project.name || !project.id) {
      return NextResponse.json({ error: 'Invalid project data' }, { status: 400 });
    }
    
    // Check if project already exists
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    if (existingIndex >= 0) {
      // Update existing project
      projects[existingIndex] = { ...project, updatedAt: new Date() };
    } else {
      // Add new project
      projects.push({ ...project, createdAt: new Date(), updatedAt: new Date() });
    }
    
    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Error saving project:', error);
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const project: VideoProject = await request.json();
    
    // Validate project
    if (!project.id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    // Find and update project
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    if (existingIndex >= 0) {
      projects[existingIndex] = { ...project, updatedAt: new Date() };
      return NextResponse.json({ success: true, project: projects[existingIndex] });
    } else {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    const existingIndex = projects.findIndex(p => p.id === projectId);
    
    if (existingIndex >= 0) {
      projects.splice(existingIndex, 1);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
