"""
欠損期間の競艇データを boatrace.jp から取得し backend/data/ に保存する。
scraping.py と同じ CSV 形式・取得ロジック（ST パースのみ現行 HTML 対応）。

使い方:
  python backfill_data.py
  python backfill_data.py --start 20211126 --end 20260620
  python backfill_data.py --sleep 1

既に中身のある race_YYYYMMDD.csv / odds_YYYYMMDD.csv がある日はスキップする。
"""

import argparse
import itertools
import logging
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import requests
from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).resolve().parent / "data"
LOG_FILE = DATA_DIR / "backfill.log"

RACE_COLUMNS = [
    "レースID", "日付", "レース場", "レース回", "登録番号", "選手名", "ランク", "支部",
    "年齢", "体重", "フライング", "出遅れ", "平均ST", "全国勝率", "全国2連率", "全国3連率",
    "当地勝率", "当地2連率", "当地3連率", "モーター2連率", "モーター3連率",
    "ボート2連率", "ボート3連率", "展示タイム", "チルト", "枠", "進入", "ST",
    "気温(℃)", "天候", "風速(m)", "波高(cm)",
]

ODDS_COLUMNS = ["組番", "倍率", "勝敗", "人気", "レースID"]

PLACE_LIST = [f"{i:02d}" for i in range(1, 25)]
RACE_LIST = list(range(1, 13))

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}


def setup_logging() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(LOG_FILE, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def latest_local_date() -> Optional[str]:
    dates = []
    for path in DATA_DIR.glob("race_*.csv"):
        stem = path.stem.replace("race_", "")
        if len(stem) == 8 and stem.isdigit() and count_data_rows(path) > 0:
            dates.append(stem)
    return max(dates) if dates else None


def count_data_rows(path: Path) -> int:
    if not path.exists():
        return 0
    with path.open(encoding="utf-8") as f:
        return max(0, sum(1 for _ in f) - 1)


def day_complete(date: str) -> bool:
    race_file = DATA_DIR / f"race_{date}.csv"
    odds_file = DATA_DIR / f"odds_{date}.csv"
    return count_data_rows(race_file) > 0 and count_data_rows(odds_file) > 0


def remove_day_files(date: str) -> None:
    for prefix in ("race", "odds"):
        path = DATA_DIR / f"{prefix}_{date}.csv"
        if path.exists():
            path.unlink()


def parse_st_value(st_raw: str):
    st_raw = st_raw.strip()
    if st_raw.startswith("F"):
        return st_raw
    if st_raw.startswith("."):
        return float(f"0{st_raw}")
    return float(st_raw)


def parse_st_and_penetration(st_elements):
    """展示STと進入コース（scraping.py + 現行 HTML 対応）。"""
    st_dict = {}
    penetration_dict = {}

    for i, st_elem in enumerate(st_elements):
        box_span = st_elem.find("span", class_="table1_boatImage1Number")
        time_span = st_elem.find("span", class_="table1_boatImage1Time")
        if box_span and time_span:
            box = int(box_span.get_text(strip=True))
            st_dict[box] = parse_st_value(time_span.get_text(strip=True))
            penetration_dict[box] = i + 1
            continue

        try:
            st_lines = str(st_elem).split("\n")
            box = int(st_lines[1][-8])
            st_time_raw = st_lines[3][36:-7]
            if len(st_lines[3]) > 10:
                st_time_raw = st_lines[3][20:]
            st_dict[box] = parse_st_value(st_time_raw)
            penetration_dict[box] = i + 1
        except (ValueError, IndexError):
            continue

    return st_dict, penetration_dict


def parse_weather(info_soup):
    """scraping.py と同じ気象データ抽出。"""
    weather_elem = str(info_soup.find_all("div", class_="weather1_body"))
    weather_lines = weather_elem.split("\n")
    temp = weather_lines[5][41:-8] if len(weather_lines) > 5 else ""
    weather = weather_lines[11][42:-7] if len(weather_lines) > 11 else ""
    wind = weather_lines[17][-9] if len(weather_lines) > 17 else ""
    wave = weather_lines[32][-10] if len(weather_lines) > 32 else ""
    return temp, weather, wind, wave


def fetch(session: requests.Session, url: str, timeout: int = 30) -> Optional[str]:
    try:
        response = session.get(url, timeout=timeout, headers=REQUEST_HEADERS)
        response.raise_for_status()
        return response.text
    except requests.RequestException as exc:
        logging.warning("request failed %s: %s", url, exc)
        return None


class DayWriter:
    def __init__(self, date: str):
        self.date = date
        self.race_file = DATA_DIR / f"race_{date}.csv"
        self.odds_file = DATA_DIR / f"odds_{date}.csv"
        self._race_header_written = False
        self._odds_header_written = False
        self.race_rows = 0
        self.odds_rows = 0

    def append_race_row(self, row: pd.Series) -> None:
        if not self._race_header_written:
            self.race_file.write_text(",".join(RACE_COLUMNS) + "\n", encoding="utf-8")
            self._race_header_written = True
        row.to_frame().T.to_csv(self.race_file, mode="a", header=False, index=False)
        self.race_rows += 1

    def append_odds_df(self, odds_df: pd.DataFrame) -> None:
        if not self._odds_header_written:
            self.odds_file.write_text(",".join(ODDS_COLUMNS) + "\n", encoding="utf-8")
            self._odds_header_written = True
        odds_df[ODDS_COLUMNS].to_csv(self.odds_file, mode="a", header=False, index=False)
        self.odds_rows += len(odds_df)

    def cleanup_if_empty(self) -> None:
        if self.race_rows == 0:
            if self.race_file.exists():
                self.race_file.unlink()
            if self.odds_file.exists():
                self.odds_file.unlink()
        elif self.odds_rows == 0 and self.odds_file.exists():
            self.odds_file.unlink()


def scrape_race(
    session: requests.Session,
    writer: DayWriter,
    date: str,
    place: str,
    race: int,
    sleep_sec: float,
) -> str:
    """
    1レース分を取得。scraping.py と同じ分岐。
    戻り値: "saved" | "skip" | "break_place"
    """
    race_id = f"{date}_{place}_{race}"
    race_url = (
        f"https://www.boatrace.jp/owpc/pc/race/racelist"
        f"?rno={race}&jcd={place}&hd={date}"
    )
    info_url = (
        f"https://www.boatrace.jp/owpc/pc/race/beforeinfo"
        f"?rno={race}&jcd={place}&hd={date}"
    )
    result_url = (
        f"https://www.boatrace.jp/owpc/pc/race/raceresult"
        f"?rno={race}&jcd={place}&hd={date}"
    )
    odds_url = (
        f"https://www.boatrace.jp/owpc/pc/race/odds3t"
        f"?rno={race}&jcd={place}&hd={date}"
    )

    race_html = fetch(session, race_url)
    if race_html is None:
        time.sleep(sleep_sec)
        return "skip"

    race_soup = BeautifulSoup(race_html, "html.parser")
    race_elements = race_soup.find_all("tbody", class_="is-fs12")
    time.sleep(sleep_sec)

    if len(race_elements) == 0 and race == 1:
        return "break_place"
    if len(race_elements) == 0:
        return "skip"

    info_html = fetch(session, info_url)
    if info_html is None:
        return "skip"
    info_soup = BeautifulSoup(info_html, "html.parser")
    info_elements = info_soup.find_all("tbody", class_="is-fs12")
    st_elements = info_soup.find_all("div", class_="table1_boatImage1")

    if len(st_elements) != 6:
        return "skip"

    try:
        st_dict, penetration_dict = parse_st_and_penetration(st_elements)
    except ValueError:
        return "skip"

    if len(st_dict) < 6:
        return "skip"

    odds_html = fetch(session, odds_url)
    if odds_html is None:
        return "skip"
    odds_soup = BeautifulSoup(odds_html, "html.parser")

    odds_list = []
    is_break = False
    for elem in odds_soup.find_all("td", class_="oddsPoint"):
        value = BeautifulSoup(str(elem), "html.parser").td.string
        if value == "欠場":
            is_break = True
            break
        odds_list.append(float(value))

    if is_break:
        return "break_place"
    if len(odds_list) == 0:
        return "break_place"

    df = pd.DataFrame(np.array(odds_list).reshape(20, 6))
    odds_ser = pd.concat([df[i] for i in range(6)]).reset_index(drop=True)
    num_ser = pd.Series(list(itertools.permutations([1, 2, 3, 4, 5, 6], 3)))
    odds_df = pd.DataFrame({"組番": num_ser, "倍率": odds_ser})
    odds_df["勝敗"] = False

    result_html = fetch(session, result_url)
    if result_html is None:
        return "skip"
    result_soup = BeautifulSoup(result_html, "html.parser")

    result_num_list = []
    for elem in result_soup.find_all("span", class_="numberSet1_number"):
        if len(result_num_list) == 3:
            break
        result_num_list.append(int(str(elem)[-8]))
    if len(result_num_list) != 3:
        return "skip"

    result_tuple = tuple(result_num_list)
    odds_df.loc[odds_df["組番"] == result_tuple, "勝敗"] = True
    odds_df = odds_df.sort_values("倍率").reset_index(drop=True)
    odds_df["人気"] = odds_df.index + 1
    odds_df = odds_df.sort_values("組番").reset_index(drop=True)
    odds_df["レースID"] = race_id
    odds_df["組番"] = odds_df["組番"].apply(lambda x: f"({x[0]}, {x[1]}, {x[2]})")

    temp, weather, wind, wave = parse_weather(info_soup)

    for race_elem, info_elem in zip(race_elements, info_elements):
        race_line_list = str(race_elem).split("\n")
        info_line_list = str(info_elem).split("\n")
        try:
            box = int(info_line_list[2][-6])
            row = pd.Series([
                race_id, date, place, race,
                race_line_list[6][-4:],
                race_line_list[9][85:-4],
                race_line_list[7][-9:-7],
                race_line_list[11][21:],
                race_line_list[12][29:31],
                race_line_list[12][33:-2],
                race_line_list[15][-1],
                race_line_list[16][-1],
                race_line_list[17][29:],
                race_line_list[19][34:],
                race_line_list[20][29:],
                race_line_list[21][29:],
                race_line_list[23][34:],
                race_line_list[24][29:],
                race_line_list[25][29:],
                race_line_list[28][29:],
                race_line_list[29][29:],
                race_line_list[32][29:],
                race_line_list[33][29:],
                info_line_list[6][16:-5],
                info_line_list[7][16:-5],
                box,
                penetration_dict[box],
                st_dict[box],
                temp, weather, wind, wave,
            ], RACE_COLUMNS)
            writer.append_race_row(row)
        except (IndexError, ValueError, KeyError):
            continue

    writer.append_odds_df(odds_df)
    return "saved"


def scrape_day(date: str, sleep_sec: float) -> bool:
    writer = DayWriter(date)
    session = requests.Session()

    for place in PLACE_LIST:
        for race in RACE_LIST:
            result = scrape_race(session, writer, date, place, race, sleep_sec)
            if result == "break_place":
                break

    writer.cleanup_if_empty()
    return writer.race_rows > 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill boat race CSV data")
    parser.add_argument("--start", help="開始日 YYYYMMDD（省略時: ローカル最新日の翌日）")
    parser.add_argument("--end", help="終了日 YYYYMMDD（省略時: 昨日）")
    parser.add_argument(
        "--sleep",
        type=float,
        default=1.0,
        help="出走表取得後の待機秒数（scraping.py は3秒。デフォルト1秒）",
    )
    return parser.parse_args()


def main() -> None:
    setup_logging()
    args = parse_args()

    end_date = args.end or (datetime.now() - timedelta(days=1)).strftime("%Y%m%d")

    if args.start:
        start_date = args.start
    else:
        latest = latest_local_date()
        if latest is None:
            logging.error("ローカルデータが見つかりません。--start を指定してください。")
            sys.exit(1)
        start_date = (datetime.strptime(latest, "%Y%m%d") + timedelta(days=1)).strftime("%Y%m%d")

    dates = pd.date_range(start=start_date, end=end_date, freq="D")
    logging.info(
        "Backfill %s -> %s (%d days), sleep=%.1fs, log=%s",
        start_date, end_date, len(dates), args.sleep, LOG_FILE,
    )

    done = skipped = empty = failed = 0
    for day in dates:
        date = day.strftime("%Y%m%d")
        if day_complete(date):
            skipped += 1
            continue
        remove_day_files(date)
        try:
            has_race = scrape_day(date, args.sleep)
            if has_race:
                done += 1
                race_n = count_data_rows(DATA_DIR / f"race_{date}.csv")
                odds_n = count_data_rows(DATA_DIR / f"odds_{date}.csv")
                logging.info(
                    "[%d/%d] %s OK (race=%d, odds=%d)",
                    done + skipped + empty + failed, len(dates), date, race_n, odds_n,
                )
            else:
                empty += 1
                logging.info(
                    "[%d/%d] %s skipped (no race data)",
                    done + skipped + empty + failed, len(dates), date,
                )
        except Exception:
            failed += 1
            remove_day_files(date)
            logging.exception("[%d/%d] %s FAILED", done + skipped + empty + failed, len(dates), date)

    logging.info(
        "Finished: saved=%d skipped=%d no_race=%d failed=%d",
        done, skipped, empty, failed,
    )


if __name__ == "__main__":
    main()
