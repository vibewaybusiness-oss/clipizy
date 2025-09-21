# clipizi Backend API


godaddy:

Microsoft
admin@clipizy.com
PWD=clipiziouiOUI2007@@@


FastAPI backend for AI-powered music video creation platform.

## 🏗️ Architecture

- **CPU Tasks**: Music analysis and orchestration (Render.com)
- **GPU Tasks**: Video generation and processing (RunPod)
- **Storage**: S3/MinIO for file storage
- **Database**: PostgreSQL (production) / SQLite (development)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd api
pip install -r requirements.txt
```

### 2. Environment Setup

```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Run the Server

```bash
# From the api/ directory
python start.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# From the root directory
python api/run.py

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📁 Project Structure

```
api/
├── main.py                 # FastAPI application
├── config.py              # Configuration management
├── db.py                  # Database setup
├── requirements.txt       # Python dependencies
├── models/                # SQLAlchemy models
│   ├── project.py
│   ├── user.py
│   └── job.py
├── schemas/               # Pydantic schemas
│   ├── project.py
│   ├── user.py
│   └── job.py
└── services/              # Business logic
    ├── storage.py         # S3/MinIO operations
    ├── analysis.py        # Music analysis
    ├── runpod.py          # GPU orchestration
    └── auth.py            # Authentication
```

```
S3
users/ 
└── user-id 
├── music-clip/ 
│ ├── project_123/ 
│ │ ├── script.json 
│ │ │ ├── music/ 
│ │ │ │ └── track1.wav 
│ │ │ ├── final_video/ 
│ │ │ │ └── final_video1.mp4 
│ │ │ ├── video/ 
│ │ │ │ ├── video1.mp4 
│ │ │ │ ├── video2.mp4 
│ │ │ │ └── ... 
│ │ │ ├── image/ 
│ │ │ │ ├── image1.png 
│ │ │ │ ├── image2.png 
│ │ │ │ └── ... 
│ │ │ ├── thumbnail/ 
│ │ │ │ ├── thumbnail1.png 
│ │ │ │ ├── thumbnail2.png 
│ │ │ │ └── ... 
│ │ └── stats.json 
│ └── project_456/ ... 
├── video-clip/ 
│ ├── project_123/ 
│ │ ├── script.json 
│ │ ├── music/ 
│ │ │ └── track1.wav 
│ │ ├── final_video/ 
│ │ │ └── final_video1.mp4 
│ │ ├── video/ 
│ │ │ ├── video1.mp4 
│ │ │ ├── video2.mp4 
│ │ │ └── ... 
│ │ ├── image/ 
│ │ │ ├── image1.png 
│ │ │ ├── image2.png 
│ │ │ └── ... 
│ │ ├── thumbnail/ 
│ │ │ ├── thumbnail1.png 
│ │ │ ├── thumbnail2.png 
│ │ │ └── ... 
│ │ │ ├── audio/ 
│ │ │ │ ├── audio1.wav 
│ │ │ │ ├── audio2.wav 
│ │ │ │ └── ... 
│ │ └── stats.json 
│ └── project_456/ ... 
├── short-clip/ 
│ ├── project_123/ 
│ │ ├── script.json 
│ │ ├── music/ 
│ │ │ └── track1.wav 
│ │ ├── final_video/ 
│ │ │ └── final_video1.mp4 
│ │ ├── video/ 
│ │ │ ├── video1.mp4 
│ │ │ ├── video2.mp4 
│ │ │ └── ... 
│ │ ├── image/ 
│ │ │ ├── image1.png 
│ │ │ ├── image2.png 
│ │ │ └── ... 
│ │ ├── thumbnail/ 
│ │ │ ├── thumbnail1.png 
│ │ │ ├── thumbnail2.png 
│ │ │ └── ... 
│ │ │ ├── audio/ 
│ │ │ │ ├── audio1.wav 
│ │ │ │ ├── audio2.wav 
│ │ │ │ └── ... 
│ │ └── stats.json 
│ └── project_456/ ...
```

```
## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:///./clipizi.db` |
| `S3_ENDPOINT` | S3/MinIO endpoint | `http://127.0.0.1:9000` |
| `S3_ACCESS_KEY` | S3 access key | `admin` |
| `S3_SECRET_KEY` | S3 secret key | `admin123` |
| `S3_BUCKET` | S3 bucket name | `clipizi` |
| `RUNPOD_API_KEY` | RunPod API key | `changeme` |
| `SECRET_KEY` | JWT secret key | `your-secret-key` |

## 📚 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user info

### Projects
- `POST /projects` - Create new project
- `GET /projects` - List user projects
- `GET /projects/{id}` - Get project details
- `POST /projects/{id}/upload` - Upload audio file
- `GET /projects/{id}/status` - Get project status

### Jobs
- `GET /jobs` - List user jobs
- `GET /jobs/{id}` - Get job details

### Analysis
- `POST /analysis/music` - Analyze music file

### RunPod
- `POST /runpod/pods` - Create RunPod instance
- `GET /runpod/pods/{id}` - Get RunPod status

## 🔄 Workflow

1. **User Upload**: Audio file uploaded to S3
2. **CPU Analysis**: Music analyzed locally (tempo, key, mood, etc.)
3. **GPU Processing**: Video generation queued on RunPod
4. **Results**: Final video stored in S3

## 🛠️ Development

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migration
alembic upgrade head
```

### Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=.
```

## 🚀 Deployment

### Render.com (CPU Tasks)

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### RunPod (GPU Tasks)

1. Create RunPod account
2. Set up GPU templates
3. Configure API keys

### S3/MinIO (Storage)

1. Set up S3-compatible storage
2. Configure bucket policies
3. Set CORS rules

## 📊 Monitoring

- Health check: `GET /health`
- API documentation: `GET /docs`
- ReDoc documentation: `GET /redoc`

## 🔒 Security

- JWT authentication
- Password hashing with bcrypt
- CORS configuration
- File type validation
- Rate limiting (recommended)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details
