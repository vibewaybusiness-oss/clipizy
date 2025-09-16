"""
Authentication service for user management
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
try:
    from ..models.user import User
    from ..schemas.user import UserCreate, UserLogin
    from ..config import settings
except ImportError:
    from models.user import User
    from schemas.user import UserCreate, UserLogin
    from config import settings
import logging

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self):
        self.secret_key = settings.secret_key
        self.algorithm = settings.algorithm
        self.access_token_expire_minutes = settings.access_token_expire_minutes

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)

    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None

    def create_user(self, db: Session, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.email == user_data.email) | (User.username == user_data.username)
        ).first()
        
        if existing_user:
            if existing_user.email == user_data.email:
                raise ValueError("Email already registered")
            else:
                raise ValueError("Username already taken")
        
        # Create new user
        hashed_password = self.get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            full_name=user_data.full_name
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"Created new user: {user_data.email}")
        return db_user

    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password"""
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            return None
        
        if not self.verify_password(password, user.hashed_password):
            return None
        
        if not user.is_active:
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        logger.info(f"User authenticated: {email}")
        return user

    def get_user_by_id(self, db: Session, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()

    def update_user(self, db: Session, user_id: str, update_data: Dict[str, Any]) -> Optional[User]:
        """Update user information"""
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return None
        
        for key, value in update_data.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        logger.info(f"Updated user: {user.email}")
        return user

    def change_password(self, db: Session, user_id: str, old_password: str, new_password: str) -> bool:
        """Change user password"""
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return False
        
        if not self.verify_password(old_password, user.hashed_password):
            return False
        
        user.hashed_password = self.get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Password changed for user: {user.email}")
        return True

    def deactivate_user(self, db: Session, user_id: str) -> bool:
        """Deactivate a user account"""
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return False
        
        user.is_active = False
        user.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Deactivated user: {user.email}")
        return True

    def generate_reset_token(self, email: str) -> str:
        """Generate a password reset token"""
        data = {"email": email, "type": "password_reset"}
        return self.create_access_token(data, timedelta(hours=1))

    def verify_reset_token(self, token: str) -> Optional[str]:
        """Verify a password reset token and return email"""
        payload = self.verify_token(token)
        
        if not payload:
            return None
        
        if payload.get("type") != "password_reset":
            return None
        
        return payload.get("email")

    def reset_password(self, db: Session, email: str, new_password: str) -> bool:
        """Reset user password"""
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            return False
        
        user.hashed_password = self.get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Password reset for user: {email}")
        return True


# Global auth service instance
auth_service = AuthService()
