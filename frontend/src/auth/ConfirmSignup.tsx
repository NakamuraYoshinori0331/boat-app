// src/auth/ConfirmSignup.tsx
import React from "react";
import { Form, Input, Button, Card, message } from "antd";
import { CognitoUser } from "amazon-cognito-identity-js";
import UserPool from "../pages/UserPool";
import { useLocation, useNavigate } from "react-router-dom";

export default function ConfirmSignup() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email ?? "";

  if (!email) {
    return <p>メールアドレスがありません。新規登録からやり直してください。</p>;
  }

  const onFinish = (values: any) => {
    const { code } = values;
    const user = new CognitoUser({ Username: email, Pool: UserPool });
    console.log(user);

    user.confirmRegistration(code, true, (err, result) => {
      if (err) {
        message.error(err.message);
        return;
      }
      message.success("メール確認が完了しました！");
      navigate("/login");
    });
  };

  const resendCode = () => {
    const user = new CognitoUser({ Username: email, Pool: UserPool });

    user.resendConfirmationCode((err, result) => {
      if (err) {
        message.error(err.message);
        return;
      }
      message.success("確認コードを再送しました！");
    });
  };

  return (
    <Card title="メール確認" style={{ width: 400, margin: "40px auto" }}>
      <p>{email} に送信された確認コードを入力してください。</p>

      <Form onFinish={onFinish}>
        <Form.Item name="code" rules={[{ required: true }]}>
          <Input placeholder="確認コード" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          確認する
        </Button>

        <Button type="link" block onClick={resendCode}>
          確認コードを再送
        </Button>
      </Form>
    </Card>
  );
}
