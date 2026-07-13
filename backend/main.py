import os
import shutil
import traceback
from datetime import datetime
from typing import List

import data_dates
import jobs
import pred
import simulate
import storage
from auth import get_current_user, get_user_email
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

STADIUM_NAMES = {
    "01": "桐生", "02": "戸田", "03": "江戸川", "04": "平和島",
    "05": "多摩川", "06": "浜名湖", "07": "蒲郡", "08": "常滑",
    "09": "津", "10": "三国", "11": "琵琶湖", "12": "住之江",
    "13": "尼崎", "14": "鳴門", "15": "丸亀", "16": "児島",
    "17": "宮島", "18": "徳山", "19": "下関", "20": "若松",
    "21": "芦屋", "22": "福岡", "23": "唐津", "24": "大村",
}

app = FastAPI()

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://boat-ai.click",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def models_dir_for_user(claims: dict) -> str:
    email = get_user_email(claims)
    if os.environ.get("MODELS_BUCKET"):
        return storage.ensure_models_dir(email)
    path = os.path.join("models", email)
    os.makedirs(path, exist_ok=True)
    return path


class TrainRequest(BaseModel):
    model_name: str
    start_date: str
    end_date: str
    stadium: str
    features: List[str]


class RenameRequest(BaseModel):
    new_name: str


class BulkDeleteRequest(BaseModel):
    names: List[str] = []


class PredictRequest(BaseModel):
    model: str
    date: str
    place_id: str
    race_no: str
    top_n: str
    sort_by: str = "probability"


class SimulateRequest(BaseModel):
    model: str
    start_date: str
    end_date: str
    stadium: str
    top_n: int
    min_odds: float
    max_odds: float
    min_probability: float
    sort_by: str = "probability"
    min_kitaichi: float = 0
    max_bets_per_race: int = 0


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/protected")
async def protected_route(claims: dict = Depends(get_current_user)):
    return {"message": "OK", "user": get_user_email(claims)}


@app.get("/data/date-range")
def get_data_date_range(claims: dict = Depends(get_current_user)):
    return data_dates.get_date_range()


@app.get("/jobs/{job_id}")
def get_job_status(job_id: str, claims: dict = Depends(get_current_user)):
    if not jobs.jobs_enabled():
        raise HTTPException(status_code=404, detail="ジョブ機能は利用できません")

    job = jobs.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="ジョブが見つかりません")
    if job.get("user_email") != get_user_email(claims):
        raise HTTPException(status_code=403, detail="このジョブにアクセスできません")

    return {
        "job_id": job["job_id"],
        "job_type": job["job_type"],
        "status": job["status"],
        "result": job.get("result"),
        "error": job.get("error") or None,
        "created_at": job.get("created_at"),
        "updated_at": job.get("updated_at"),
    }


def _submit_job(job_type: str, payload: dict, claims: dict):
    email = get_user_email(claims)
    job_id = jobs.create_job(email, job_type, payload)
    jobs.invoke_async(job_id, job_type, email)
    return JSONResponse(
        status_code=202,
        content={"job_id": job_id, "status": "pending", "message": "ジョブを開始しました"},
    )


def _run_train_sync(request: TrainRequest, claims: dict):
    models_dir = models_dir_for_user(claims)
    import train

    email = get_user_email(claims)
    file_path = train.run_train(
        request.model_name,
        request.start_date,
        request.end_date,
        request.stadium,
        request.features,
        models_dir,
    )
    model_file = os.path.basename(file_path)
    storage.upload_model(email, model_file)
    storage.sync_models_to_s3(email)
    return {"message": "学習完了", "model": model_file}


@app.post("/train")
def train_model(
    request: TrainRequest,
    claims: dict = Depends(get_current_user),
):
    if not request.features:
        raise HTTPException(status_code=400, detail="特徴量を1つ以上選択してください")

    try:
        if jobs.jobs_enabled():
            return _submit_job("train", request.model_dump(), claims)
        return _run_train_sync(request, claims)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        print("train error:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/models")
def list_models(claims: dict = Depends(get_current_user)):
    email = get_user_email(claims)
    if os.environ.get("MODELS_BUCKET"):
        return storage.list_models_metadata(email)

    models_dir = models_dir_for_user(claims)
    files = []
    for fname in os.listdir(models_dir):
        if fname.endswith(".pkl"):
            full_path = os.path.join(models_dir, fname)
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


@app.delete("/models/{name}")
def delete_model(name: str, claims: dict = Depends(get_current_user)):
    models_dir = models_dir_for_user(claims)
    path = os.path.join(models_dir, name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="モデルが存在しません")
    os.remove(path)
    storage.delete_model_from_s3(get_user_email(claims), name)
    return {"message": "削除しました"}


@app.post("/models/bulk-delete")
def bulk_delete_models(
    req: BulkDeleteRequest,
    claims: dict = Depends(get_current_user),
):
    models_dir = models_dir_for_user(claims)
    email = get_user_email(claims)
    targets = [n if n.endswith(".pkl") else f"{n}.pkl" for n in req.names]

    deleted = []
    skipped = []
    for name in targets:
        path = os.path.join(models_dir, name)
        if not os.path.exists(path):
            skipped.append(name)
            continue
        os.remove(path)
        storage.delete_model_from_s3(email, name)
        deleted.append(name)

    return {
        "message": f"{len(deleted)}件削除しました",
        "deleted": deleted,
        "skipped": skipped,
    }


@app.put("/models/{name}")
def rename_model(
    name: str,
    req: RenameRequest,
    claims: dict = Depends(get_current_user),
):
    models_dir = models_dir_for_user(claims)
    old_path = os.path.join(models_dir, name)
    new_path = os.path.join(models_dir, f"{req.new_name}.pkl")
    if not os.path.exists(old_path):
        raise HTTPException(status_code=404, detail="モデルが存在しません")
    shutil.move(old_path, new_path)
    email = get_user_email(claims)
    storage.delete_model_from_s3(email, name)
    storage.upload_model(email, f"{req.new_name}.pkl")
    return {"message": "リネームしました"}


@app.get("/models/{name}/download")
def download_model(name: str, claims: dict = Depends(get_current_user)):
    models_dir = models_dir_for_user(claims)
    path = os.path.join(models_dir, name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="モデルが存在しません")
    return FileResponse(path, filename=name)


@app.post("/predict")
async def predict(request: PredictRequest, claims: dict = Depends(get_current_user)):
    models_dir = models_dir_for_user(claims)
    try:
        model = request.model.replace(".pkl", "")
        result = pred.pred(
            model,
            models_dir,
            request.date,
            request.place_id,
            str(request.race_no),
            str(request.top_n),
            sort_by=request.sort_by,
        )
        result["model"] = f"{model}.pkl"
        place_name = STADIUM_NAMES.get(request.place_id, request.place_id)
        dt = datetime.strptime(request.date, "%Y%m%d")
        result["race_info"] = {
            "date": request.date,
            "date_label": f"{dt.month}月{dt.day}日",
            "place_id": request.place_id,
            "place_name": place_name,
            "race_no": int(request.race_no),
        }
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _run_simulation_sync(request: SimulateRequest, claims: dict):
    models_dir = models_dir_for_user(claims)
    model = request.model.replace(".pkl", "")
    result = simulate.simulate(
        model,
        models_dir,
        request.start_date,
        request.end_date,
        request.stadium,
        request.top_n,
        request.min_odds,
        request.max_odds,
        request.min_probability,
        sort_by=request.sort_by,
        min_kitaichi=request.min_kitaichi,
        max_bets_per_race=request.max_bets_per_race,
    )
    return {
        "simulation": result,
        "params_used": request.model_dump(),
        "model": f"{model}.pkl",
    }


@app.post("/simulation")
async def simulation(request: SimulateRequest, claims: dict = Depends(get_current_user)):
    try:
        if jobs.jobs_enabled():
            return _submit_job("simulation", request.model_dump(), claims)
        return _run_simulation_sync(request, claims)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
