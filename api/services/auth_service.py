"""
Authentication service for user management
"""
from sqlalchemy.orm import Session
from api.models import User
from api.schemas import UserCreate, UserLogin
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from api.config.logging import get_auth_logger

# Initialize logger
logger = get_auth_logger()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days for refresh tokens

class AuthService:
    def __init__(self):
        logger.info("AuthService initialized")
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            result = pwd_context.verify(plain_password, hashed_password)
            logger.debug(f"Password verification {'successful' if result else 'failed'}")
            return result
        except Exception as e:
            logger.error(f"Password verification error: {str(e)}")
            return False
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        try:
            hashed = pwd_context.hash(password)
            logger.debug("Password hashed successfully")
            return hashed
        except Exception as e:
            logger.error(f"Password hashing error: {str(e)}")
            raise
    
    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password"""
        logger.info(f"Attempting to authenticate user: {email}")
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                logger.warning(f"User not found: {email}")
                return None
            
            if not self.verify_password(password, user.hashed_password):
                logger.warning(f"Invalid password for user: {email}")
                return None
            
            logger.info(f"User authenticated successfully: {email}")
            return user
        except Exception as e:
            logger.error(f"Authentication error for user {email}: {str(e)}")
            return None
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create a JWT access token"""
        try:
            to_encode = data.copy()
            if expires_delta:
                expire = datetime.utcnow() + expires_delta
            else:
                expire = datetime.utcnow() + timedelta(days=7)  # 7 days for access token
            to_encode.update({"exp": expire, "type": "access"})
            encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
            logger.info(f"Access token created for user: {data.get('sub', 'unknown')}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Token creation error: {str(e)}")
            raise
    
    def create_refresh_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create a JWT refresh token"""
        try:
            to_encode = data.copy()
            if expires_delta:
                expire = datetime.utcnow() + expires_delta
            else:
                expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
            to_encode.update({"exp": expire, "type": "refresh"})
            encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
            logger.info(f"Refresh token created for user: {data.get('sub', 'unknown')}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Refresh token creation error: {str(e)}")
            raise
    
    def verify_refresh_token(self, token: str) -> Optional[dict]:
        """Verify a refresh token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "refresh":
                return None
            return payload
        except JWTError:
            return None
    
    def create_user(self, db: Session, user: UserCreate) -> User:
        """Create a new user with complete setup"""
        logger.info(f"Creating new user: {user.email}")
        try:
            from api.services.user_creation_service import user_creation_service
            
            # Use comprehensive user creation service
            db_user = user_creation_service.create_user_complete(db, user)
            logger.info(f"User created successfully with complete setup: {user.email} (ID: {db_user.id})")
            return db_user
        except Exception as e:
            logger.error(f"User creation error for {user.email}: {str(e)}")
            db.rollback()
            raise
    
    def verify_token(self, token: str) -> Optional[dict]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            logger.debug(f"Token verified for user: {payload.get('sub', 'unknown')}")
            return payload
        except JWTError as e:
            logger.warning(f"Token verification failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return None
    
    def get_user_by_id(self, db: Session, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                logger.debug(f"User found: {user.email}")
            else:
                logger.warning(f"User not found with ID: {user_id}")
            return user
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {str(e)}")
            return None
    
    def update_user_last_login(self, db: Session, user_id: str) -> bool:
        """Update user's last login timestamp"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.last_login = datetime.utcnow()
                db.commit()
                logger.debug(f"Updated last login for user: {user.email}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error updating last login for user {user_id}: {str(e)}")
            return False

# Create a default instance
auth_service = AuthService()
