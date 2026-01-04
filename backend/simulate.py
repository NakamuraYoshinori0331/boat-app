import pandas as pd
import numpy as np
import pickle
import time
from tqdm import tqdm
import utils


def simulate(model, models_dir, start_date, end_date, top_n, min_odds, max_odds, min_probability):
    all_start = time.time()

    # モデル読み込み
    model_path = f"{models_dir}/{model}.pkl"
    with open(model_path, "rb") as f:
        models = pickle.load(f)

    # データ取得
    race_data, odds_data = utils.get_data(start_date, end_date)
    odds_data[["1位", "2位", "3位"]] = odds_data["組番"].str.extract(
        r"\((\d+), (\d+), (\d+)\)"
    ).astype(int)

    # 勝敗ありの組み合わせだけ残す
    winning_combinations = odds_data[odds_data["勝敗"]].copy()

    # race_dataとodds_dataを結合
    data = pd.merge(race_data, winning_combinations, on="レースID", how="inner")

    # 集計用
    total_bet = total_return = win_count = race_count = 0

    # 事前に odds_data をインデックス化して検索を速くする
    odds_index = odds_data.set_index(["レースID", "1位", "2位", "3位"])

    # レースごとに処理
    for race_id, race_df in tqdm(data.groupby("レースID")):
        # 特徴量はモデル内に格納済み
        X_race = race_df[models["features"]]

        # 予測
        preds_1st = models["1st_model"].predict(X_race)
        preds_2nd = models["2nd_model"].predict(X_race)
        preds_3rd = models["3rd_model"].predict(X_race)

        # 上位候補を取得
        top_trifecta_predictions = utils.get_top_trifecta(
            preds_1st, preds_2nd, preds_3rd,
            odds_data[odds_data["レースID"] == race_id],  # ここだけraceごとに絞る
            top_n
        )

        race_bet = race_return = 0
        race_count += 1

        for trifecta, score, bairitu, kitaichi in top_trifecta_predictions:
            # odds_index を利用して高速検索
            try:
                odds_row = odds_index.loc[(race_id, trifecta[0], trifecta[1], trifecta[2])]
            except KeyError:
                continue

            win = odds_row["勝敗"]
            # popular = odds_row["人気"]  # 使わないなら削除可

            # 賭け金判定
            is_bet = (
                kitaichi >= 0
                and bairitu > min_odds
                and bairitu < max_odds
                and score * 100 > min_probability
            )

            if is_bet:
                bet_amount = 100
                race_bet += bet_amount
                total_bet += bet_amount

                # 的中処理
                if win:
                    payout = bet_amount * bairitu
                    race_return += payout
                    total_return += payout
                    win_count += 1

    all_end = time.time()
    print(f"全体の処理時間：{int(all_end - all_start)}秒")

    if total_bet > 0:
        return {
            "total_bet": total_bet,
            "total_return": total_return,
            "total_balance": total_return - total_bet,
            "hit_rate": win_count / race_count * 100,
            "recovery_rate": total_return / total_bet * 100,
        }
    else:
        return {"total_bet": total_bet}