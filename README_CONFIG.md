 [ User Browser ]
       │
       │ 1. Upload music + settings (project request)
       ▼
 [ Vercel Backend ]
       │
       ├──► (a) Store uploads in S3/R2
       │
       ├──► (b) Run CPU-based music analysis directly
       │       (FFT, beat detection, segmentation, etc.)
       │
       ├──► (c) Save analysis results back to S3/R2
       │
       ├──► (d) Update DB (Supabase/Neon) with project + file metadata
       │
       ├──► (e) If video generation needed:
       │        Call RunPod API → start GPU pod with /workspace mounted
       │
       │
       ▼
 [ RunPod GPU Pod ]
       │
       ├──► Access project files (from S3) + models (/workspace)
       ├──► Run ComfyUI / Ollama workflows
       ├──► Save generated videos/images to S3
       │
       ▼
 [ S3/R2 Storage ]
       │
       └──► Holds:
              - Original music files
              - Analysis JSON
              - Generated videos/images
              - Logs/metadata
       ▼
 [ Vercel Frontend ]
       │
       └──► Polls / subscribes via DB for:
              - Job progress
              - File-by-file results
              - Final video download link