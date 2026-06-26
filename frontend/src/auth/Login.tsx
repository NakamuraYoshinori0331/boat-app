import React from 'react';
import { Form, Input, Button, Card, message } from "antd";
import { CognitoUser, AuthenticationDetails } from "amazon-cognito-identity-js";
import UserPool from "../pages/UserPool";
import { useNavigate } from "react-router-dom";

function saveAuthSession(session: any, email: string): boolean {
  try {
    localStorage.setItem("accessToken", session.getIdToken().getJwtToken());
    localStorage.setItem("refreshToken", session.getRefreshToken().getToken());
    localStorage.setItem("user_email", email);
    return true;
  } catch {
    message.error(
      "ログイン情報を保存できません。プライベートブラウズを解除するか、別のブラウザでお試しください。"
    );
    return false;
  }
}

export default function Login() {
  const navigate = useNavigate();

  const onFinish = (values: any) => {
    const { email, password } = values;
    const user = new CognitoUser({ Username: email.trim(), Pool: UserPool });

    const authDetails = new AuthenticationDetails({
      Username: email.trim(),
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        if (!saveAuthSession(session, email.trim())) {
          return;
        }
        message.success("ログイン成功！");
        navigate("/training");
      },
      onFailure: (err) => {
        console.error("Login error:", err);
        const msg = err.message || "ログインに失敗しました";
        if (msg.includes("Network")) {
          message.error("通信エラーです。回線を確認して再試行してください。");
          return;
        }
        message.error(msg);
      },
      newPasswordRequired: () => {
        message.warning("初回ログインのため、新しいパスワードが必要です。");
        navigate("/reset");
      },
    });
  };

  return (
    <Card
      title="ログイン"
      style={{
        width: "min(400px, calc(100vw - 32px))",
        margin: "24px auto",
      }}
    >
      <Form onFinish={onFinish} layout="vertical">
        <Form.Item
          name="email"
          label="メールアドレス"
          rules={[{ required: true, type: "email", message: "メールアドレスを入力してください" }]}
        >
          <Input
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="example@email.com"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="パスワード"
          rules={[{ required: true, message: "パスワードを入力してください" }]}
        >
          <Input.Password autoComplete="current-password" placeholder="パスワード" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large">
          ログイン
        </Button>
      </Form>

      <Button type="link" block onClick={() => navigate("/register")}>
        新規登録
      </Button>
      <Button type="link" block onClick={() => navigate("/reset")}>
        パスワードを忘れた
      </Button>
    </Card>
  );
}
