import json
import os
import traceback
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import boto3
from botocore.exceptions import ClientError

JOBS_TABLE = os.environ.get("JOBS_TABLE", "")
LAMBDA_FUNCTION_NAME = os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "")


def _table():
    return boto3.resource("dynamodb").Table(JOBS_TABLE)


def jobs_enabled() -> bool:
    return bool(JOBS_TABLE)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_job(user_email: str, job_type: str, payload: dict) -> str:
    job_id = str(uuid.uuid4())
    ttl = int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())
    item = {
        "job_id": job_id,
        "user_email": user_email,
        "job_type": job_type,
        "status": "pending",
        "payload": json.dumps(payload, ensure_ascii=False),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "ttl": ttl,
    }
    _table().put_item(Item=item)
    return job_id


def update_job(job_id: str, **fields: Any) -> None:
    names: dict[str, str] = {"#updated_at": "updated_at"}
    values: dict[str, Any] = {":updated_at": _now_iso()}
    sets = ["#updated_at = :updated_at"]

    for key, value in fields.items():
        attr = f"#{key}"
        val = f":{key}"
        names[attr] = key
        if key in ("payload", "result") and isinstance(value, (dict, list)):
            values[val] = json.dumps(value, ensure_ascii=False, default=str)
        else:
            values[val] = value
        sets.append(f"{attr} = {val}")

    _table().update_item(
        Key={"job_id": job_id},
        UpdateExpression="SET " + ", ".join(sets),
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )


def get_job(job_id: str) -> Optional[dict]:
    try:
        resp = _table().get_item(Key={"job_id": job_id})
    except ClientError:
        return None
    item = resp.get("Item")
    if not item:
        return None
    return _deserialize_job(item)


def _deserialize_job(item: dict) -> dict:
    job = dict(item)
    for key in ("payload", "result"):
        raw = job.get(key) or ""
        if isinstance(raw, str) and raw:
            try:
                job[key] = json.loads(raw)
            except json.JSONDecodeError:
                job[key] = raw
        elif not raw:
            job[key] = None
    return job


def invoke_async(job_id: str, job_type: str, user_email: str) -> None:
    if not LAMBDA_FUNCTION_NAME:
        raise RuntimeError("AWS_LAMBDA_FUNCTION_NAME is not set")

    boto3.client("lambda").invoke(
        FunctionName=LAMBDA_FUNCTION_NAME,
        InvocationType="Event",
        Payload=json.dumps({
            "job_worker": True,
            "job_id": job_id,
            "job_type": job_type,
            "user_email": user_email,
        }),
    )


def run_job(job_id: str, job_type: str, user_email: str) -> None:
    job = get_job(job_id)
    if not job:
        return
    if job.get("status") not in ("pending", "running"):
        return

    update_job(job_id, status="running")
    payload = job.get("payload") or {}

    try:
        if job_type == "train":
            result = _run_train(payload, user_email)
        elif job_type == "simulation":
            result = _run_simulation(payload, user_email)
        else:
            raise ValueError(f"Unknown job type: {job_type}")

        update_job(job_id, status="completed", result=result)
    except Exception as exc:
        print(f"job {job_id} failed:", traceback.format_exc())
        update_job(job_id, status="failed", error=str(exc))


def _models_dir_for_email(email: str) -> str:
    import storage

    if os.environ.get("MODELS_BUCKET"):
        return storage.ensure_models_dir(email)
    path = os.path.join("models", email)
    os.makedirs(path, exist_ok=True)
    return path


def _run_train(payload: dict, user_email: str) -> dict:
    import storage
    import train

    models_dir = _models_dir_for_email(user_email)
    train.run_train(
        payload["model_name"],
        payload["start_date"],
        payload["end_date"],
        payload["stadium"],
        payload["features"],
        models_dir,
    )
    storage.sync_models_to_s3(user_email)
    return {"message": "学習完了"}


def _run_simulation(payload: dict, user_email: str) -> dict:
    import simulate

    models_dir = _models_dir_for_email(user_email)
    model = payload["model"].replace(".pkl", "")
    result = simulate.simulate(
        model,
        models_dir,
        payload["start_date"],
        payload["end_date"],
        payload["stadium"],
        payload["top_n"],
        payload["min_odds"],
        payload["max_odds"],
        payload["min_probability"],
        sort_by=payload.get("sort_by", "probability"),
        min_kitaichi=payload.get("min_kitaichi", 0),
        max_bets_per_race=payload.get("max_bets_per_race", 0),
    )
    return {
        "simulation": result,
        "params_used": payload,
        "model": f"{model}.pkl",
    }
