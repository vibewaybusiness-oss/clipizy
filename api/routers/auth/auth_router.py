from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.db import get_db
from api.schemas import UserCreate, UserRead, UserLogin, Token
from api.schemas.auth.oauth import OAuthTokenRequest, OAuthResponse
from api.models import User
from api.services import auth_service
from api.services.auth.oauth_service import oauth_service
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = auth_service.verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    user_id = payload.get("sub")
    user = auth_service.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user

@router.post("/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and return authentication tokens"""
    # Check if user with this email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="A user with this email address already exists. Please use a different email or try logging in."
        )
    
    user = auth_service.create_user(db, user_data)
    
    # Create access and refresh tokens
    access_token = auth_service.create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "name": user.username
    })
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.username,
            "avatar": user.avatar_url,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
        },
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer", 
        "expires_in": 604800  # 7 days
    }

@router.post("/login")
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return authentication tokens with user data"""
    user = auth_service.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Update last login
    auth_service.update_user_last_login(db, str(user.id))
    
    # Create access and refresh tokens
    access_token = auth_service.create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "name": user.username
    })
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.username,
            "avatar": user.avatar_url,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
        },
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer", 
        "expires_in": 604800  # 7 days
    }

@router.post("/refresh")
def refresh_token(
    request: dict,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        # Extract refresh token from request body
        refresh_token = request.get("refresh_token")
        if not refresh_token:
            raise HTTPException(status_code=400, detail="Refresh token required")
        
        # Verify refresh token
        payload = auth_service.verify_refresh_token(refresh_token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        user_id = payload.get("sub")
        user = auth_service.get_user_by_id(db, user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        # Create new access token
        access_token = auth_service.create_access_token(data={
            "sub": str(user.id),
            "email": user.email,
            "name": user.username
        })
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 604800  # 7 days
        }
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(status_code=401, detail="Token refresh failed")

@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/google")
def google_auth():
    """Get Google OAuth URL"""
    auth_url = oauth_service.get_google_auth_url()
    return {"auth_url": auth_url}

@router.get("/github")
def github_auth():
    """Get GitHub OAuth URL"""
    auth_url = oauth_service.get_github_auth_url()
    return {"auth_url": auth_url}

@router.get("/debug")
def debug_oauth_config():
    """Debug OAuth configuration"""
    import os
    return {
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID", "NOT_SET")[:10] + "...",
        "google_client_secret": os.getenv("GOOGLE_CLIENT_SECRET", "NOT_SET")[:10] + "...",
        "oauth_redirect_uri": os.getenv("OAUTH_REDIRECT_URI", "NOT_SET"),
        "github_client_id": os.getenv("GITHUB_CLIENT_ID", "NOT_SET"),
        "github_client_secret": os.getenv("GITHUB_CLIENT_SECRET", "NOT_SET")[:10] + "..."
    }

@router.post("/test-callback")
async def test_oauth_callback(request: dict, db: Session = Depends(get_db)):
    """Test OAuth callback with detailed error information"""
    try:
        code = request.get("code")
        if not code:
            return {"error": "No code provided in request"}
            
        logger.info(f"Test callback received code: {code[:10]}...")
        
        # Test the OAuth service directly
        oauth_user_info = await oauth_service.get_google_user_info(code)
        logger.info(f"OAuth user info result: {oauth_user_info}")
        
        if not oauth_user_info:
            return {"error": "Failed to get user info from Google", "code_received": code[:10] + "..."}
        
        return {"success": True, "user_info": oauth_user_info}
        
    except Exception as e:
        logger.error(f"Test callback error: {str(e)}")
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc(), "code_received": code[:10] + "..." if code else "None"}

@router.post("/test")
def test_post():
    """Test POST endpoint"""
    print("DEBUG: Test POST endpoint called")
    return {"message": "POST endpoint works"}

@router.post("/google/callback", response_model=OAuthResponse)
async def google_callback(token_data: OAuthTokenRequest, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    print("DEBUG: Google OAuth callback endpoint called")
    logger.info("DEBUG: Google OAuth callback endpoint called")
    try:
        logger.info(f"Google OAuth callback received code: {token_data.code[:10]}...")
        print(f"DEBUG: Google OAuth callback received code: {token_data.code[:10]}...")
        # Get user info from Google
        oauth_user_info = await oauth_service.get_google_user_info(token_data.code)
        logger.info(f"Google OAuth user info result: {oauth_user_info}")
        if not oauth_user_info:
            logger.error("Failed to get user info from Google - oauth_user_info is None")
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")

        # Get or create user
        user = oauth_service.get_or_create_user(db, oauth_user_info)
        if not user:
            raise HTTPException(status_code=400, detail="Failed to create or find user")

        # Update last login
        auth_service.update_user_last_login(db, str(user.id))

        # Create access and refresh tokens
        access_token = auth_service.create_access_token(data={
            "sub": str(user.id),
            "email": user.email,
            "name": user.username
        })
        refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
        
        return OAuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": str(user.id),
                "email": user.email,
                "name": user.username,
                "avatar": user.avatar_url,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
            }
        )

    except Exception as e:
        logger.error(f"Google OAuth callback error: {str(e)}")
        print(f"DEBUG: Google OAuth callback error: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=f"OAuth authentication failed: {str(e)}")

@router.post("/github/callback", response_model=OAuthResponse)
async def github_callback(token_data: OAuthTokenRequest, db: Session = Depends(get_db)):
    """Handle GitHub OAuth callback"""
    try:
        # Get user info from GitHub
        oauth_user_info = await oauth_service.get_github_user_info(token_data.code)
        if not oauth_user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info from GitHub")

        # Get or create user
        user = oauth_service.get_or_create_user(db, oauth_user_info)
        if not user:
            raise HTTPException(status_code=400, detail="Failed to create or find user")

        # Update last login
        auth_service.update_user_last_login(db, str(user.id))

        # Create access and refresh tokens
        access_token = auth_service.create_access_token(data={
            "sub": str(user.id),
            "email": user.email,
            "name": user.username
        })
        refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
        
        return OAuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": str(user.id),
                "email": user.email,
                "name": user.username,
                "avatar": user.avatar_url,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
            }
        )

    except Exception as e:
        logger.error(f"GitHub OAuth callback error: {str(e)}")
        raise HTTPException(status_code=400, detail="OAuth authentication failed")
