The file start-service.sh must be moved to the workspace and 
RunPod lets you specify a Container Command (startup command) in the template.
In your Pod Template settings → set startup command to:

bash /workspace/start-services.sh