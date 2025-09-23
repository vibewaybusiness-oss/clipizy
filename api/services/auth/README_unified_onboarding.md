# Unified Onboarding Service

## Overview

The Unified Onboarding Service provides a consistent user creation and setup process for both email/password and OAuth users. This ensures that all users receive the same comprehensive onboarding experience regardless of how they sign up.

## Key Features

### ✅ **Unified Process**
- Same onboarding flow for email and OAuth users
- Consistent directory structure creation
- Consistent storage setup
- Consistent user settings initialization

### ✅ **Email-Based UUIDs**
- All users get deterministic UUIDs based on their email address
- Same email always generates the same UUID
- Works across all authentication methods

### ✅ **Comprehensive Setup**
- Database user creation
- Directory structure creation
- Profile file initialization
- Storage structure setup
- User settings initialization

### ✅ **Provider Support**
- Google OAuth
- GitHub OAuth
- Email/Password authentication
- Extensible for future providers

## Usage

### For Email Users (Registration)
```python
from api.services.unified_onboarding_service import unified_onboarding_service

user = unified_onboarding_service.onboard_user(
    db=db,
    email="user@example.com",
    name="John Doe",
    password="secure_password",
    oauth_provider=None
)
```

### For OAuth Users (Google/GitHub)
```python
from api.services.unified_onboarding_service import unified_onboarding_service

user = unified_onboarding_service.onboard_user(
    db=db,
    email="user@gmail.com",
    name="John Doe",
    password=None,
    oauth_provider="google",
    oauth_data={
        "picture": "https://example.com/avatar.jpg",
        "google_id": "123456789",
        "provider": "google"
    }
)
```

## Onboarding Process

### 1. **User Existence Check**
- Checks if user already exists by email
- Updates existing user if found
- Creates new user if not found

### 2. **UUID Generation**
- Generates deterministic UUID based on email
- Uses UUID v5 with DNS namespace
- Ensures consistency across sessions

### 3. **Database User Creation**
- Creates user record with proper settings
- Handles password hashing for email users
- Sets appropriate verification status

### 4. **Directory Structure Creation**
```
users/{user_id}/
├── projects/
│   ├── music-clip/
│   ├── video-creation/
│   ├── social-content/
│   ├── automation/
│   └── templates/
├── social-media/
│   ├── accounts/
│   ├── content/
│   ├── schedules/
│   ├── analytics/
│   └── templates/
├── profile/
│   ├── settings/
│   ├── billing/
│   ├── security/
│   ├── preferences/
│   └── notifications/
├── exports/
├── temp/
├── uploads/
├── backups/
└── logs/
```

### 5. **Profile File Initialization**
- `profile.json` - User profile data
- `settings.json` - Application settings
- `billing.json` - Billing information

### 6. **Storage Structure Setup**
- Creates S3 folders for user data
- Sets up project-specific folders
- Initializes social media folders

### 7. **User Settings Initialization**
- Default notification preferences
- Privacy settings
- Security settings
- Application preferences
- Billing information

## Integration Points

### Auth Service Integration
The auth service now uses unified onboarding for email users:
```python
# In api/services/auth_service.py
def create_user(self, db: Session, user: UserCreate) -> User:
    return unified_onboarding_service.onboard_user(
        db=db,
        email=user.email,
        name=user.name,
        password=user.password,
        oauth_provider=None
    )
```

### OAuth Service Integration
The OAuth service now uses unified onboarding for OAuth users:
```python
# In api/services/oauth_service.py
def get_or_create_user(self, db: Session, oauth_user_info: Dict[str, Any]) -> Optional[User]:
    return unified_onboarding_service.onboard_user(
        db=db,
        email=oauth_user_info["email"],
        name=oauth_user_info.get("name"),
        password=None,
        oauth_provider=oauth_user_info["provider"],
        oauth_data=oauth_data
    )
```

## Benefits

### 🎯 **Consistency**
- Same onboarding experience for all users
- Consistent data structure
- Consistent settings initialization

### 🔧 **Maintainability**
- Single service handles all user creation
- Centralized onboarding logic
- Easier to add new features

### 🚀 **Scalability**
- Easy to add new OAuth providers
- Extensible architecture
- Consistent performance

### 🛡️ **Reliability**
- Comprehensive error handling
- Rollback on failure
- Data consistency guarantees

## Migration

Existing users can be migrated to use email-based UUIDs using the migration script:
```bash
python api/migrations/migrate_oauth_user_ids.py
```

## Testing

The service includes comprehensive testing for:
- Email-based UUID generation
- User creation process
- Directory structure creation
- Settings initialization
- Error handling

## Future Enhancements

- Support for additional OAuth providers
- Custom onboarding flows
- User preference templates
- Advanced directory structures
- Integration with external services
