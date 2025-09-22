"""
OAuth service for Google and GitHub authentication
"""
import os
import json
import httpx
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from api.models import User
from api.services import auth_service
from api.config.settings import settings

logger = logging.getLogger(__name__)

class OAuthService:
    def __init__(self):
        # Load Google OAuth credentials from JSON file
        try:
            with open("api/config/client_secret_google_api.json", "r") as f:
                google_creds = json.load(f)
                self.GOOGLE_CLIENT_ID = google_creds["web"]["client_id"]
                self.google_client_secret = google_creds["web"]["client_secret"]
        except (FileNotFoundError, KeyError) as e:
            logger.error(f"Failed to load Google OAuth credentials: {e}")
            self.GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
            self.google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        
        # GitHub OAuth credentials from environment variables
        self.OAUTH_GITHUB_CLIENT_ID = os.getenv("OAUTH_GITHUB_CLIENT_ID")
        self.github_client_secret = os.getenv("GITHUB_CLIENT_SECRET")
        # Use centralized frontend URL from settings
        self.redirect_uri = os.getenv("OAUTH_REDIRECT_URI", f"{settings.frontend_url}/auth/callback")

    async def get_google_user_info(self, code: str) -> Optional[Dict[str, Any]]:
        """Get user info from Google OAuth"""
        try:
            # Use instance variables instead of reading environment variables dynamically
            GOOGLE_CLIENT_ID = self.GOOGLE_CLIENT_ID
            google_client_secret = self.google_client_secret
            redirect_uri = self.redirect_uri
            
            logger.info(f"Google OAuth - Client ID: {GOOGLE_CLIENT_ID[:10]}...")
            logger.info(f"Google OAuth - Client Secret: {google_client_secret[:10] if google_client_secret else 'None'}...")
            logger.info(f"Google OAuth - Redirect URI: {redirect_uri}")
            logger.info(f"Google OAuth - Code: {code[:10]}...")
            
            # Exchange code for access token
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            }

            async with httpx.AsyncClient() as client:
                token_response = await client.post(token_url, data=token_data)
                logger.info(f"Google token response status: {token_response.status_code}")
                if not token_response.is_success:
                    error_text = token_response.text
                    logger.error(f"Google token exchange failed: {error_text}")
                    logger.error(f"Request data: {token_data}")
                    raise Exception(f"Google token exchange failed: {error_text}")
                token_response.raise_for_status()
                token_info = token_response.json()

                access_token = token_info["access_token"]

                # Get user info
                user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
                headers = {"Authorization": f"Bearer {access_token}"}
                
                user_response = await client.get(user_info_url, headers=headers)
                user_response.raise_for_status()
                user_info = user_response.json()

                return {
                    "id": user_info["id"],
                    "email": user_info["email"],
                    "name": user_info.get("name"),
                    "picture": user_info.get("picture"),
                    "provider": "google"
                }

        except Exception as e:
            logger.error(f"Google OAuth error: {str(e)}")
            print(f"DEBUG: Google OAuth error: {str(e)}")
            return None

    async def get_github_user_info(self, code: str) -> Optional[Dict[str, Any]]:
        """Get user info from GitHub OAuth"""
        try:
            # Use instance variables instead of reading environment variables dynamically
            OAUTH_GITHUB_CLIENT_ID = self.OAUTH_GITHUB_CLIENT_ID
            github_client_secret = self.github_client_secret
            
            # Exchange code for access token
            token_url = "https://github.com/login/oauth/access_token"
            token_data = {
                "client_id": OAUTH_GITHUB_CLIENT_ID,
                "client_secret": github_client_secret,
                "code": code,
            }

            async with httpx.AsyncClient() as client:
                token_response = await client.post(
                    token_url, 
                    data=token_data,
                    headers={"Accept": "application/json"}
                )
                token_response.raise_for_status()
                token_info = token_response.json()

                access_token = token_info["access_token"]

                # Get user info
                user_info_url = "https://api.github.com/user"
                headers = {"Authorization": f"Bearer {access_token}"}
                
                user_response = await client.get(user_info_url, headers=headers)
                user_response.raise_for_status()
                user_info = user_response.json()

                # Get user email if not public
                email = user_info.get("email")
                if not email:
                    email_response = await client.get(
                        "https://api.github.com/user/emails", 
                        headers=headers
                    )
                    if email_response.status_code == 200:
                        emails = email_response.json()
                        primary_email = next(
                            (e["email"] for e in emails if e.get("primary")), 
                            None
                        )
                        if primary_email:
                            email = primary_email

                return {
                    "id": str(user_info["id"]),
                    "email": email or f"{user_info['login']}@github.local",
                    "name": user_info.get("name") or user_info.get("login"),
                    "picture": user_info.get("avatar_url"),
                    "provider": "github"
                }

        except Exception as e:
            logger.error(f"GitHub OAuth error: {str(e)}")
            return None

    def get_or_create_user(self, db: Session, oauth_user_info: Dict[str, Any]) -> Optional[User]:
        """Get existing user or create new one from OAuth info with complete setup"""
        try:
            # Try to find existing user by email
            user = db.query(User).filter(User.email == oauth_user_info["email"]).first()
            
            if user:
                # Update user info if needed
                if not user.username and oauth_user_info.get("name"):
                    user.username = oauth_user_info["name"]
                if not user.avatar_url and oauth_user_info.get("picture"):
                    user.avatar_url = oauth_user_info["picture"]
                
                # Update OAuth provider info
                if not user.settings:
                    user.settings = {}
                user.settings["oauth_provider"] = oauth_user_info["provider"]
                user.settings["created_via"] = "oauth"
                
                db.commit()
                return user

            # Create new user with complete setup
            from api.schemas import UserCreate
            # Import here to avoid circular dependency
            from api.services.user_creation_service import user_creation_service
            
            user_data = UserCreate(
                email=oauth_user_info["email"],
                password="",  # OAuth users don't have passwords
                name=oauth_user_info.get("name", ""),
            )
            
            # Use comprehensive user creation service
            new_user = user_creation_service.create_user_complete(
                db, 
                user_data, 
                oauth_provider=oauth_user_info["provider"]
            )
            
            # Update with OAuth-specific info
            if oauth_user_info.get("picture"):
                new_user.avatar_url = oauth_user_info["picture"]
            if oauth_user_info.get("name"):
                new_user.username = oauth_user_info["name"]
            
            db.commit()
            db.refresh(new_user)
            
            logger.info(f"Created new OAuth user with complete setup: {new_user.email}")
            return new_user

        except Exception as e:
            logger.error(f"Error creating OAuth user: {str(e)}")
            db.rollback()
            return None

    def get_google_auth_url(self) -> str:
        """Generate Google OAuth URL"""
        # Use instance variables instead of reading environment variables dynamically
        GOOGLE_CLIENT_ID = self.GOOGLE_CLIENT_ID
        redirect_uri = self.redirect_uri
        
        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": "openid email profile",
            "response_type": "code",
            "access_type": "offline",
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"

    def get_github_auth_url(self) -> str:
        """Generate GitHub OAuth URL"""
        # Use instance variables instead of reading environment variables dynamically
        OAUTH_GITHUB_CLIENT_ID = self.OAUTH_GITHUB_CLIENT_ID
        redirect_uri = self.redirect_uri
        
        params = {
            "client_id": OAUTH_GITHUB_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": "user:email",
            "response_type": "code",
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"https://github.com/login/oauth/authorize?{query_string}"

# Create service instance
oauth_service = OAuthService()
