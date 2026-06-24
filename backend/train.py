import argparse
import os
import pickle

import lightgbm as lgb
import pandas as pd

import utils


def run_train(
    model_name: str,
    start_date: str,
    end_date: str,
    stadium: str,
    features: list[str],
    models_dir: str,
) -> str:
    race_data, odds_data = utils.get_data(start_date, end_date)

    if stadium != "ALL":
        race_data = race_data[race_data["レース場"] == int(stadium)]
        odds_data = odds_data[odds_data["レースID"].str.contains(f"_{stadium}_")]

    odds_data[["1位", "2位", "3位"]] = (
        odds_data["組番"].str.extract(r"\((\d+), (\d+), (\d+)\)").astype(int)
    )

    race_features = features
    odds_features = ["1位", "2位", "3位", "倍率"]
    winning_combinations = odds_data[odds_data["勝敗"] == True].copy()

    data = pd.merge(race_data, winning_combinations, on="レースID", how="inner")
    if data.empty:
        raise ValueError(
            f"学習データがありません ({start_date}〜{end_date}, stadium={stadium})"
        )

    data["順位"] = 0
    data.loc[data["枠"] == data["1位"], "順位"] = 1
    data.loc[data["枠"] == data["2位"], "順位"] = 2
    data.loc[data["枠"] == data["3位"], "順位"] = 3

    data = data[["レースID", "選手名", "順位"] + race_features + odds_features]

    params = {
        "objective": "binary",
        "metric": "binary_logloss",
        "boosting_type": "gbdt",
        "num_leaves": 31,
        "learning_rate": 0.05,
        "min_data_in_leaf": 10,
        "feature_fraction": 0.8,
        "verbose": -1,
    }

    race_groups = data.groupby("レースID")
    race_ids = list(race_groups.groups.keys())
    train_race_ids = race_ids[: int(len(race_ids) * 0.8)]

    train_data = data[data["レースID"].isin(train_race_ids)]
    X_train = train_data[race_features]
    y_train_1st = (train_data["順位"] == 1).astype(int)
    y_train_2nd = (train_data["順位"] == 2).astype(int)
    y_train_3rd = (train_data["順位"] == 3).astype(int)

    model_1st = lgb.train(params, lgb.Dataset(X_train, label=y_train_1st))
    model_2nd = lgb.train(params, lgb.Dataset(X_train, label=y_train_2nd))
    model_3rd = lgb.train(params, lgb.Dataset(X_train, label=y_train_3rd))

    models = {
        "features": race_features,
        "start_date": start_date,
        "end_date": end_date,
        "1st_model": model_1st,
        "2nd_model": model_2nd,
        "3rd_model": model_3rd,
    }

    os.makedirs(models_dir, exist_ok=True)
    file_path = os.path.join(models_dir, f"{model_name}.pkl")
    with open(file_path, "wb") as f:
        pickle.dump(models, f)

    return file_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_name", default="model")
    parser.add_argument("--start_date", default="20210101")
    parser.add_argument("--end_date", default="20210110")
    parser.add_argument("--stadium", default="ALL")
    parser.add_argument("--features", default="全国勝率")
    parser.add_argument("--models_dir", default="")
    args = parser.parse_args()

    path = run_train(
        args.model_name,
        args.start_date,
        args.end_date,
        args.stadium,
        args.features.split(","),
        args.models_dir,
    )
    print(f"モデルを保存しました：{path}")
