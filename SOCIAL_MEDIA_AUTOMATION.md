# 🚀 Social Media Automation Pipeline

A comprehensive automation system for YouTube, TikTok, and Instagram API integrations with automated content publishing workflows.

## 🎯 Overview

This system provides:
- **Multi-platform OAuth integration** (YouTube, TikTok, Instagram)
- **Automated video publishing** with customizable options
- **Workflow automation** with scheduling and templates
- **Analytics tracking** across all platforms
- **Batch publishing** capabilities
- **Error handling and retry logic**

## 🏗️ Architecture

### Backend Components

```
api/
├── services/
│   ├── social_media_service.py      # Core social media API integrations
│   └── automation_pipeline.py       # Workflow orchestration
├── routers/
│   ├── social_media_router.py       # Social media API endpoints
│   └── automation_router.py         # Automation API endpoints
├── models/
│   └── social_account.py            # Database model for connected accounts
└── schemas/
    └── social_account.py            # Pydantic schemas
```

### Frontend Components

```
src/components/social-media/
├── SocialMediaManager.tsx           # Main management interface
└── PublishDialog.tsx                # Video publishing dialog
```

## 🔧 Setup & Configuration

### 1. Environment Variables

Add these to your `.env` file:

```bash
# YouTube API
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback

# TikTok API
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_REDIRECT_URI=http://localhost:3000/auth/tiktok/callback

# Instagram API
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback
```

### 2. Database Migration

The system automatically creates the required tables on startup. The `social_accounts` table stores OAuth tokens and account information.

### 3. API Registration

Register for API access with each platform:

- **YouTube**: [Google Cloud Console](https://console.cloud.google.com/)
- **TikTok**: [TikTok for Business](https://business.tiktok.com/)
- **Instagram**: [Facebook Developers](https://developers.facebook.com/)

## 📡 API Endpoints

### Social Media Management

#### Connect Account
```http
POST /api/social-media/connect/{platform}
Content-Type: application/json

{
  "access_token": "oauth_access_token",
  "refresh_token": "oauth_refresh_token",
  "expires_in": 3600
}
```

#### Get Connected Accounts
```http
GET /api/social-media/accounts
```

#### Disconnect Account
```http
DELETE /api/social-media/accounts/{account_id}
```

#### Publish Video
```http
POST /api/social-media/publish/{export_id}
Content-Type: application/json

{
  "platforms": ["youtube", "tiktok", "instagram"],
  "publish_options": {
    "title": "My Amazing Video",
    "description": "Check out this awesome content!",
    "tags": ["music", "viral", "trending"],
    "privacy": "public",
    "thumbnail_url": "https://example.com/thumb.jpg"
  }
}
```

#### Get Analytics
```http
GET /api/social-media/analytics/{stats_id}
```

### Automation Pipeline

#### Create Workflow
```http
POST /api/automation/workflows
Content-Type: application/json

{
  "name": "Daily Music Clip",
  "enable_music_analysis": true,
  "enable_video_generation": true,
  "publish_platforms": ["youtube", "tiktok"],
  "publish_options": {
    "title": "Daily Music Clip - {date}",
    "description": "Automated music clip created on {date}",
    "privacy": "public"
  },
  "video_settings": {
    "style": "modern",
    "duration": 60
  }
}
```

#### Execute Workflow
```http
POST /api/automation/workflows/{workflow_id}/execute
```

#### Create Schedule
```http
POST /api/automation/schedules
Content-Type: application/json

{
  "workflow_config": { /* workflow configuration */ },
  "schedule": {
    "type": "daily",
    "time": "09:00"
  }
}
```

#### Get Workflow Templates
```http
GET /api/automation/templates
```

## 🎬 Usage Examples

### 1. Connect Social Media Accounts

```typescript
// Connect YouTube account
const connectYouTube = async () => {
  const response = await fetch('/api/social-media/connect/youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: 'your_oauth_token',
      refresh_token: 'your_refresh_token',
      expires_in: 3600
    })
  });
  
  const result = await response.json();
  console.log('Connected:', result);
};
```

### 2. Publish Video to Multiple Platforms

```typescript
const publishVideo = async (exportId: string) => {
  const response = await fetch(`/api/social-media/publish/${exportId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platforms: ['youtube', 'tiktok', 'instagram'],
      publish_options: {
        title: 'My Amazing Music Video',
        description: 'Check out this awesome music video!',
        tags: ['music', 'viral', 'trending'],
        privacy: 'public'
      }
    })
  });
  
  const result = await response.json();
  console.log('Published:', result);
};
```

### 3. Create Automated Workflow

```typescript
const createDailyWorkflow = async () => {
  const response = await fetch('/api/automation/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Daily Music Clip',
      enable_music_analysis: true,
      enable_video_generation: true,
      publish_platforms: ['youtube', 'tiktok'],
      publish_options: {
        title: 'Daily Music Clip - {date}',
        description: 'Automated music clip created on {date}',
        privacy: 'public'
      },
      video_settings: {
        style: 'modern',
        duration: 60
      }
    })
  });
  
  const result = await response.json();
  console.log('Workflow created:', result);
};
```

## 🔄 Workflow Templates

### Daily Music Clip
- **Schedule**: Daily at 9:00 AM
- **Platforms**: YouTube, TikTok
- **Features**: Music analysis, video generation, auto-publishing

### Weekly Trending Content
- **Schedule**: Weekly on Monday at 10:00 AM
- **Platforms**: YouTube, Instagram, TikTok
- **Features**: Trend analysis, viral content generation

### Monthly Compilation
- **Schedule**: Monthly on the 1st at 12:00 PM
- **Platforms**: YouTube
- **Features**: Best content compilation, longer format

## 🛡️ Security & Best Practices

### OAuth Token Management
- Tokens are encrypted and stored securely
- Automatic token refresh before expiration
- Secure token transmission over HTTPS

### Error Handling
- Comprehensive error logging
- Retry logic for failed operations
- Graceful degradation for API failures

### Rate Limiting
- Respects platform API rate limits
- Implements exponential backoff
- Queue management for high-volume operations

## 📊 Analytics & Monitoring

### Tracked Metrics
- **Publishing Success Rate**: Percentage of successful uploads
- **Platform Performance**: Views, likes, comments per platform
- **Workflow Execution**: Success/failure rates for automated workflows
- **Token Health**: OAuth token expiration and refresh status

### Monitoring Dashboard
- Real-time status of all connected accounts
- Workflow execution history
- Performance metrics and trends
- Error logs and alerts

## 🚨 Error Handling

### Common Issues & Solutions

1. **OAuth Token Expired**
   - System automatically refreshes tokens
   - Fallback to manual re-authentication

2. **Platform API Rate Limits**
   - Implements exponential backoff
   - Queues requests for later processing

3. **Video Upload Failures**
   - Retry with different compression settings
   - Fallback to alternative upload methods

4. **Network Connectivity**
   - Automatic retry with increasing delays
   - Offline queue for later processing

## 🔮 Future Enhancements

### Planned Features
- **AI-powered content optimization** for each platform
- **Cross-platform analytics dashboard**
- **Advanced scheduling** with timezone support
- **Content performance prediction**
- **A/B testing** for titles and descriptions
- **Bulk operations** for multiple videos
- **Custom workflow builder** with drag-and-drop interface

### Platform Expansions
- **Twitter/X** integration
- **LinkedIn** video publishing
- **Twitch** streaming integration
- **Pinterest** video pins

## 📝 Development Notes

### Testing
- Mock API responses for development
- Integration tests for OAuth flows
- End-to-end testing for workflows

### Performance
- Async processing for all API calls
- Background job processing
- Caching for frequently accessed data

### Scalability
- Horizontal scaling support
- Database connection pooling
- Queue-based processing for high volume

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This is a comprehensive social media automation system. Make sure to comply with each platform's terms of service and API usage policies when implementing in production.
