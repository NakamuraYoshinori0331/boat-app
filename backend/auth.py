import json
import ssl
import urllib.request
from jose import jwt, JWTError

# ===== Cognito 設定 =====
USER_POOL_ID = "ap-northeast-1_wWPruxvu0"
CLIENT_ID = "6lv369imhln4tsvor6qa2hh2if"
REGION = "ap-northeast-1"

# ===== JWKS（公開鍵）取得 =====
JWKS_URL = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

# 🔥 Windows の SSL エラーを回避するために証明書検証を OFF にする
ssl_context = ssl._create_unverified_context()

try:
    jwks_json = urllib.request.urlopen(JWKS_URL, context=ssl_context).read()
    jwks = json.loads(jwks_json)["keys"]
except Exception as e:
    print("❌ JWKS の取得に失敗:", e)
    jwks = []


def verify_token(token: str):
    """
    Cognito JWT を検証する。
    正常なら payload（ユーザー情報）を返す。
    エラーなら False を返す。
    """
    if token.startswith("Bearer "):
        token = token.replace("Bearer ", "")

    # JWT header から kid を取得
    try:
        header = jwt.get_unverified_header(token)
        kid = header["kid"]
    except JWTError:
        print("❌ トークンのヘッダー解析に失敗")
        return False

    # kid に対応する公開鍵（JWKS）を探す
    key = next((k for k in jwks if k["kid"] == kid), None)
    if key is None:
        print("❌ JWKS に一致する kid がない")
        return False

    # 署名検証
    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            options={"verify_exp": True}
        )
        return payload

    except JWTError as e:
        print("❌ JWT デコードエラー:", e)
        return False
