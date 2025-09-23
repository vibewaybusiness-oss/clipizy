"""
OAuth service for Google and GitHub authentication
"""
import os
import json
import httpx
import logging
import uuid
import hashlib
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from api.models import User
from .auth_service import auth_service
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

    def generate_email_based_uuid(self, email: str) -> str:
        """Generate a deterministic UUID based on email address"""
        # Create a deterministic UUID based on email
        # This ensures the same email always gets the same UUID
        namespace = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # DNS namespace
        return str(uuid.uuid5(namespace, email.lower().strip()))

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

                # Generate email-based UUID instead of using Google's numeric ID
                email_based_uuid = self.generate_email_based_uuid(user_info["email"])
                
                return {
                    "id": email_based_uuid,  # Use email-based UUID instead of Google ID
                    "email": user_info["email"],
                    "name": user_info.get("name"),
                    "picture": user_info.get("picture"),
                    "provider": "google",
                    "google_id": user_info["id"]  # Store original Google ID for reference
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

                # Generate email-based UUID instead of using GitHub's numeric ID
                user_email = email or f"{user_info['login']}@github.local"
                email_based_uuid = self.generate_email_based_uuid(user_email)
                
                return {
                    "id": email_based_uuid,  # Use email-based UUID instead of GitHub ID
                    "email": user_email,
                    "name": user_info.get("name") or user_info.get("login"),
                    "picture": user_info.get("avatar_url"),
                    "provider": "github",
                    "github_id": str(user_info["id"])  # Store original GitHub ID for reference
                }

        except Exception as e:
            logger.error(f"GitHub OAuth error: {str(e)}")
            return None

    def get_or_create_user(self, db: Session, oauth_user_info: Dict[str, Any]) -> Optional[User]:
        """Get existing user or create new one from OAuth info using unified onboarding"""
        try:
            from api.services.auth.unified_onboarding_service import unified_onboarding_service
            
            # Prepare OAuth data for unified onboarding
            oauth_data = {
                "picture": oauth_user_info.get("picture"),
                "provider": oauth_user_info["provider"]
            }
            
            # Add provider-specific ID
            if oauth_user_info["provider"] == "google" and oauth_user_info.get("google_id"):
                oauth_data["google_id"] = oauth_user_info["google_id"]
            elif oauth_user_info["provider"] == "github" and oauth_user_info.get("github_id"):
                oauth_data["github_id"] = oauth_user_info["github_id"]
            
            # Use unified onboarding service
            user = unified_onboarding_service.onboard_user(
                db=db,
                email=oauth_user_info["email"],
                name=oauth_user_info.get("name"),
                password=None,  # OAuth users don't have passwords
                oauth_provider=oauth_user_info["provider"],
                oauth_data=oauth_data
            )
            
            logger.info(f"OAuth user processed with unified onboarding: {user.email} (ID: {user.id})")
            return user

        except Exception as e:
            logger.error(f"Error processing OAuth user: {str(e)}")
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
