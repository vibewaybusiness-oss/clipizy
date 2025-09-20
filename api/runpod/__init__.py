# runpod_api/__init__.py

from .client import (
    get_runpod_graphql_client,
    get_runpod_rest_client,
    fetchAccountInfo,
    fetchPods,
    fetchPodById,
    createPod_gql,
    stopPod_gql,
    startPod_gql,
    terminatePod_gql,
    fetchGpuTypes_gql,
    fetchCloudTypes_gql,
)

from .account import (
    get_account_info,
    get_account_summary,
    get_active_pods,
    router as account_router,  # expose FastAPI router
)

from .runpod_core import (
    PodManager,
    PodRecruitmentConfig,
    PodRecruitmentResult,
    get_client,
    app as pod_app,  # expose FastAPI app
)

from .runpod_manager import (
    WorkflowQueueManager,
    get_queue_manager,
    router as queue_router,  # expose FastAPI router
)

__all__ = [
    # client
    "get_runpod_graphql_client",
    "get_runpod_rest_client",
    "fetchAccountInfo",
    "fetchPods",
    "fetchPodById",
    "createPod_gql",
    "stopPod_gql",
    "startPod_gql",
    "terminatePod_gql",
    "fetchGpuTypes_gql",
    "fetchCloudTypes_gql",
    # account
    "get_account_info",
    "get_account_summary",
    "get_active_pods",
    "account_router",
    # pod-management
    "PodManager",
    "PodRecruitmentConfig", 
    "PodRecruitmentResult",
    "get_client",
    "pod_app",
    # queue-management
    "WorkflowQueueManager",
    "get_queue_manager",
    "queue_router",
]
