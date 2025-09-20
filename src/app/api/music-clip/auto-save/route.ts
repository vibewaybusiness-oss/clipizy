import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('Auto-save API route called');
    
    const body = await request.json();
    console.log('Auto-save data received:', {
      projectId: body.projectId,
      timestamp: body.timestamp,
      hasMusicClipData: !!body.musicClipData,
      hasTracksData: !!body.tracksData,
    });
    
    const { projectId, musicClipData, tracksData } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Update project settings if we have music clip data
    if (musicClipData?.settings) {
      try {
        const settingsUrl = `${BACKEND_URL}/music-clip/projects/${projectId}/settings`;
        console.log('Updating project settings via auto-save:', settingsUrl);
        
        const response = await fetch(settingsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(musicClipData.settings),
        });
        
        if (!response.ok) {
          console.error('Failed to update project settings:', response.status);
        } else {
          console.log('Project settings updated successfully via auto-save');
        }
      } catch (error) {
        console.error('Error updating project settings via auto-save:', error);
      }
    }
    
    // Update tracks if we have track data
    if (tracksData?.musicTracks && tracksData.musicTracks.length > 0) {
      try {
        // Update track descriptions and genres
        for (const track of tracksData.musicTracks) {
          const updates: any = {};
          
          // Use individual descriptions from music clip data
          if (musicClipData?.individualDescriptions?.[track.id]) {
            updates.video_description = musicClipData.individualDescriptions[track.id];
          }
          if (tracksData.trackGenres?.[track.id]) {
            updates.genre = tracksData.trackGenres[track.id];
          }
          
          if (Object.keys(updates).length > 0) {
            const trackUrl = `${BACKEND_URL}/music-clip/projects/${projectId}/tracks/${track.id}`;
            console.log(`Updating track ${track.id} via auto-save:`, updates);
            
            const response = await fetch(trackUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updates),
            });
            
            if (!response.ok) {
              console.error(`Failed to update track ${track.id} via auto-save:`, response.status);
            } else {
              console.log(`Track ${track.id} updated successfully via auto-save`);
            }
          }
        }
      } catch (error) {
        console.error('Error updating tracks via auto-save:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Auto-save completed',
      projectId,
      timestamp: body.timestamp,
    });
    
  } catch (error) {
    console.error('Auto-save API error:', error);
    return NextResponse.json(
      { error: 'Auto-save failed' },
      { status: 500 }
    );
  }
}
