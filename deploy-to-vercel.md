# 🚀 Deploy to Vercel (5 minutes)

## Step 1: Prepare Your Code

```bash
# Make sure everything is committed
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up/Login with GitHub**
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure settings:**
   - Framework Preset: `Next.js`
   - Root Directory: `./` (or leave default)
   - Build Command: `npm run build`
   - Output Directory: `.next` (or leave default)

## Step 3: Add Environment Variables

In Vercel dashboard → Project Settings → Environment Variables:

```env
RUNPOD_API_KEY=your_runpod_api_key_here
NEXT_PUBLIC_API_URL=https://your-app-name.vercel.app
NODE_ENV=production
```

## Step 4: Deploy!

Click **"Deploy"** and wait 2-3 minutes.

## Step 5: Test Your Deployment

Your app will be available at: `https://your-app-name.vercel.app`

## Step 6: Update RunPod Configuration

Update your RunPod config to use the production URLs:

```typescript
// In your RunPod integration
const config = {
  serverAddress: "your-runpod-pod-ip:8188",
  outputDir: "/workspace/ComfyUI/output",
  inputDir: "/workspace/ComfyUI/input"
}
```

## 🎉 Done!

Your website is now live and ready to use RunPod for AI generation!

### **Next Steps:**
1. Test the deployment
2. Set up RunPod pods
3. Configure auto-scaling
4. Monitor costs

### **Cost:**
- **Vercel**: FREE
- **RunPod**: $5-50/month (depending on usage)
- **Total**: $5-50/month
