import os
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

DATA_DIR = os.environ.get("DATA_DIR", "data")
MODELS_ROOT = os.environ.get("MODELS_ROOT", "/tmp/models")
DATA_BUCKET = os.environ.get("DATA_BUCKET", "")
MODELS_BUCKET = os.environ.get("MODELS_BUCKET", "")


def _s3():
    return boto3.client("s3")


def ensure_data_files(start_date: str, end_date: str) -> None:
    if not DATA_BUCKET:
        return

    import pandas as pd

    os.makedirs(DATA_DIR, exist_ok=True)
    s3 = _s3()
    for date in pd.date_range(start=start_date, end=end_date).strftime("%Y%m%d"):
        for prefix in ("race", "odds"):
            key = f"{prefix}_{date}.csv"
            local_path = os.path.join(DATA_DIR, key)
            if os.path.exists(local_path):
                continue
            try:
                s3.download_file(DATA_BUCKET, key, local_path)
            except ClientError:
                continue


def ensure_models_dir(email: str) -> str:
    return refresh_models_dir(email, force=False)


def refresh_models_dir(email: str, force: bool = True) -> str:
    local_dir = os.path.join(MODELS_ROOT, email)
    os.makedirs(local_dir, exist_ok=True)

    if not MODELS_BUCKET:
        return local_dir

    s3 = _s3()
    prefix = f"{email}/"
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=MODELS_BUCKET, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if not key.endswith(".pkl"):
                continue
            filename = Path(key).name
            dest = os.path.join(local_dir, filename)
            if force or not os.path.exists(dest):
                s3.download_file(MODELS_BUCKET, key, dest)
    return local_dir


def list_models_metadata(email: str) -> list[dict]:
    if not MODELS_BUCKET:
        local_dir = os.path.join(MODELS_ROOT, email)
        if not os.path.isdir(local_dir):
            return []
        return _local_models_metadata(local_dir)

    refresh_models_dir(email, force=True)
    local_dir = os.path.join(MODELS_ROOT, email)
    return _local_models_metadata(local_dir)


def _local_models_metadata(local_dir: str) -> list[dict]:
    from datetime import datetime

    files = []
    if not os.path.isdir(local_dir):
        return files
    for fname in os.listdir(local_dir):
        if not fname.endswith(".pkl"):
            continue
        full_path = os.path.join(local_dir, fname)
        if not os.path.isfile(full_path):
            continue
        size = os.path.getsize(full_path)
        mtime = datetime.fromtimestamp(os.path.getmtime(full_path)).strftime(
            "%Y-%m-%d %H:%M:%S"
        )
        files.append({
            "name": fname,
            "size": f"{size // 1024} KB",
            "modified": mtime,
        })
    files.sort(key=lambda item: item["modified"], reverse=True)
    return files


def upload_model(email: str, filename: str) -> None:
    if not MODELS_BUCKET:
        return
    local_path = os.path.join(MODELS_ROOT, email, filename)
    if not os.path.exists(local_path):
        raise FileNotFoundError(f"モデルファイルが見つかりません: {local_path}")
    _s3().upload_file(local_path, MODELS_BUCKET, f"{email}/{filename}")


def sync_models_to_s3(email: str) -> list[str]:
    if not MODELS_BUCKET:
        return []
    local_dir = os.path.join(MODELS_ROOT, email)
    if not os.path.isdir(local_dir):
        return []
    uploaded = []
    for name in os.listdir(local_dir):
        if name.endswith(".pkl"):
            upload_model(email, name)
            uploaded.append(name)
    return uploaded


def delete_model_from_s3(email: str, filename: str) -> None:
    if not MODELS_BUCKET:
        return
    try:
        _s3().delete_object(Bucket=MODELS_BUCKET, Key=f"{email}/{filename}")
    except ClientError:
        pass
