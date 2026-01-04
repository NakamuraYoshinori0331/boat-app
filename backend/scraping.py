import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import time
import itertools


race_columns = [
    "レースID",
    "日付",
    "レース場",
    "レース回",
    "登録番号",
    "選手名",
    "ランク",
    "支部",
    "年齢",
    "体重",
    "フライング",
    "出遅れ",
    "平均ST",
    "全国勝率",
    "全国2連率",
    "全国3連率",
    "当地勝率",
    "当地2連率",
    "当地3連率",
    "モーター2連率",
    "モーター3連率",
    "ボート2連率",
    "ボート3連率",
    "展示タイム",
    "チルト",
    "枠",
    "進入",
    "ST",
    "気温(℃)",
    "天候",
    "風速(m)",
    "波高(cm)"
]

odds_columns = [
    "組番",
    "倍率",
    "勝敗",
    "人気",
    "レースID"
]

# レース日のリストを作成 hd

# date_list = [datetime(2021, 1, 1) + timedelta(days=i) for i in range(30)]
date_list = [datetime(2021, 2, 7) + timedelta(days=i) for i in range(335)]
date_str_list = [d.strftime("%Y%m%d") for d in date_list]
# レース場のリストを作成 jcd
place_list = [
    "01", "02", "03", "04", "05", "06", "07", "08",
    "09", "10", "11", "12", "13", "14", "15", "16",
    "17", "18", "19", "20", "21", "22", "23", "24"
  ]
# レース回のリストを作成 rno
race_list = list(range(1, 13))
# スクレイピング対象のURL

# リクエストを送信してHTMLを取得
# 日付ループ
for date in date_str_list:
    print(date)
    race_csv_file = f'./output/race_{date}.csv'
    odds_csv_file = f'./output/odds_{date}.csv'
    try:
        with open(race_csv_file, "x", encoding="utf-8") as race_f:
            race_f.write(",".join(race_columns) + "\n")
    except FileExistsError:
        pass
    try:
        with open(odds_csv_file, "x", encoding="utf-8") as odds_f:
            odds_f.write(",".join(odds_columns) + "\n")
    except FileExistsError:
        pass
    # レース場ループ
    for place in place_list:
        # レース回ループ
        for race in race_list:

            # 「日付_レース場_レース回」でレースIDを作成
            race_id = str(date) + "_" + str(place) + "_" + str(race)

            # 出走表
            race_url = "https://www.boatrace.jp/owpc/pc/race/{}?\
rno={}&jcd={}&hd={}".format("racelist", race, place, date)
            # 直前情報
            info_url = "https://www.boatrace.jp/owpc/pc/race/{}?\
rno={}&jcd={}&hd={}".format("beforeinfo", race, place, date)
            # 結果情報
            raceresult_url = "https://www.boatrace.jp/owpc/pc/race/{}?\
rno={}&jcd={}&hd={}".format("raceresult", race, place, date)
            # オッズ
            odds3t_url = "https://www.boatrace.jp/owpc/pc/race/{}?\
rno={}&jcd={}&hd={}".format("odds3t", race, place, date)

            # 出走表のページを取得-------------------------------------------
            race_response = requests.get(race_url)
            race_html = race_response.text
            race_soup = BeautifulSoup(race_html, "html.parser")
            race_elements = race_soup.find_all("tbody", class_="is-fs12")

            # アクセスが集中しないように5秒開ける
            time.sleep(3)

            # レースがないかつ一レース目だったら次の場所ループへ
            if len(race_elements) == 0 and race == 1:
                break
            # レースがなければ
            elif len(race_elements) == 0:
                continue

            # 直前情報ページ取得----------------------------------------------------
            info_response = requests.get(info_url)
            info_html = info_response.text
            info_soup = BeautifulSoup(info_html, "html.parser")
            info_elements = info_soup.find_all("tbody", class_="is-fs12")
            st_elements = info_soup.find_all("div", class_="table1_boatImage1")
            # 6人でなければ飛ばす
            if len(st_elements) != 6:
                continue
            st_dict = {}
            penetration_dict = {}
            try:
                for i, st_elem in enumerate(st_elements):
                    st_elem = str(st_elem)
                    st_line_list = st_elem.split('\n')
                    penetration = st_line_list[1]
                    penetration = int(penetration[-8])
                    st_time = st_line_list[3]
                    st_time = st_time[36:-7]
                    if len(st_time) > 10:
                        st_time = st_time[20:]
                    else:
                        st_time = np.float64(st_time)
                    st_dict[penetration] = st_time
                    penetration_dict[penetration] = i + 1
            except ValueError:
                continue
            before_weather_elements = info_soup.find_all(
                                                        "div",
                                                        class_="weather1_body")
            weather_elem = str(before_weather_elements)
            weather_line_list = weather_elem.split('\n')

            # オッズページ取得-------------------------------------------------
            odds3t_response = requests.get(odds3t_url)
            odds3t_html = odds3t_response.text
            odds3t_soup = BeautifulSoup(odds3t_html, "html.parser")
            odds3t_elements = odds3t_soup.find_all("td", class_="oddsPoint")
            odds_list = []
            pattern = r'\d+(\.\d+)?'
            is_break = False
            for elem in odds3t_elements:
                soup = BeautifulSoup(str(elem), "html.parser")
                if soup.td.string == "欠場":
                    is_break = True
                    break
                odds_list.append(float(soup.td.string))
            # 欠場があればbreak
            if is_break:
                break
            # レース中止の場合break
            if len(odds_list) == 0:
                break
            df = pd.DataFrame(np.array(odds_list).reshape(20, 6))
            odds_ser = pd.concat([df[0], df[1], df[2], df[3], df[4], df[5]]).reset_index(drop=True)
            num_list = [1, 2, 3, 4, 5, 6]
            num_ser = pd.Series(list(itertools.permutations(num_list, 3)))
            odds_df = pd.concat([num_ser, odds_ser], axis=1, ignore_index=True)
            odds_df.rename(columns={0: "num", 1: "odds"}, inplace=True)
            odds_df["is_victory"] = False

            # 結果情報取得--------------------------------------------
            raceresult_response = requests.get(raceresult_url)
            raceresult_html = raceresult_response.text
            raceresult_soup = BeautifulSoup(raceresult_html, "html.parser")
            raceresult_elements = raceresult_soup.find_all("span", class_="numberSet1_number")
            i = 0
            result_num_list = []
            for elem in raceresult_elements:
                if i == 3:
                    break
                result_num_list.append(int(str(elem)[-8]))
                i += 1
            result_num_tuple = tuple(result_num_list)
            # オッズテーブルに勝敗の真偽値を格納
            victory_mask = odds_df["num"] == result_num_tuple
            odds_df.loc[victory_mask, "is_victory"] = True
            odds_df.sort_values("odds", inplace=True)
            odds_df['popularity'] = range(1, len(odds_df.index) + 1)
            odds_df.sort_values("num", inplace=True)
            odds_df["race_id"] = race_id

            # 気温
            temp_line = weather_line_list[5]
            temp = temp_line[41:-8]

            # 天候
            weather_line = weather_line_list[11]
            weather = weather_line[42:-7]

            # 風速
            wind_line = weather_line_list[17]
            wind = wind_line[-9]

            # 波高
            wave_line = weather_line_list[32]
            wave = wave_line[-10]

            for i, (race_elem, info_elem) in enumerate(zip(
                                                    race_elements,
                                                    info_elements)):
                race_elem = str(race_elem)
                info_elem = str(info_elem)
                race_line_list = race_elem.split('\n')
                info_line_list = info_elem.split('\n')

                # 登録番号
                id_line = race_line_list[6]
                id = id_line[-4:]

                # 選手名
                name_line = race_line_list[9]
                name = name_line[85:-4]

                # ランク
                lank_line = race_line_list[7]
                lank = lank_line[-9:-7]

                # 支部
                branch_line = race_line_list[11]
                branch = branch_line[21:]

                # 年齢
                age_line = race_line_list[12]
                age = age_line[29:31]

                # 体重
                weight_line = race_line_list[12]
                weight = weight_line[33:-2]

                # フライング
                f_count_line = race_line_list[15]
                f_count = f_count_line[-1]

                # 出遅れ
                l_count_line = race_line_list[16]
                l_count = l_count_line[-1]

                # 平均ST
                mean_st_line = race_line_list[17]
                mean_st = mean_st_line[29:]

                # 全国勝率
                national_first_line = race_line_list[19]
                national_first = national_first_line[34:]

                # 全国2連率
                national_second_line = race_line_list[20]
                national_second = national_second_line[29:]

                # 全国3連率
                national_third_line = race_line_list[21]
                national_third = national_third_line[29:]

                # 当地勝率
                locality_first_line = race_line_list[23]
                locality_first = locality_first_line[34:]

                # 当地2連率
                locality_second_line = race_line_list[24]
                locality_second = locality_second_line[29:]

                # 当地3連率
                locality_third_line = race_line_list[25]
                locality_third = locality_third_line[29:]

                # モーター2連率
                motor_second_line = race_line_list[28]
                motor_second = motor_second_line[29:]

                # モーター3連率
                motor_third_line = race_line_list[29]
                motor_third = motor_third_line[29:]

                # ボート2連率
                boat_second_line = race_line_list[32]
                boat_second = boat_second_line[29:]

                # ボート3連率
                boat_third_line = race_line_list[33]
                boat_third = boat_third_line[29:]

                # 展示タイム
                ex_time_line = info_line_list[6]
                ex_time = ex_time_line[16:-5]

                # チルト
                tilt_line = info_line_list[7]
                tilt = tilt_line[16:-5]

                # 枠
                box_line = info_line_list[2]
                box = int(box_line[-6])

                # 進入
                penetration = penetration_dict[box]

                # ST
                st_line = st_line_list[3]
                st = st_dict[box]

                data = pd.Series([
                    race_id,
                    date,
                    place,
                    race,
                    id,
                    name,
                    lank,
                    branch,
                    age,
                    weight,
                    f_count,
                    l_count,
                    mean_st,
                    national_first,
                    national_second,
                    national_third,
                    locality_first,
                    locality_second,
                    locality_third,
                    motor_second,
                    motor_third,
                    boat_second,
                    boat_third,
                    ex_time,
                    tilt,
                    box,
                    penetration,
                    st,
                    temp,
                    weather,
                    wind,
                    wave
                    ], race_columns)

                data.to_frame().T.to_csv(
                    race_csv_file,
                    mode='a',
                    header=False,
                    index=False
                )
            odds_df["num"] = tuple(odds_df["num"])
            odds_df.to_csv(
                odds_csv_file,
                mode='a',
                header=False,
                index=False
            )
