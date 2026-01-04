import pandas as pd
import numpy as np
import glob
import requests
from datetime import datetime
import itertools
from bs4 import BeautifulSoup


def get_data(start_date, end_date):
    # 日付の範囲をリスト化
    date_range = pd.date_range(start=start_date, end=end_date).strftime("%Y%m%d")

    # パターンを動的に作成
    race_files = [f"data/race_{date}.csv" for date in date_range]
    odds_files = [f"data/odds_{date}.csv" for date in date_range]

    # 実際に存在するファイルのみ取得
    race_files = [file for file in race_files if glob.glob(file)]
    odds_files = [file for file in odds_files if glob.glob(file)]

    # レースとオッズのデータをまとめる
    race_data = pd.concat([pd.read_csv(f) for f in race_files], ignore_index=True)
    odds_data = pd.concat([pd.read_csv(f) for f in odds_files], ignore_index=True)
    return race_data, odds_data


# 上位 n 件の3連単を取得
def get_top_trifecta(preds_1st, preds_2nd, preds_3rd, odds_df, top_n=5):
    odds_dict = {
        (row["1位"], row["2位"], row["3位"]): row["倍率"]
        for _, row in odds_df.iterrows()
    }

    top1_candidates = np.argsort(preds_1st)[::-1]
    top2_candidates = np.argsort(preds_2nd)[::-1]
    top3_candidates = np.argsort(preds_3rd)[::-1]

    candidates = []
    for top_1st in top1_candidates:
        for top_2nd in top2_candidates:
            if top_2nd == top_1st:
                continue
            for top_3rd in top3_candidates:
                if top_3rd in (top_1st, top_2nd):
                    continue

                trifecta = (top_1st + 1, top_2nd + 1, top_3rd + 1)
                odds = odds_dict.get(trifecta)
                if odds is None:
                    continue

                score = preds_1st[top_1st] * preds_2nd[top_2nd] * preds_3rd[top_3rd]
                candidates.append((trifecta, score, odds, score * odds))

    # スコア順にソートして上位を取得
    candidates.sort(key=lambda x: x[1], reverse=True)
    return candidates[:top_n]


def is_valid_date(date_str: str) -> bool:
    try:
        datetime.strptime(date_str, "%Y%m%d")
        return True
    except ValueError:
        return False


def get_input():
    while True:
        date = input("日付を選択してください(20210101~20211124)：").strip()
        if is_valid_date(date):
            break
        else:
            print("無効な選択です。正しい日付を入力してください。(20210101~20211124)")
    race_data, _ = get_data(date, date)
    valid_places = {f"{i:02d}" for i in range(1, 25)}  # "01" から "24"
    while True:
        print(
            "01：桐生 02：戸田 03：江戸川 04：平和島 05：多摩川 06：浜名湖 07：蒲郡 08：常滑\n"
            "09：津 10：三国 11：琵琶湖 12：住之江 13：尼崎 14：鳴門 15：丸亀 16：児島\n"
            "17：宮島 18：徳山 19：下関 20：若松 21：芦屋 22：福岡 23：唐津 24：大村"
        )
        place = input("競艇場を選択してください（01～24）：").strip()

        if place in valid_places:
            if len(race_data[race_data['レースID'].str.contains(f'{date}_{place}')]) == 0:
                print("データがありません")
                print("============================================")
            else:
                break
        else:
            print("無効な選択です。01～24の番号を入力してください。")
    valid_races = {str(i) for i in range(1, 13)}  # "1" から "12"
    while True:
        race = input("レース番号を入力してください（1～12）：").strip()
        if race in valid_races:
            if len(race_data[race_data['レースID'].str.contains(f'{date}_{place}_{race}')]) == 0:
                print("データがありません")
                print("============================================")
            else:
                break
        else:
            print("無効な選択です。1～12の番号を入力してください。")
    return date, place, race


def scrape_data_for_prediction(date: str, place_id: str, race_no: str):
    """指定した日付・場・レース番号の直前情報とオッズをスクレイピングしてDataFrameで返す。"""

    race_id = f"{date}_{place_id}_{race_no}"

    # 各URL
    race_url = f"https://www.boatrace.jp/owpc/pc/race/racelist?rno={race_no}&jcd={place_id}&hd={date}"
    info_url = f"https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno={race_no}&jcd={place_id}&hd={date}"
    odds3t_url = f"https://www.boatrace.jp/owpc/pc/race/odds3t?rno={race_no}&jcd={place_id}&hd={date}"

    # 出走表の取得
    race_soup = BeautifulSoup(requests.get(race_url, timeout=20).text, "html.parser")
    race_elements = race_soup.find_all("tbody", class_="is-fs12")
    if not race_elements:
        raise ValueError("該当レースの出走データが見つかりません。")

    # 直前情報の取得
    info_soup = BeautifulSoup(requests.get(info_url, timeout=20).text, "html.parser")
    info_elements = info_soup.find_all("tbody", class_="is-fs12")
    st_elements = info_soup.find_all("div", class_="table1_boatImage1")

    st_dict, penetration_dict = {}, {}
    for i, st_elem in enumerate(st_elements):
        s = str(st_elem).split("\n")
        try:
            box = int(s[1][-8])
            st_time = float(s[3][36:-7]) if len(s[3]) > 10 else float(s[3][20:])
            st_dict[box] = st_time
            penetration_dict[box] = i + 1
        except Exception:
            continue

    # オッズページ取得
    odds3t_soup = BeautifulSoup(requests.get(odds3t_url, timeout=20).text, "html.parser")
    odds_points = odds3t_soup.find_all("td", class_="oddsPoint")
    odds_list = []
    for elem in odds_points:
        s = BeautifulSoup(str(elem), "html.parser").td.string
        if s == "欠場":
            raise ValueError("欠場があるため予測対象外です。")
        odds_list.append(float(s))

    # オッズが空の場合は中止
    if len(odds_list) == 0:
        raise ValueError("オッズデータが取得できません。")

    # オッズ → DataFrame化
    df = pd.DataFrame(np.array(odds_list).reshape(20, 6))
    odds_ser = pd.concat([df[i] for i in range(6)]).reset_index(drop=True)
    num_ser = pd.Series(list(itertools.permutations([1, 2, 3, 4, 5, 6], 3)))
    odds_df = pd.DataFrame({
        "組番": num_ser,
        "倍率": odds_ser
    })

    # 🔽 人気をオッズから再計算（小さいほど人気上位）
    odds_df["倍率"] = pd.to_numeric(odds_df["倍率"], errors="coerce")
    odds_df = odds_df.sort_values("倍率", ascending=True).reset_index(drop=True)
    odds_df["人気"] = odds_df.index + 1
    odds_df["レースID"] = race_id

    # 組番を3列に展開
    odds_df[["1位", "2位", "3位"]] = odds_df["組番"].apply(pd.Series).astype(int)

    # 気象データ
    weather_elem = str(info_soup.find_all("div", class_="weather1_body"))
    lines = weather_elem.split("\n")
    temp = lines[5][41:-8] if len(lines) > 5 else np.nan
    weather = lines[11][42:-7] if len(lines) > 11 else ""
    wind = lines[17][-9] if len(lines) > 17 else ""
    wave = lines[32][-10] if len(lines) > 32 else ""

    # 選手データ抽出
    race_data = []
    for race_elem, info_elem in zip(race_elements, info_elements):
        r, i = str(race_elem).split("\n"), str(info_elem).split("\n")

        try:
            row = {
                "レースID": race_id,
                "日付": date,
                "レース場": place_id,
                "レース回": race_no,
                "登録番号": r[6][-4:],
                "選手名": r[9][85:-4],
                "ランク": r[7][-9:-7],
                "支部": r[11][21:],
                "年齢": r[12][29:31],
                "体重": r[12][33:-2],
                "フライング": r[15][-1],
                "出遅れ": r[16][-1],
                "平均ST": r[17][29:],
                "全国勝率": r[19][34:],
                "全国2連率": r[20][29:],
                "全国3連率": r[21][29:],
                "当地勝率": r[23][34:],
                "当地2連率": r[24][29:],
                "当地3連率": r[25][29:],
                "モーター2連率": r[28][29:],
                "モーター3連率": r[29][29:],
                "ボート2連率": r[32][29:],
                "ボート3連率": r[33][29:],
                "展示タイム": i[6][16:-5],
                "チルト": i[7][16:-5],
                "枠": int(i[2][-6]),
                "進入": penetration_dict.get(int(i[2][-6]), 0),
                "ST": st_dict.get(int(i[2][-6]), 0.0),
                "気温(℃)": temp,
                "天候": weather,
                "風速(m)": wind,
                "波高(cm)": wave
            }
            race_data.append(row)
        except Exception:
            continue

    race_df = pd.DataFrame(race_data)

    # 数値変換
    numeric_cols = [
        "全国勝率", "全国2連率", "全国3連率",
        "当地勝率", "当地2連率", "当地3連率",
        "モーター2連率", "モーター3連率",
        "ボート2連率", "ボート3連率",
        "展示タイム", "チルト", "平均ST"
    ]
    race_df[numeric_cols] = race_df[numeric_cols].apply(pd.to_numeric, errors="coerce").fillna(0)

    return race_df, odds_df
