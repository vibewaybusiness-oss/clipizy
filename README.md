# Gmail

Start with Vercel + RunPod hybrid architecture:
Frontend: Vercel (FREE)
API: Vercel (FREE tier)
AI Processing: RunPod (auto-scaling)
Storage: RunPod volumes
CDN: Cloudflare (FREE)

_________________________________________________________________________________

vibeway.business@gmail.com


#TIKTOK 
Vibewave
vibeway.business@gmail.com
ouiOUI2007@





# Firebase Studio

###Start dev Pod:

ssh 7zkcn96uzmhxjp-64411bef@ssh.runpod.io -i C:\Code\waveclip_development_server\studio-main\backend\runpod_api_key


###Copy files:

-> Set runpod api key in home if not done alrey, cd home and paste it
-> chmod 600 ~/runpod_api_key (set it readable/writable lock)
-> Check the pod Direct TCP ports information and replace it below:
    e.g.    194.68.245.18:


From Linux wsl:
scp -i ~/runpod_api_key -P 22092 \
    /home/unix/code/start-service.sh \
    root@194.68.245.31:/workspace/



This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## POD WORKSPACE LAYOUT AND ENTRYPOINT

The repository includes scripts to provision and start pods with a network volume mounted at `/workspace`.

### Layout Created

```
/workspace
├── ComfyUI/
├── models/
│   ├── checkpoints/
│   ├── clip/
│   ├── vae/
│   ├── loras/
│   └── controlnet/
├── workflows/
├── outputs/
│   ├── videos/
│   └── images/
└── api/
```

### Provision Once Per Volume

Mount your volume to `/workspace` in the pod, then run:

```bash
WORKSPACE_DIR=/workspace INSTALL_COMFYUI=false INIT_API=true LINK_MODELS=true ./scripts/provision_workspace.sh
```

Set `INSTALL_COMFYUI=true` to clone ComfyUI into `/workspace/ComfyUI`. When `LINK_MODELS=true`, `ComfyUI/models/*` are symlinked to `/workspace/models/*`.

### Start Services

```bash
# ComfyUI on port 8000
SERVICE=comfyui HOST=0.0.0.0 PORT=8000 ./scripts/entrypoint.sh

# API on port 8000
SERVICE=api HOST=0.0.0.0 PORT=8000 ./scripts/entrypoint.sh

# Both: ComfyUI on 8000, API on 8001
SERVICE=both HOST=0.0.0.0 PORT=8000 API_PORT=8001 ./scripts/entrypoint.sh
```

The API scaffold is created under `/workspace/api` if `INIT_API=true`, exposing `/health` and a `requirements.txt`.

