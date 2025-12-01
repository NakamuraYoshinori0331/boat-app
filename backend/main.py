from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import subprocess
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import shutil
from datetime import datetime
import pred
import simulate


app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # http://localhost:3000 等
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 学習用リクエストパラメータ
class TrainRequest(BaseModel):
    model_name: str
    start_date: str  # 'YYYY-MM-DD'
    end_date: str
    features: List[str]


@app.post("/train")
def train_model(request: TrainRequest):
    try:
        # ここでは train.py を CLI で呼び出す例（中身を直接呼ぶ形にも後で改良可能）
        cmd = [
            "python", "train.py",
            "--model_name", request.model_name,
            "--start_date", request.start_date,
            "--end_date", request.end_date,
            "--features", ",".join(request.features)
        ]
        print("Running command:", " ".join(cmd))
        subprocess.run(cmd, check=True)
        return {"message": "学習完了"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=str(e))


MODELS_DIR = "models"


class RenameRequest(BaseModel):
    new_name: str


@app.get("/models")
def list_models():
    files = []
    for fname in os.listdir(MODELS_DIR):
        if fname.endswith(".pkl"):
            full_path = os.path.join(MODELS_DIR, fname)
            size = os.path.getsize(full_path)
            mtime = datetime.fromtimestamp(
                os.path.getmtime(full_path)).strftime("%Y-%m-%d %H:%M:%S")
            files.append({
                "name": fname,
                "size": f"{size // 1024} KB",
                "modified": mtime,
            })
    return files


@app.delete("/models/{name}")
def delete_model(name: str):
    path = os.path.join(MODELS_DIR, name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="モデルが存在しません")
    os.remove(path)
    return {"message": "削除しました"}


@app.put("/models/{name}")
def rename_model(name: str, req: RenameRequest):
    old_path = os.path.join(MODELS_DIR, name)
    new_path = os.path.join(MODELS_DIR, f"{req.new_name}.pkl")
    if not os.path.exists(old_path):
        raise HTTPException(status_code=404, detail="モデルが存在しません")
    shutil.move(old_path, new_path)
    return {"message": "リネームしました"}


@app.get("/models/{name}/download")
def download_model(name: str):
    path = os.path.join(MODELS_DIR, name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="モデルが存在しません")
    return FileResponse(path, filename=name)


class PredictRequest(BaseModel):
    model: str
    date: str
    place_id: str
    race_no: str
    top_n: str


@app.post("/predict")
async def predict(request: PredictRequest):

    try:
        result = pred.pred(
            request.model.replace(".pkl", ""),
            request.date,
            request.place_id,
            str(request.race_no),
            str(request.top_n)
            )
        print(result)
        return {"predictions": result}
    except subprocess.CalledProcessError as e:
        return {"error": e.stderr}


class SimulateRequest(BaseModel):
    model: str
    start_date: str
    end_date: str
    top_n:  int
    min_odds: float
    max_odds: float
    min_probability: float


@app.post("/simulation")
async def simulation(request: SimulateRequest):

    try:
        result = simulate.simulate(
            request.model.replace(".pkl", ""),
            request.start_date,
            request.end_date,
            request.top_n,
            request.min_odds,
            request.max_odds,
            request.min_probability
            )
        print(result)
        return {"simulation": result}
    except subprocess.CalledProcessError as e:
        return {"error": e.stderr}
