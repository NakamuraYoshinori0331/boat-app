import pandas as pd
import numpy as np
import glob
import os
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import log_loss
import joblib
from datetime import datetime
import itertools
import pickle
import argparse
import japanize_matplotlib
import matplotlib.pyplot as plt
import utils

# 実行引数を設定
parser = argparse.ArgumentParser()
parser.add_argument("--model_name", default="model", help="model_name")
parser.add_argument("--start_date", default="20210101", help="input start date")
parser.add_argument("--end_date", default="20210110", help="input end date")
parser.add_argument("--features", default="全国勝率", help="features")
parser.add_argument("--models_dir", default="", help="localstorage")

args = parser.parse_args()

# データの開始日と終了日を取得
start_date = args.start_date
end_date = args.end_date

race_data, odds_data = utils.get_data(start_date, end_date)

# 組番を1,2,3位に分解
odds_data[['1位', '2位', '3位']] = odds_data['組番'].str.extract(r'\((\d+), (\d+), (\d+)\)').astype(int)

# 必要な特徴量の抽出
race_features = args.features.split(',')
odds_features = ['1位', '2位', '3位', '倍率']
print(type(race_features))

winning_combinations = odds_data[odds_data['勝敗'] == True].copy()

# race_dataとodds_dataの結合
data = pd.merge(race_data, winning_combinations, on='レースID', how='inner')
data['順位'] = 0  # 初期化
data.loc[data['枠'] == data['1位'], '順位'] = 1
data.loc[data['枠'] == data['2位'], '順位'] = 2
data.loc[data['枠'] == data['3位'], '順位'] = 3

# 必要なカラムの抽出
data = data[['レースID', '選手名', '順位'] + race_features + odds_features]

# データの分割
X = data[['レースID'] + race_features]
y_1st = (data['順位'] == 1).astype(int)
y_2nd = (data['順位'] == 2).astype(int)
y_3rd = (data['順位'] == 3).astype(int)

params = {
    'objective': 'binary',
    'metric': 'binary_logloss',
    'boosting_type': 'gbdt',
    'num_leaves': 31,
    'learning_rate': 0.05,
    'min_data_in_leaf': 10,
    'feature_fraction': 0.8,
    'verbose': -1
}

# 訓練データとテストデータを分割
race_groups = data.groupby("レースID")
race_ids = list(race_groups.groups.keys())

train_race_ids = race_ids[:int(len(race_ids) * 0.8)]
test_race_ids = race_ids[int(len(race_ids) * 0.8):]

train_data = data[data["レースID"].isin(train_race_ids)]
test_data = data[data["レースID"].isin(test_race_ids)]

# 訓練データ
X_train = train_data[race_features]
y_train_1st = (train_data['順位'] == 1).astype(int)
y_train_2nd = (train_data['順位'] == 2).astype(int)
y_train_3rd = (train_data['順位'] == 3).astype(int)

# モデル学習（すべての学習データを一括で学習）
model_1st = lgb.train(params, lgb.Dataset(X_train, label=y_train_1st))
model_2nd = lgb.train(params, lgb.Dataset(X_train, label=y_train_2nd))
model_3rd = lgb.train(params, lgb.Dataset(X_train, label=y_train_3rd))

# モデル特微量重要度を表示
# lgb.plot_importance(model_1st, figsize=(8,4), max_num_features=10, importance_type='gain')
# plt.show()

models = {
    "features": race_features,
    "start_date": start_date,
    "end_date": end_date,
    "1st_model": model_1st,
    "2nd_model": model_2nd,
    "3rd_model": model_3rd
}

# カレントディレクトリへモデルを保存
dir = args.models_dir
file = f'{dir}/{args.model_name}.pkl'
# ディレクトリが存在するか確認
if not os.path.exists(dir):
    os.makedirs(dir)
pickle.dump(models, open(file, 'wb'))

gbm = pickle.load(open(f'{dir}/{args.model_name}.pkl', 'rb'))
print(f"モデルを保存しました：{dir}/{args.model_name}.pkl")
