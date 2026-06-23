import json
import os
import ssl
import urllib.request

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "ap-northeast-1_wWPruxvu0")
CLIENT_ID = os.getenv("COGNITO_CLIENT_ID", "6lv369imhln4tsvor6qa2hh2if")
REGION = os.getenv("AWS_REGION", "ap-northeast-1")

JWKS_URL = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

_ssl_context = ssl.create_default_context()
if os.getenv("DISABLE_SSL_VERIFY", "").lower() in ("1", "true", "yes"):
    _ssl_context.check_hostname = False
    _ssl_context.verify_mode = ssl.CERT_NONE

security = HTTPBearer(auto_error=False)


def _load_jwks() -> list:
    try:
        jwks_json = urllib.request.urlopen(JWKS_URL, context=_ssl_context, timeout=10).read()
        return json.loads(jwks_json)["keys"]
    except Exception as exc:
        print("JWKS fetch failed:", exc)
        return []


JWKS = _load_jwks()


def verify_token(token: str) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="認証トークンがありません")

    if token.startswith("Bearer "):
        token = token.replace("Bearer ", "")

    try:
        header = jwt.get_unverified_header(token)
        kid = header["kid"]
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="トークンの形式が不正です") from exc

    key = next((k for k in JWKS if k["kid"] == kid), None)
    if key is None:
        JWKS.extend(_load_jwks())
        key = next((k for k in JWKS if k["kid"] == kid), None)
    if key is None:
        raise HTTPException(status_code=401, detail="トークンの検証に失敗しました")

    try:
        return jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            options={"verify_exp": True},
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="トークンが無効です") from exc


def get_user_email(claims: dict) -> str:
    email = claims.get("email") or claims.get("cognito:username")
    if not email:
        raise HTTPException(status_code=401, detail="ユーザー情報を取得できません")
    return email


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="認証が必要です")
    return verify_token(credentials.credentials)
