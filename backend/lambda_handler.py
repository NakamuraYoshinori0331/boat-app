import json

from mangum import Mangum

from main import app

_mangum = Mangum(app, lifespan="off")


def handler(event, context):
    if event.get("job_worker"):
        import jobs

        jobs.run_job(
            event["job_id"],
            event["job_type"],
            event["user_email"],
        )
        return {"statusCode": 200, "body": "ok"}

    if isinstance(event, str):
        try:
            event = json.loads(event)
            if event.get("job_worker"):
                import jobs

                jobs.run_job(
                    event["job_id"],
                    event["job_type"],
                    event["user_email"],
                )
                return {"statusCode": 200, "body": "ok"}
        except json.JSONDecodeError:
            pass

    return _mangum(event, context)
