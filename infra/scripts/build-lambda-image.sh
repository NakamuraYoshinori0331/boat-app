#!/usr/bin/env bash
set -euo pipefail

ACCOUNT_ID="008116135513"
REGION="ap-northeast-1"
REPO="cdk-hnb659fds-container-assets-${ACCOUNT_ID}-${REGION}"
IMAGE_TAG="5dc7d5df1fd83add152032f3b58c60caa3a42920cc3af667d011df6ac46bdcfc"
IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO}:${IMAGE_TAG}"
BUCKET="boat-ai-data-008116135513"
ROLE_NAME="boat-app-codebuild-role"
PROJECT_NAME="boat-app-lambda-build"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND_ZIP="/tmp/boat-backend-src.zip"

echo "==> Packaging backend source"
(cd "$ROOT/backend" && zip -qr "$BACKEND_ZIP" .)

echo "==> Uploading source to S3"
aws s3 cp "$BACKEND_ZIP" "s3://${BUCKET}/build/backend-src.zip"

TRUST_POLICY='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"codebuild.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "==> Creating CodeBuild role"
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST_POLICY"
  aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
  sleep 10
fi

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

BUILDSPEC=$(cat <<EOF
version: 0.2
phases:
  pre_build:
    commands:
      - unzip backend-src.zip
      - aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
  build:
    commands:
      - docker build -t $IMAGE_URI .
      - docker push $IMAGE_URI
EOF
)

if ! aws codebuild batch-get-projects --names "$PROJECT_NAME" --query 'projects[0].name' --output text 2>/dev/null | grep -q "$PROJECT_NAME"; then
  echo "==> Creating CodeBuild project"
  aws codebuild create-project \
    --name "$PROJECT_NAME" \
    --source "type=S3,location=${BUCKET}/build/backend-src.zip,buildspec=${BUILDSPEC}" \
    --artifacts type=NO_ARTIFACTS \
    --environment "type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_MEDIUM,privilegedMode=true" \
    --service-role "$ROLE_ARN"
else
  echo "==> Updating CodeBuild project source"
  aws codebuild update-project \
    --name "$PROJECT_NAME" \
    --source "type=S3,location=${BUCKET}/build/backend-src.zip,buildspec=${BUILDSPEC}" \
    --environment "type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_MEDIUM,privilegedMode=true" \
    --service-role "$ROLE_ARN"
fi

echo "==> Starting CodeBuild"
BUILD_ID=$(aws codebuild start-build --project-name "$PROJECT_NAME" --query 'build.id' --output text)
echo "Build ID: $BUILD_ID"

while true; do
  STATUS=$(aws codebuild batch-get-builds --ids "$BUILD_ID" --query 'builds[0].buildStatus' --output text)
  echo "Status: $STATUS"
  if [[ "$STATUS" == "SUCCEEDED" ]]; then
    break
  fi
  if [[ "$STATUS" == "FAILED" || "$STATUS" == "FAULT" || "$STATUS" == "STOPPED" ]]; then
    aws codebuild batch-get-builds --ids "$BUILD_ID" --query 'builds[0].phases' --output json
    exit 1
  fi
  sleep 15
done

echo "==> Image published: $IMAGE_URI"
