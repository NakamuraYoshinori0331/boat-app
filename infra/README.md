# Boat App Infrastructure (AWS CDK)

## スタック構成

| スタック | 内容 |
|---------|------|
| `BoatAppDataStack` | S3: 学習データ・モデル（プライベート） |
| `BoatAppApiStack` | API Gateway HTTP API + Cognito Authorizer（Phase 2 用の骨格） |
| `BoatAppGitHubOidcStack` | GitHub Actions 用 OIDC ロール（自動作成） |

## 初回セットアップ（一括）

```bash
# 1. AWS 認証（未設定の場合）
aws configure

# 2. デプロイ実行
bash scripts/setup-aws.sh
```

`setup-aws.sh` は CDK bootstrap → 全スタック deploy → GitHub Secret 登録（gh 利用可時）まで行います。

### 手動の場合

```bash
cd infra
npm install
npx cdk bootstrap aws://008116135513/ap-northeast-1
npx cdk deploy --all
```

## GitHub Actions (OIDC)

`BoatAppGitHubOidcStack` デプロイ後、出力 `GitHubActionsRoleArn` を GitHub Secrets に登録:

```
AWS_DEPLOY_ROLE_ARN = arn:aws:iam::008116135513:role/github-actions-boat-app-deploy
```

`scripts/setup-aws.sh` 実行時、`gh` CLI があれば自動登録します。

### IAM ロール信頼ポリシー（参考・CDK が自動作成）

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::008116135513:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:NakamuraYoshinori0331/boat-app:*"
      }
    }
  }]
}
```

ロールには `AdministratorAccess`（初期）または S3/CloudFront/CDK 用の最小権限を付与。

## データ移行（ローカル → S3）

```bash
aws s3 sync backend/data/ s3://boat-ai-data-008116135513/race/ --exclude "*" --include "race_*"
aws s3 sync backend/data/ s3://boat-ai-data-008116135513/odds/ --exclude "*" --include "odds_*"
```

## URL 継続

- `boat-ai.click` → 既存 CloudFront (`E358EP25UOKH3Z`) + S3 (`boat-ai-frontend`)
- `api.boat-ai.click` → API Gateway カスタムドメイン（Phase 2 で EC2 から切替）
