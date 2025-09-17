api/services/
├── __init__.py
├── project_service.py   # create/list/update/delete projects
├── track_service.py     # music track handling
├── video_service.py     # video handling
├── image_service.py     # image & thumbnails
├── audio_service.py     # voiceovers, SFX
├── export_service.py    # final deliverables
└── stats_service.py     # analytics sync


Service Responsibilities

ProjectService → handles project lifecycle (create, update, get, archive).
JobService → orchestrates steps inside a project (music, analysis, visuals, export). Each step = job = costs credits.

✅ track_service.py
Upload new track (user upload or AI-generated).

Extract metadata with extract_metadata(..., "music").

Insert into Track table + update script.json.

✅ video_service.py
Upload/generate videos.

Extract metadata with extract_metadata(..., "video").

Store in Video table.

Mark type as draft or final.

✅ image_service.py
Upload covers / generated images.

Extract metadata with extract_metadata(..., "image").

Store in Image table.

✅ audio_service.py
Handle voiceovers, narrations, SFX, stems.

Same flow as tracks, but inserts into Audio.

✅ export_service.py
Finalization step.

Register Export with metadata.

Link exports to Stats later.

✅ stats_service.py
Fetch analytics from YouTube, TikTok, IG.

Store in Stats linked to Export.

Could run as background sync (Celery, RQ, etc.).


__________________________________________________________________________________
