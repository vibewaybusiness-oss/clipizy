"""
Automation Pipeline Service
Orchestrates automated content creation and publishing workflows
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from api.models import Project, Export, Job, SocialAccount
from api.services.social_media_service import SocialMediaService
from api.services.job_service import JobService
from api.services.export_service import ExportService
from api.storage.json_store import JSONStore
import logging

logger = logging.getLogger(__name__)

class AutomationPipeline:
    def __init__(self, json_store: JSONStore):
        self.json_store = json_store
        self.social_media_service = SocialMediaService(json_store)
        self.job_service = JobService(json_store)
        self.export_service = ExportService(None, json_store)  # Storage will be injected

    async def create_automated_workflow(
        self, 
        db: Session, 
        user_id: str, 
        workflow_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create an automated workflow for content creation and publishing"""
        try:
            # Create project
            project = Project(
                id=uuid.uuid4(),
                user_id=user_id,
                name=workflow_config.get('name', 'Automated Workflow'),
                type='music-clip',
                status='active',
                settings=workflow_config.get('settings', {}),
                created_at=datetime.utcnow()
            )
            db.add(project)
            db.commit()
            db.refresh(project)

            # Create workflow jobs
            jobs = []
            
            # Music analysis job
            if workflow_config.get('enable_music_analysis', True):
                music_job = await self._create_job(
                    db, project.id, user_id, 'music_analysis',
                    {'auto_analyze': True}, 0
                )
                jobs.append(music_job)

            # Video generation job
            if workflow_config.get('enable_video_generation', True):
                video_job = await self._create_job(
                    db, project.id, user_id, 'video_generation',
                    workflow_config.get('video_settings', {}), 10
                )
                jobs.append(video_job)

            # Export job
            export_job = await self._create_job(
                db, project.id, user_id, 'export',
                workflow_config.get('export_settings', {}), 5
            )
            jobs.append(export_job)

            # Publishing jobs for each platform
            publishing_jobs = []
            for platform in workflow_config.get('publish_platforms', []):
                publish_job = await self._create_job(
                    db, project.id, user_id, 'publish',
                    {
                        'platform': platform,
                        'publish_options': workflow_config.get('publish_options', {}),
                        'auto_publish': True
                    }, 2
                )
                publishing_jobs.append(publish_job)

            # Store workflow configuration
            workflow_data = {
                'id': str(uuid.uuid4()),
                'project_id': str(project.id),
                'user_id': user_id,
                'config': workflow_config,
                'jobs': [str(job.id) for job in jobs + publishing_jobs],
                'status': 'created',
                'created_at': datetime.utcnow().isoformat()
            }
            
            self.json_store.save_item(
                f"users/{user_id}/workflows/{workflow_data['id']}.json",
                workflow_data
            )

            return {
                'success': True,
                'workflow_id': workflow_data['id'],
                'project_id': str(project.id),
                'jobs_created': len(jobs + publishing_jobs),
                'status': 'created'
            }

        except Exception as e:
            logger.error(f"Failed to create automated workflow: {e}")
            raise

    async def execute_workflow(
        self, 
        db: Session, 
        workflow_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """Execute an automated workflow"""
        try:
            # Load workflow configuration
            workflow_data = self.json_store.load_item(
                f"users/{user_id}/workflows/{workflow_id}.json"
            )
            
            if not workflow_data:
                raise ValueError("Workflow not found")

            # Update status
            workflow_data['status'] = 'running'
            workflow_data['started_at'] = datetime.utcnow().isoformat()
            self.json_store.save_item(
                f"users/{user_id}/workflows/{workflow_id}.json",
                workflow_data
            )

            # Execute jobs in sequence
            results = []
            for job_id in workflow_data['jobs']:
                job = db.query(Job).filter(Job.id == job_id).first()
                if not job:
                    continue

                # Execute job
                result = await self._execute_job(db, job, workflow_data['config'])
                results.append({
                    'job_id': str(job.id),
                    'job_type': job.type,
                    'result': result
                })

            # Update workflow status
            workflow_data['status'] = 'completed'
            workflow_data['completed_at'] = datetime.utcnow().isoformat()
            workflow_data['results'] = results
            self.json_store.save_item(
                f"users/{user_id}/workflows/{workflow_id}.json",
                workflow_data
            )

            return {
                'success': True,
                'workflow_id': workflow_id,
                'status': 'completed',
                'results': results
            }

        except Exception as e:
            logger.error(f"Failed to execute workflow: {e}")
            # Update status to failed
            try:
                workflow_data = self.json_store.load_item(
                    f"users/{user_id}/workflows/{workflow_id}.json"
                )
                if workflow_data:
                    workflow_data['status'] = 'failed'
                    workflow_data['error'] = str(e)
                    workflow_data['failed_at'] = datetime.utcnow().isoformat()
                    self.json_store.save_item(
                        f"users/{user_id}/workflows/{workflow_id}.json",
                        workflow_data
                    )
            except:
                pass
            
            raise

    async def schedule_recurring_workflow(
        self,
        db: Session,
        user_id: str,
        workflow_config: Dict[str, Any],
        schedule: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Schedule a recurring automated workflow"""
        try:
            # Create workflow
            workflow_result = await self.create_automated_workflow(
                db, user_id, workflow_config
            )
            
            # Create schedule entry
            schedule_data = {
                'id': str(uuid.uuid4()),
                'workflow_id': workflow_result['workflow_id'],
                'user_id': user_id,
                'schedule': schedule,
                'next_run': self._calculate_next_run(schedule),
                'status': 'active',
                'created_at': datetime.utcnow().isoformat()
            }
            
            self.json_store.save_item(
                f"users/{user_id}/schedules/{schedule_data['id']}.json",
                schedule_data
            )

            # Schedule the workflow execution
            asyncio.create_task(
                self._run_scheduled_workflow(db, schedule_data['id'], user_id)
            )

            return {
                'success': True,
                'schedule_id': schedule_data['id'],
                'workflow_id': workflow_result['workflow_id'],
                'next_run': schedule_data['next_run']
            }

        except Exception as e:
            logger.error(f"Failed to schedule recurring workflow: {e}")
            raise

    async def _create_job(
        self, 
        db: Session, 
        project_id: str, 
        user_id: str, 
        job_type: str, 
        params: Dict[str, Any], 
        credits: int
    ) -> Job:
        """Create a job for the workflow"""
        job = Job(
            id=uuid.uuid4(),
            project_id=project_id,
            user_id=user_id,
            type=job_type,
            params=params,
            credits_spent=credits,
            status='pending',
            created_at=datetime.utcnow()
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    async def _execute_job(
        self, 
        db: Session, 
        job: Job, 
        workflow_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a specific job in the workflow"""
        try:
            if job.type == 'music_analysis':
                # Execute music analysis
                result = await self.job_service.run_job(db, job, None)
                return {'status': 'completed', 'result': result}

            elif job.type == 'video_generation':
                # Execute video generation
                result = await self.job_service.run_job(db, job, None)
                return {'status': 'completed', 'result': result}

            elif job.type == 'export':
                # Execute export
                result = await self.job_service.run_job(db, job, None)
                return {'status': 'completed', 'result': result}

            elif job.type == 'publish':
                # Execute publishing
                platform = job.params.get('platform')
                publish_options = job.params.get('publish_options', {})
                
                # Get the latest export for this project
                export = db.query(Export).filter(
                    Export.project_id == job.project_id
                ).order_by(Export.created_at.desc()).first()
                
                if not export:
                    return {'status': 'failed', 'error': 'No export found'}

                result = await self.social_media_service.publish_video(
                    db, export, platform, job.user_id, publish_options
                )
                return {'status': 'completed', 'result': result}

            else:
                return {'status': 'skipped', 'reason': 'Unknown job type'}

        except Exception as e:
            logger.error(f"Failed to execute job {job.id}: {e}")
            return {'status': 'failed', 'error': str(e)}

    def _calculate_next_run(self, schedule: Dict[str, Any]) -> str:
        """Calculate the next run time based on schedule"""
        now = datetime.utcnow()
        
        if schedule['type'] == 'daily':
            next_run = now + timedelta(days=1)
        elif schedule['type'] == 'weekly':
            next_run = now + timedelta(weeks=1)
        elif schedule['type'] == 'monthly':
            next_run = now + timedelta(days=30)
        else:
            next_run = now + timedelta(hours=1)
        
        return next_run.isoformat()

    async def _run_scheduled_workflow(
        self, 
        db: Session, 
        schedule_id: str, 
        user_id: str
    ):
        """Run a scheduled workflow"""
        try:
            # Load schedule
            schedule_data = self.json_store.load_item(
                f"users/{user_id}/schedules/{schedule_id}.json"
            )
            
            if not schedule_data or schedule_data['status'] != 'active':
                return

            # Check if it's time to run
            next_run = datetime.fromisoformat(schedule_data['next_run'])
            if datetime.utcnow() < next_run:
                # Reschedule for later
                asyncio.create_task(
                    self._run_scheduled_workflow(db, schedule_id, user_id)
                )
                return

            # Execute workflow
            await self.execute_workflow(db, schedule_data['workflow_id'], user_id)

            # Update next run time
            schedule_data['next_run'] = self._calculate_next_run(schedule_data['schedule'])
            schedule_data['last_run'] = datetime.utcnow().isoformat()
            self.json_store.save_item(
                f"users/{user_id}/schedules/{schedule_id}.json",
                schedule_data
            )

            # Schedule next run
            asyncio.create_task(
                self._run_scheduled_workflow(db, schedule_id, user_id)
            )

        except Exception as e:
            logger.error(f"Failed to run scheduled workflow: {e}")

    async def get_workflow_status(
        self, 
        workflow_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """Get the status of a workflow"""
        try:
            workflow_data = self.json_store.load_item(
                f"users/{user_id}/workflows/{workflow_id}.json"
            )
            
            if not workflow_data:
                raise ValueError("Workflow not found")

            return {
                'workflow_id': workflow_id,
                'status': workflow_data['status'],
                'created_at': workflow_data['created_at'],
                'started_at': workflow_data.get('started_at'),
                'completed_at': workflow_data.get('completed_at'),
                'failed_at': workflow_data.get('failed_at'),
                'error': workflow_data.get('error'),
                'results': workflow_data.get('results', [])
            }

        except Exception as e:
            logger.error(f"Failed to get workflow status: {e}")
            raise
