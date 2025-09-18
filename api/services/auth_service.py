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
                expire = datetime.utcnow() + timedelta(minutes=15)
            to_encode.update({"exp": expire})
            encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
            logger.info(f"Access token created for user: {data.get('sub', 'unknown')}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Token creation error: {str(e)}")
            raise
    
    def create_user(self, db: Session, user: UserCreate) -> User:
        """Create a new user"""
        logger.info(f"Creating new user: {user.email}")
        try:
            hashed_password = self.get_password_hash(user.password)
            db_user = User(
                email=user.email,
                hashed_password=hashed_password,
                username=user.name
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            logger.info(f"User created successfully: {user.email} (ID: {db_user.id})")
            return db_user
        except Exception as e:
            logger.error(f"User creation error for {user.email}: {str(e)}")
            db.rollback()
            raise

# Create a default instance
auth_service = AuthService()
