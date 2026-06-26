import pandas as pd
import pickle
import time
from tqdm import tqdm
import utils


def simulate(
    model,
    models_dir,
    start_date,
    end_date,
    stadium,
    top_n,
    min_odds,
    max_odds,
    min_probability,
    sort_by="probability",
    min_kitaichi=0,
    max_bets_per_race=0,
):
    all_start = time.time()

    model_path = f"{models_dir}/{model}.pkl"
    with open(model_path, "rb") as f:
        models = pickle.load(f)

    race_data, odds_data = utils.get_data(start_date, end_date)
    if stadium != "ALL":
        race_data = race_data[race_data["レース場"] == int(stadium)]
        odds_data = odds_data[odds_data["レースID"].str.contains(f"_{stadium}_")]

    odds_data[["1位", "2位", "3位"]] = odds_data["組番"].str.extract(
        r"\((\d+), (\d+), (\d+)\)"
    ).astype(int)

    winning_combinations = odds_data[odds_data["勝敗"]].copy()
    data = pd.merge(race_data, winning_combinations, on="レースID", how="inner")

    total_bet = total_return = win_count = race_count = bet_count = 0
    odds_index = odds_data.set_index(["レースID", "1位", "2位", "3位"])

    for race_id, race_df in tqdm(data.groupby("レースID")):
        X_race = race_df[models["features"]]

        preds_1st = models["1st_model"].predict(X_race)
        preds_2nd = models["2nd_model"].predict(X_race)
        preds_3rd = models["3rd_model"].predict(X_race)

        top_trifecta_predictions = utils.get_top_trifecta(
            preds_1st,
            preds_2nd,
            preds_3rd,
            odds_data[odds_data["レースID"] == race_id],
            top_n,
            sort_by=sort_by,
        )

        race_count += 1
        race_bets = 0

        for trifecta, score, bairitu, kitaichi in top_trifecta_predictions:
            try:
                odds_row = odds_index.loc[(race_id, trifecta[0], trifecta[1], trifecta[2])]
            except KeyError:
                continue

            if isinstance(odds_row, pd.DataFrame):
                odds_row = odds_row.iloc[0]

            win = odds_row["勝敗"]

            is_bet = (
                kitaichi >= min_kitaichi
                and bairitu > min_odds
                and bairitu < max_odds
                and score * 100 > min_probability
            )

            if not is_bet:
                continue

            if max_bets_per_race > 0 and race_bets >= max_bets_per_race:
                break

            bet_amount = 100
            total_bet += bet_amount
            bet_count += 1
            race_bets += 1

            if win:
                payout = bet_amount * bairitu
                total_return += payout
                win_count += 1

    all_end = time.time()
    print(f"全体の処理時間：{int(all_end - all_start)}秒")

    if total_bet > 0:
        return {
            "total_bet": total_bet,
            "total_return": total_return,
            "total_balance": total_return - total_bet,
            "hit_rate": win_count / bet_count * 100 if bet_count else 0,
            "recovery_rate": total_return / total_bet * 100,
            "bet_count": bet_count,
            "race_count": race_count,
        }
    return {"total_bet": total_bet, "bet_count": 0, "race_count": race_count}
