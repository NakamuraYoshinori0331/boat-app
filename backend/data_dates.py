import os
import re
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

DATA_DIR = os.environ.get("DATA_DIR", "data")
DATA_BUCKET = os.environ.get("DATA_BUCKET", "")
_DATE_RE = re.compile(r"^(race|odds)_(\d{8})\.csv$")


def _has_data_rows(path: str) -> bool:
    if not os.path.exists(path):
        return False
    with open(path, encoding="utf-8") as f:
        return sum(1 for _ in f) > 1


def _dates_from_local() -> set[str]:
    data_dir = Path(DATA_DIR)
    race_dates: set[str] = set()
    odds_dates: set[str] = set()

    for path in data_dir.glob("race_*.csv"):
        stem = path.stem.replace("race_", "")
        if len(stem) == 8 and stem.isdigit() and _has_data_rows(str(path)):
            race_dates.add(stem)

    for path in data_dir.glob("odds_*.csv"):
        stem = path.stem.replace("odds_", "")
        if len(stem) == 8 and stem.isdigit() and _has_data_rows(str(path)):
            odds_dates.add(stem)

    return race_dates & odds_dates


def _dates_from_s3() -> set[str]:
    if not DATA_BUCKET:
        return set()

    s3 = boto3.client("s3")
    race_dates: set[str] = set()
    odds_dates: set[str] = set()

    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=DATA_BUCKET):
        for obj in page.get("Contents", []):
            key = os.path.basename(obj["Key"])
            match = _DATE_RE.match(key)
            if not match:
                continue
            prefix, date = match.groups()
            if prefix == "race":
                race_dates.add(date)
            else:
                odds_dates.add(date)

    return race_dates & odds_dates


def get_available_dates() -> list[str]:
    dates = _dates_from_s3() if DATA_BUCKET else _dates_from_local()
    if not dates and DATA_BUCKET:
        dates = _dates_from_local()
    return sorted(dates)


def get_date_range() -> dict:
    dates = get_available_dates()
    if not dates:
        return {"min_date": None, "max_date": None, "count": 0, "dates": []}
    return {
        "min_date": dates[0],
        "max_date": dates[-1],
        "count": len(dates),
        "dates": dates,
    }
