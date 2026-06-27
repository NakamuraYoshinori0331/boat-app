import pandas as pd
import pickle
import utils


def _boat_probabilities(race_df, preds_1st, preds_2nd, preds_3rd):
    boats = []
    for i, row in enumerate(race_df.itertuples(index=False)):
        boats.append({
            "boat": int(row.枠),
            "racer": str(getattr(row, "選手名", "")),
            "prob_1st": round(float(preds_1st[i]) * 100, 2),
            "prob_2nd": round(float(preds_2nd[i]) * 100, 2),
            "prob_3rd": round(float(preds_3rd[i]) * 100, 2),
        })
    boats.sort(key=lambda b: b["boat"])
    return boats


def pred(model, models_dir, date, place_id, race_no, top_n, sort_by="probability"):
    model_path = f"{models_dir}/{model}"
    with open(f"{model_path}.pkl", "rb") as f:
        models = pickle.load(f)

    race_data, odds_data = utils.scrape_data_for_prediction(date, place_id, race_no)

    odds_data[["1位", "2位", "3位"]] = odds_data["組番"].apply(pd.Series).astype(int)

    data = race_data[race_data["レースID"] == f"{date}_{place_id}_{race_no}"]

    race_features = models["features"]
    results = []
    boat_probabilities = []

    for race_id, race_df in data.groupby("レースID"):
        X_race = race_df[race_features]
        X_race = X_race.apply(pd.to_numeric, errors="coerce").fillna(0)
        odds_df = odds_data[odds_data["レースID"] == race_id].copy()

        preds_1st = models["1st_model"].predict(X_race)
        preds_2nd = models["2nd_model"].predict(X_race)
        preds_3rd = models["3rd_model"].predict(X_race)

        boat_probabilities = _boat_probabilities(race_df, preds_1st, preds_2nd, preds_3rd)

        top_trifecta_predictions = utils.get_top_trifecta(
            preds_1st,
            preds_2nd,
            preds_3rd,
            odds_df,
            top_n=int(top_n),
            sort_by=sort_by,
        )

        for i, (trifecta, score, bairitu, kitaichi) in enumerate(top_trifecta_predictions):
            odds = odds_df[
                (odds_df["1位"] == trifecta[0])
                & (odds_df["2位"] == trifecta[1])
                & (odds_df["3位"] == trifecta[2])
            ]
            popular = int(odds["人気"].values[0] if not odds.empty else 0)
            probability = round(score * 100, 4)

            results.append({
                "rank": int(i + 1),
                "combination": f"{trifecta[0]} → {trifecta[1]} → {trifecta[2]}",
                "probability": probability,
                "score": probability,
                "kitaichi": round(kitaichi, 3),
                "odds": float(bairitu),
                "popularity": popular,
            })

    return {
        "predictions": results,
        "boat_probabilities": boat_probabilities,
        "sort_by": sort_by,
    }
