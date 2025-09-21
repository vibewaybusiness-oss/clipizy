# Vercel Deployment Guide for clipizi API

This guide explains how to deploy the clipizi API to Vercel with optimizations for the serverless environment.

## 🚨 Important Changes Made

### 1. Vercel-Compatible Requirements
- **File**: `requirements-vercel.txt`
- **Changes**: Removed heavy ML libraries (torch, librosa, essentia, CUDA dependencies)
- **Reason**: These libraries are too large and require system-level dependencies not available in Vercel

### 2. Optimized Main Application
- **File**: `api/vercel_main.py`
- **Changes**: Lightweight version without heavy ML dependencies
- **Features**: Conditional imports, fallback services, reduced memory usage

### 3. Compatibility Layer
- **File**: `api/services/vercel_compatibility.py`
- **Purpose**: Provides fallback implementations when ML libraries are unavailable
- **Features**: Basic audio analysis, genre detection, peak detection

### 4. Vercel Configuration
- **File**: `vercel.json`
- **Settings**: Optimized for Python serverless functions
- **Limits**: 50MB max lambda size, 30s max duration

## 📋 Deployment Steps

### Step 1: Prepare Your Repository
```bash
# Copy the Vercel-compatible requirements
cp requirements-vercel.txt requirements.txt

# Ensure vercel.json is in the root directory
# Ensure api/vercel_main.py exists
```

### Step 2: Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project root
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? [Your account]
# - Link to existing project? No
# - Project name: clipizi-api
# - Directory: ./
# - Override settings? No
```

### Step 3: Configure Environment Variables
In your Vercel dashboard, add these environment variables:
```
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
CORS_ORIGINS=["http://localhost:3000", "https://your-frontend.vercel.app"]
```

## 🔧 Configuration Details

### Vercel.json Settings
- **maxLambdaSize**: 50mb (Vercel limit)
- **maxDuration**: 30s (Vercel limit)
- **Python Version**: 3.12 (latest supported)

### Memory and Performance
- **Cold Start**: ~2-3 seconds
- **Memory Usage**: Optimized for 128MB-512MB
- **Timeout**: 30 seconds max

## ⚠️ Limitations in Vercel Environment

### Unavailable Features
1. **Heavy ML Processing**: librosa, torch, essentia
2. **GPU Acceleration**: CUDA libraries
3. **Large File Processing**: Limited to 10MB uploads
4. **Long-running Tasks**: 30s timeout limit

### Fallback Implementations
1. **Audio Analysis**: Basic metadata extraction
2. **Music Analysis**: Simplified genre detection
3. **Peak Detection**: Time-based simulation
4. **Feature Extraction**: Basic file properties

## 🚀 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app.vercel.app/health
```

### 2. ML Status Check
```bash
curl https://your-app.vercel.app/ml-status
```

### 3. API Documentation
Visit: `https://your-app.vercel.app/docs`

## 🔄 Switching Between Environments

### For Local Development (Full ML)
```bash
# Use original requirements.txt
pip install -r requirements.txt
python api/main.py
```

### For Vercel Deployment (Lightweight)
```bash
# Use Vercel-compatible requirements
pip install -r requirements-vercel.txt
python api/vercel_main.py
```

## 📊 Monitoring and Debugging

### Vercel Dashboard
- Monitor function executions
- View logs and errors
- Check performance metrics

### Logs
```bash
# View real-time logs
vercel logs

# View logs for specific function
vercel logs --function=api/vercel_main.py
```

## 🛠️ Troubleshooting

### Common Issues

1. **Build Timeout**
   - Solution: Reduce dependencies in requirements.txt
   - Check: No heavy ML libraries

2. **Memory Limit Exceeded**
   - Solution: Use fallback services
   - Check: Optimize data processing

3. **Function Timeout**
   - Solution: Break down long operations
   - Check: Use background jobs for heavy processing

4. **Import Errors**
   - Solution: Use conditional imports
   - Check: Fallback implementations available

### Debug Mode
Set environment variable:
```
DEBUG=true
```

## 📈 Performance Optimization

### 1. Cold Start Reduction
- Minimize imports
- Use lazy loading
- Cache frequently used data

### 2. Memory Usage
- Process data in chunks
- Use generators instead of lists
- Clear unused variables

### 3. Response Time
- Use async/await
- Implement caching
- Optimize database queries

## 🔐 Security Considerations

### Environment Variables
- Never commit secrets
- Use Vercel's environment variable system
- Rotate keys regularly

### CORS Configuration
- Set appropriate origins
- Avoid wildcard (*) in production
- Use HTTPS only

## 📝 Next Steps

1. **Test all endpoints** in Vercel environment
2. **Monitor performance** and optimize as needed
3. **Set up monitoring** and alerting
4. **Configure CI/CD** for automatic deployments
5. **Consider upgrading** to Vercel Pro for higher limits

## 🆘 Support

If you encounter issues:
1. Check Vercel logs
2. Review this guide
3. Test locally with `requirements-vercel.txt`
4. Contact support with specific error messages
