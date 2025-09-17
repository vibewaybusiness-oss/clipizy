# Vibewave - AI-Powered Music Video Creation

Transform your audio into stunning music videos with the power of AI. Create professional content in minutes, not hours.

## 🏗️ Architecture

### Production (Cloud)
- **Frontend**: Vercel (Next.js)
- **API**: Vercel Functions + Render.com (CPU tasks)
- **GPU Processing**: RunPod (auto-scaling)
- **Storage**: S3/R2 (file storage)
- **Database**: Supabase/Neon (PostgreSQL)
- **CDN**: Cloudflare

### Development (Local)
- **Frontend**: Next.js (localhost:3000)
- **API**: FastAPI (localhost:8000)
- **Storage**: MinIO (localhost:9000)
- **Database**: PostgreSQL (localhost:5432)
- **GPU**: ComfyUI (localhost:8188) or RunPod

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 18+
- Git

### 1. Clone & Setup
```bash
git clone <repository-url>
cd vibewave
```

### 2. Start Local Development Stack
```bash
# Start all services with one command
./app.sh

# Or start individually:
# - MinIO (S3): localhost:9000
# - PostgreSQL: localhost:5432
# - FastAPI: localhost:8000
# - ComfyUI: localhost:8188
# - Next.js: localhost:3000
```

### 3. Access Services
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001 (admin/admin123)
- **ComfyUI**: http://localhost:8188

## 📁 Project Structure

```
vibewave/
├── src/                    # Next.js frontend
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   └── lib/              # Utilities
├── api/                   # FastAPI backend
│   ├── main.py           # FastAPI app
│   ├── models/           # Database models
│   ├── schemas/          # API schemas
│   └── services/         # Business logic
├── public/               # Static assets
└── app.sh               # Development startup script
```

## 🔄 Structured Workflow

User
↳ has many Projects
↳ has many Jobs (global across projects)
↳ has many SocialAccounts

Project
↳ belongs to User
↳ has many Jobs (step orchestration)
↳ has many Tracks, Videos, Images, Audio, Exports, Stats

Job
↳ belongs to User
↳ belongs to Project

## 🔄 Development Workflow


1. **User Upload**: Audio file → FastAPI → MinIO
2. **CPU Analysis**: Music analysis (tempo, key, mood)
3. **GPU Processing**: Video generation via ComfyUI/RunPod
4. **Results**: Final video stored in MinIO/S3
5. **Frontend**: Display results to user

## 🛠️ Development Commands

```bash
# Start all services
./app.sh

# Start individual services
docker run -p 9000:9000 -p 9001:9001 -e "MINIO_ROOT_USER=admin" -e "MINIO_ROOT_PASSWORD=admin123" quay.io/minio/minio server /data --console-address ":9001"

docker run --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

cd api && python start.py

cd src && npm run dev
```

## 🚀 Deployment

### Frontend (Vercel)
- Connect GitHub repository
- Deploy automatically on push

### Backend (Render.com)
- Connect GitHub repository
- Set environment variables
- Deploy automatically

### GPU (RunPod)
- Create RunPod account
- Set up GPU templates
- Configure API keys

## 📚 Documentation

- [API Documentation](./api/README.md)
- [Frontend Documentation](./src/README.md)
- [Development Setup](./README_CONFIG.md)

## 🔧 Local Development Setup

### 1. Storage (S3 replacement)
Use MinIO - an S3-compatible object store that runs locally.

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=admin" \
  -e "MINIO_ROOT_PASSWORD=admin123" \
  quay.io/minio/minio server /data --console-address ":9001"
```

Access UI → http://localhost:9001 (admin/admin123)

### 2. Database (Supabase/Neon replacement)
Use Postgres locally.

```bash
docker run --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

### 3. Backend (Vercel replacement)
FastAPI app for uploads, analysis, and orchestration.

```bash
cd api
python start.py
# API available at: http://localhost:8000
```

### 4. GPU Simulation (RunPod replacement)
If you have a GPU locally, run ComfyUI:

```bash
cd ComfyUI
python3 main.py --listen 0.0.0.0 --port 8188
```

### 5. Frontend
Next.js app for user interface.

```bash
cd src
npm run dev
# Frontend available at: http://localhost:3000
```

## 🔄 Migration to Cloud

Replace components when ready for production:
- `./storage` → S3/R2
- `Local Postgres` → Supabase/Neon
- `Local FastAPI` → Vercel Functions/Render.com
- `Local ComfyUI` → RunPod GPU pods

Since everything talks through APIs and S3, your code doesn't change much when you move to the cloud.

## 📞 Contact

- **Email**: vibeway.business@gmail.com
- **Project**: Vibewave AI Music Video Creation