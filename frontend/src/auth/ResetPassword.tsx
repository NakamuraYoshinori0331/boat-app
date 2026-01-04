import React, { useState } from "react";
import { Card, Input, Button, Form, message } from "antd";
import { CognitoUser } from "amazon-cognito-identity-js";
import UserPool from "../pages/UserPool";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  // --- Step 1: Send Code ---
  const sendCode = () => {
    if (!email) {
      message.error("メールアドレスを入力してください");
      return;
    }

    const user = new CognitoUser({
      Username: email.trim(),
      Pool: UserPool,
    });

    user.forgotPassword({
      onSuccess: () => {
        message.success("確認コードを送信しました！");
        setSent(true);
      },
      onFailure: (err) => {
        console.log(err);
        message.error(err.message);
      },
    });
  };

  // --- Step 2: Confirm new password ---
  const reset = (values: any) => {
    const { code, newPassword } = values;

    if (!email) {
      message.error("メールアドレスがありません。最初からやり直してください。");
      return;
    }

    const user = new CognitoUser({
      Username: email.trim(),
      Pool: UserPool,
    });

    // ★ confirmPassword 正しい書き方
    console.log(code.trim());
    console.log(newPassword);
    user.confirmPassword(code.trim(), newPassword, {
      onSuccess: () => navigate("/login"),
      onFailure: (err) => {
        console.log(err);
        message.error(err.message || "パスワード変更に失敗しました");
      },
    });
  };

  return (
    <Card title="パスワードリセット" style={{ width: 400, margin: "40px auto" }}>
      {!sent ? (
        <>
          <Input
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="primary" block onClick={sendCode} style={{ marginTop: 10 }}>
            確認コード送信
          </Button>
        </>
      ) : (
        <Form onFinish={reset}>
          <Form.Item name="code" rules={[{ required: true }]}>
            <Input placeholder="確認コード" />
          </Form.Item>
          <Form.Item name="newPassword" rules={[{ required: true }]}>
            <Input.Password placeholder="新しいパスワード" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            変更する
          </Button>
        </Form>
      )}
      <Button type="link" block onClick={() => navigate("/login")}>
        ログインへ戻る
      </Button>
    </Card>
  );
}