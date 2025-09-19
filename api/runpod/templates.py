# runpod_api/templates.py

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import asyncio
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

# Load environment variables (.env then .env.local)
load_dotenv(dotenv_path=Path.cwd() / ".env")
load_dotenv(dotenv_path=Path.cwd() / ".env.local")

# Adjust import path to wherever your REST client lives.
# Expected interface: client.get_templates(include_public: bool, include_private: bool, include_runpod: bool)
from .client import get_runpod_rest_client  # type: ignore

router = APIRouter(prefix="/templates", tags=["templates"])


# ---------- Models ----------

class Template(BaseModel):
    id: str
    name: str
    imageName: str
    isPublic: bool
    isRunpod: bool
    isServerless: bool
    category: Optional[str] = ""
    ports: List[str] = Field(default_factory=list)
    env: Dict[str, str] = Field(default_factory=dict)
    containerDiskInGb: int = 0
    volumeInGb: int = 0
    volumeMountPath: Optional[str] = ""
    dockerEntrypoint: List[str] = Field(default_factory=list)
    dockerStartCmd: List[str] = Field(default_factory=list)
    readme: Optional[str] = ""
    earned: Optional[float] = 0
    runtimeInMin: Optional[int] = None
    containerRegistryAuthId: Optional[str] = None


class TemplatesResponse(BaseModel):
    data: List[Template]


# ---------- Service function (module API) ----------

async def list_templates() -> None:
    """
    Console-friendly function that mirrors the TS script:
    - Lists all templates (public/private/runpod)
    - Prints private templates with details
    - Tries to find a 'Startup' template
    - Shows first 5 RunPod-official templates
    """
    print("📋 LISTING RUNPOD TEMPLATES")
    print("=" * 50)
    try:
        client = get_runpod_rest_client()
        # Include all: public, private, runpod (true, true, true)
        response: Dict[str, Any] = await client.get_templates(True, True, True)

        if "data" in response and isinstance(response["data"], list):
            templates = [Template.model_validate(t) for t in response["data"]]
            print(f"✅ Found {len(templates)} templates\n")

            private_templates = [t for t in templates if (not t.isPublic and not t.isRunpod)]
            print(f"🔒 Private Templates ({len(private_templates)}):")
            print("=" * 30)

            for idx, t in enumerate(private_templates, start=1):
                print(f"\n{idx}. {t.name}")
                print(f"   ID: {t.id}")
                print(f"   Image: {t.imageName}")
                print(f"   Category: {t.category or '—'}")
                print(f"   Ports: {', '.join(t.ports) if t.ports else 'None'}")
                print(f"   Container Disk: {t.containerDiskInGb}GB")
                print(f"   Volume: {t.volumeInGb}GB at {t.volumeMountPath or '—'}")
                print(f"   Serverless: {'Yes' if t.isServerless else 'No'}")
                if t.dockerStartCmd:
                    print(f"   Start Command: {' '.join(t.dockerStartCmd)}")
                if t.dockerEntrypoint:
                    print(f"   Entrypoint: {' '.join(t.dockerEntrypoint)}")
                if t.env:
                    print("   Environment Variables:")
                    for k, v in t.env.items():
                        print(f"     {k}={v}")
                if t.readme:
                    snippet = (t.readme or "")[:100]
                    print(f"   Description: {snippet}...")

            # Find “Startup Template”
            def is_startup(x: Template) -> bool:
                n = (x.name or "").lower()
                return ("startup" in n) or ("template" in n)

            startup = next((t for t in private_templates if is_startup(t)), None)
            if startup:
                print("\n🎯 FOUND STARTUP TEMPLATE:")
                print("=" * 30)
                print(f"Name: {startup.name}")
                print(f"ID: {startup.id}")
                print(f"Image: {startup.imageName}")
                print(f"Ports: {', '.join(startup.ports) if startup.ports else 'None'}")
                print(f"Start Command: {' '.join(startup.dockerStartCmd) if startup.dockerStartCmd else 'None'}")
                print(f"Entrypoint: {' '.join(startup.dockerEntrypoint) if startup.dockerEntrypoint else 'None'}")
                if startup.env:
                    print("Environment Variables:")
                    for k, v in startup.env.items():
                        print(f"  {k}={v}")
            else:
                print('\n❌ No template found with "Startup" in the name')
                print("Available private template names:")
                for t in private_templates:
                    print(f"  - {t.name}")

            runpod_templates = [t for t in templates if t.isRunpod]
            print(f"\n🏢 RunPod Official Templates ({len(runpod_templates)}):")
            print("=" * 40)
            for i, t in enumerate(runpod_templates[:5], start=1):
                print(f"{i}. {t.name} ({t.id})")
                print(f"   Image: {t.imageName}")
                print(f"   Ports: {', '.join(t.ports) if t.ports else 'None'}")
            if len(runpod_templates) > 5:
                print(f"   ... and {len(runpod_templates) - 5} more")

        else:
            print("❌ No templates found or invalid response format")
            print("Response:", response)

    except Exception as exc:
        print("❌ Error listing templates:", exc)


# ---------- HTTP Endpoints (optional) ----------

@router.get("", response_model=List[Template])
async def http_list_templates(
    include_public: bool = Query(True),
    include_private: bool = Query(True),
    include_runpod: bool = Query(True),
) -> List[Template]:
    client = get_runpod_rest_client()
    result: Dict[str, Any] = await client.get_templates(include_public, include_private, include_runpod)
    if "data" not in result or not isinstance(result["data"], list):
        raise HTTPException(status_code=502, detail="Invalid response from RunPod API")
    return [Template.model_validate(t) for t in result["data"]]


@router.get("/private", response_model=List[Template])
async def http_list_private_templates() -> List[Template]:
    client = get_runpod_rest_client()
    result: Dict[str, Any] = await client.get_templates(True, True, True)
    data = [Template.model_validate(t) for t in (result.get("data") or [])]
    return [t for t in data if (not t.isPublic and not t.isRunpod)]


@router.get("/runpod", response_model=List[Template])
async def http_list_runpod_official_templates() -> List[Template]:
    client = get_runpod_rest_client()
    result: Dict[str, Any] = await client.get_templates(True, True, True)
    data = [Template.model_validate(t) for t in (result.get("data") or [])]
    return [t for t in data if t.isRunpod]


@router.get("/startup", response_model=Template)
async def http_find_startup_template() -> Template:
    client = get_runpod_rest_client()
    result: Dict[str, Any] = await client.get_templates(True, True, True)
    data = [Template.model_validate(t) for t in (result.get("data") or [])]
    private_templates = [t for t in data if (not t.isPublic and not t.isRunpod)]
    for t in private_templates:
        n = (t.name or "").lower()
        if "startup" in n or "template" in n:
            return t
    raise HTTPException(status_code=404, detail='No private template matching "startup" found')


# ---------- CLI entry (mirrors Node’s `if (require.main === module)`) ----------

if __name__ == "__main__":
    # Run the async function directly when invoked as a script:
    asyncio.run(list_templates())
