#!/usr/bin/env bash
# AWS 初回セットアップ: CDK bootstrap + 全スタックデプロイ
set -euo pipefail

ACCOUNT_ID="008116135513"
REGION="ap-northeast-1"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== AWS 認証確認 ==="
if ! aws sts get-caller-identity &>/dev/null; then
  echo "エラー: AWS 認証が設定されていません。"
  echo "  aws configure"
  echo "  または環境変数 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY を設定してください。"
  exit 1
fi
aws sts get-caller-identity

echo ""
echo "=== CDK bootstrap ==="
cd "$REPO_ROOT/infra"
npm ci
npx cdk bootstrap "aws://${ACCOUNT_ID}/${REGION}"

echo ""
echo "=== CDK deploy (全スタック) ==="
npx cdk deploy --all --require-approval never

echo ""
echo "=== 完了 ==="
ROLE_ARN=$(aws cloudformation describe-stacks \
  --stack-name BoatAppGitHubOidcStack \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='GitHubActionsRoleArn'].OutputValue" \
  --output text 2>/dev/null || true)

if [ -n "$ROLE_ARN" ] && [ "$ROLE_ARN" != "None" ]; then
  echo ""
  echo "GitHub Secrets に以下を登録してください:"
  echo "  AWS_DEPLOY_ROLE_ARN = $ROLE_ARN"
  echo ""
  if command -v gh &>/dev/null && gh auth status &>/dev/null; then
    echo "gh で Secret を登録します..."
    gh secret set AWS_DEPLOY_ROLE_ARN --body "$ROLE_ARN" --repo NakamuraYoshinori0331/boat-app
    echo "Secret 登録完了"
  fi
fi

DATA_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name BoatAppDataStack \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='DataBucketName'].OutputValue" \
  --output text 2>/dev/null || true)
echo "Data bucket: ${DATA_BUCKET:-（スタック出力を確認）}"
