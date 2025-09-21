import { NextRequest, NextResponse } from 'next/server';
import { musicClipAPI } from '@/lib/api/music-clip';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { projectId, musicClipData, tracksData, analysisData, timestamp } = data;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    console.log(`Auto-saving data for project ${projectId} at ${new Date(timestamp).toISOString()}`);

    // Save music clip data
    if (musicClipData) {
      try {
        if (musicClipData.settings) {
          await musicClipAPI.updateProjectSettings(projectId, musicClipData.settings);
        }

        if (musicClipData.script) {
          await musicClipAPI.updateProjectScript(projectId, musicClipData.script);
        }
      } catch (error) {
        console.error('Failed to save music clip data:', error);
      }
    }

    // Save tracks data
    if (tracksData && tracksData.musicTracks) {
      try {
        for (const track of tracksData.musicTracks) {
          if (track.file && !track.uploaded) {
            try {
              await musicClipAPI.uploadTrack(projectId, track.file, {
                ai_generated: track.ai_generated || false,
                prompt: track.prompt,
                genre: track.genre,
                instrumental: track.instrumental || false,
                video_description: track.video_description
              });
              track.uploaded = true;
            } catch (error) {
              console.error(`Failed to upload track ${track.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to save tracks data:', error);
      }
    }

    // Save analysis data
    if (analysisData) {
      try {
        await musicClipAPI.updateProjectAnalysis(projectId, analysisData);
      } catch (error) {
        console.error('Failed to save analysis data:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data auto-saved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto-save failed:', error);
    return NextResponse.json(
      { error: 'Auto-save failed' },
      { status: 500 }
    );
  }
}
