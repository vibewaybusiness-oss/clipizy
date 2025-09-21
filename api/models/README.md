All objects related to the database are stored in this folder.

The models are used to create the database tables and to validate the data that is stored in the database.
The __init__.py file is used to import the models into the database.


Project = container (metadata + status + S3 path).
Track = music/audio assets.
Video = all generated or uploaded videos (draft + final).
Image = covers, thumbnails, and generated images.
Stats = platform analytics (views/likes).
...

🔗 Why Keep Them Separate?

Matches your S3 layout (video/, image/, thumbnail/, stats.json).
Makes queries clean (e.g., SELECT * FROM videos WHERE project_id=... AND type='final').
Allows projects to have multiple videos and images, but still keep them organized.