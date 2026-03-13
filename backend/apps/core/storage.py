"""
Vasati Core — MinIO file upload utility.
Handles document uploads (KYC, lease docs, receipts) to MinIO S3.
"""
from django.conf import settings
from minio import Minio
from minio.error import S3Error
import uuid
import logging

logger = logging.getLogger(__name__)


def get_minio_client():
    """Create MinIO client from settings."""
    return Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_USE_SSL,
    )


def ensure_bucket():
    """Create the bucket if it doesn't exist."""
    client = get_minio_client()
    bucket = settings.MINIO_BUCKET_NAME
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)
        logger.info(f"Created MinIO bucket: {bucket}")


def upload_file(file_obj, folder: str = 'documents', content_type: str = None) -> str:
    """
    Upload a file to MinIO. Returns the object path.
    folder: subfolder in bucket (e.g. 'kyc', 'leases', 'receipts')
    """
    client = get_minio_client()
    bucket = settings.MINIO_BUCKET_NAME

    ext = file_obj.name.rsplit('.', 1)[-1] if '.' in file_obj.name else 'bin'
    object_name = f"{folder}/{uuid.uuid4().hex}.{ext}"

    try:
        ensure_bucket()
        client.put_object(
            bucket,
            object_name,
            file_obj,
            length=file_obj.size,
            content_type=content_type or file_obj.content_type or 'application/octet-stream',
        )
        logger.info(f"Uploaded to MinIO: {object_name}")
        return object_name
    except S3Error as e:
        logger.error(f"MinIO upload failed: {e}")
        raise


def get_file_url(object_name: str, expires_hours: int = 24) -> str:
    """Generate a presigned URL for downloading a file."""
    from datetime import timedelta
    client = get_minio_client()
    bucket = settings.MINIO_BUCKET_NAME
    try:
        url = client.presigned_get_object(
            bucket, object_name,
            expires=timedelta(hours=expires_hours),
        )
        return url
    except S3Error as e:
        logger.error(f"MinIO presigned URL failed: {e}")
        return ''
