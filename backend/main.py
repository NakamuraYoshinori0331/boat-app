import os
import shutil
import subprocess
import sys
from datetime import datetime
from typing import List

import pred
import simulate
import storage
from auth import get_current_user, get_user_email
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

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


class PredictRequest(BaseModel):
    model: str
    date: str
    place_id: str
    race_no: str
    top_n: str


class SimulateRequest(BaseModel):
    model: str
    start_date: str
    end_date: str
    stadium: str
    top_n: int
    min_odds: float
    max_odds: float
    min_probability: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/protected")
async def protected_route(claims: dict = Depends(get_current_user)):
    return {"message": "OK", "user": get_user_email(claims)}


@app.post("/train")
def train_model(
    request: TrainRequest,
    claims: dict = Depends(get_current_user),
):
    models_dir = models_dir_for_user(claims)
    try:
        cmd = [
            sys.executable, "train.py",
            "--model_name", request.model_name,
            "--start_date", request.start_date,
            "--end_date", request.end_date,
            "--stadium", request.stadium,
            "--features", ",".join(request.features),
            "--models_dir", models_dir,
        ]
        subprocess.run(
            cmd,
            check=True,
            cwd=os.environ.get("LAMBDA_TASK_ROOT"),
        )
        storage.sync_models_to_s3(get_user_email(claims))
        return {"message": "学習完了"}
    except subprocess.CalledProcessError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/models")
def list_models(claims: dict = Depends(get_current_user)):
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
        result = pred.pred(
            request.model.replace(".pkl", ""),
            models_dir,
            request.date,
            request.place_id,
            str(request.race_no),
            str(request.top_n),
        )
        return {"predictions": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/simulation")
async def simulation(request: SimulateRequest, claims: dict = Depends(get_current_user)):
    models_dir = models_dir_for_user(claims)
    try:
        result = simulate.simulate(
            request.model.replace(".pkl", ""),
            models_dir,
            request.start_date,
            request.end_date,
            request.stadium,
            request.top_n,
            request.min_odds,
            request.max_odds,
            request.min_probability,
        )
        return {"simulation": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
