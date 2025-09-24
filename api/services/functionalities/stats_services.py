import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Stats
from api.storage.json_store import JSONStore

class StatsService:
    def __init__(self, json_store: JSONStore, youtube_api=None, tiktok_api=None, instagram_api=None):
        self.json_store = json_store
        self.youtube_api = youtube_api
        self.tiktok_api = tiktok_api
        self.instagram_api = instagram_api

    def fetch_and_store_stats(self, db: Session, export_id: str, user_id: str, project_id: str, platform: str, external_id: str):
        """
        Fetch stats from an external platform and store them in DB + stats.json.
        :param export_id: The export we are tracking.
        :param user_id: Owner of the project.
        :param project_id: Project container.
        :param platform: "youtube" | "tiktok" | "instagram".
        :param external_id: The video ID / post ID on the platform.
        """
        # 1. Fetch stats from API
        data = self._fetch_from_platform(platform, external_id)

        # 2. Save in DB
        stats_id = str(uuid.uuid4())
        stats = Stats(
            id=stats_id,
            export_id=export_id,
            project_id=project_id,
            user_id=user_id,
            platform=platform,
            external_id=external_id,
            views=data.get("views"),
            likes=data.get("likes"),
            comments=data.get("comments"),
            shares=data.get("shares"),
            fetched_at=datetime.utcnow(),
        )
        db.add(stats)
        db.commit()
        db.refresh(stats)

        # 3. Update stats.json in S3
        self.json_store.append_item(
            f"users/{user_id}/projects/music-clip/{project_id}/stats.json",
            "stats",
            {
                "id": stats_id,
                "platform": platform,
                "external_id": external_id,
                "views": data.get("views"),
                "likes": data.get("likes"),
                "comments": data.get("comments"),
                "shares": data.get("shares"),
                "fetched_at": stats.fetched_at.isoformat(),
            },
        )

        return stats

    def _fetch_from_platform(self, platform: str, external_id: str):
        """
        Dispatch to the right API client.
        """
        if platform == "youtube" and self.youtube_api:
            return self.youtube_api.get_video_stats(external_id)
        elif platform == "tiktok" and self.tiktok_api:
            return self.tiktok_api.get_video_stats(external_id)
        elif platform == "instagram" and self.instagram_api:
            return self.instagram_api.get_post_stats(external_id)

        # Default mock for development
        return {
            "views": 0,
            "likes": 0,
            "comments": 0,
            "shares": 0,
        }