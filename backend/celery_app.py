import os
from celery import Celery

def make_celery(app_name=__name__):
    # Use env var for broker URL, default to local redis
    redis_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    
    celery = Celery(app_name, broker=redis_url, backend=redis_url)
    
    celery.conf.update(
        broker_connection_retry_on_startup=True,
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        task_track_started=True
    )
    return celery

celery = make_celery()
