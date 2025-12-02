# 🚤 Boat Race Predictor (競艇 3連単 AI予測ツール)

本プロジェクトは、競艇（ボートレース）のデータを用いて  
**AI モデルを作成・保存・予測できる Web アプリケーション** です。

フロントエンドは **React + Ant Design**、  
バックエンドは **FastAPI（Python）** を使用しています。

ユーザーごとに学習モデルを保存でき、  
Web 上で「学習 → 予測 → シミュレーション」まで完結します。

---

## ✨ 主な機能

### 🧠 AI モデル学習
- 過去レースデータを LightGBM で学習
- 1着・2着・3着の個別モデルを作成
- ユーザー単位でモデル保存（`backend/models/<user_id>/`）

---

### 🎯 3連単予測
- 指定レースの最新データをスクレイピングで取得
- 3つの確率モデルから 3連単候補を生成
- 「確率 × オッズ」によるスコアリング
- 上位 N 件の買い目を提示

---

### 💰 シミュレーション
- 指定期間のレースでバックテストを実行
- 収支 / 的中率 / 回収率を自動計算
- 戦略の検証に利用可能

---

## 🔐 ログイン機能（予定）
- Cognito などの外部認証サービスと連携
- パスワードはアプリ側で保持しない安全設計
- ユーザーごとにモデル保存領域を分離

---

## 🏗️ プロジェクト構成

```text
project-root/
├── backend/                     # FastAPI（AIモデル / API）
│   ├── main.py                  # ルーティング定義
│   ├── pred.py                  # 予測ロジック
│   ├── utils.py                 # スクレイピング・共通処理
│   ├── models/                  # 学習済みモデル（ユーザー別）
│   ├── data/                    # 学習用データ（CSV）
│   └── requirements.txt
│
└── frontend/                    # React フロントエンド
    ├── src/
    │   ├── pages/               # 各ページ画面
    │   ├── components/          # UI コンポーネント
    │   └── App.tsx
    ├── public/
    └── package.json
```
---
## 🚀 起動方法（ローカル開発）
### バックエンド（FastAPI）
```text
bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

API エンドポイント
```text
arduino
http://localhost:8000
```

Swagger UI
```text
bash
http://localhost:8000/docs
```

---
### フロントエンド（React）
```text
bash
cd frontend
npm install
npm start
```

起動後の URL
```text
arduino
http://localhost:3000
```
---

## 📦 モデル保存仕様
学習したモデルはユーザー単位で以下のように保存されます：
```text
php-template
backend/models/<user_id>/<model_name>.pkl
ユーザーごとにデータが安全に分離されます。
```

## 📚 使用技術
### Frontend
- React (TypeScript)
- Ant Design
- Axios
- React Router

### Backend
- FastAPI
- LightGBM
- pandas / numpy
- BeautifulSoup（スクレイピング）
- Uvicorn

## 🎯 今後の拡張予定
- Cognito 認証によるログイン / サインアップ

- S3 によるモデル永続保存

- モデル精度の可視化（グラフ表示）

- 強化学習などによる自動最適化

- レスポンシブ UI（スマホ対応）

## 👤 作者
中村嘉頼  
AI / Web Developer

## 📄 ライセンス
本プロジェクトは社内利用を前提としています。  
外部公開の際は事前にご相談ください。