import React from "react";
import { Form, Input, Button, Card, message } from "antd";
import { useNavigate } from "react-router-dom";
import UserPool from "../pages/UserPool";
import { CognitoUserAttribute } from "amazon-cognito-identity-js";

export default function Register() {
  const navigate = useNavigate();

    const onFinish = (values: any) => {
      const { email, password } = values;
  
      const attributes = [
        new CognitoUserAttribute({
          Name: "email",
          Value: email,
        }),
      ];
  
      UserPool.signUp(email, password, attributes, [], (err, data) => {
      if (err) {
        message.error(err.message);
        return;
      }
      message.success("確認コードを送信しました！");
      navigate("/confirm", { state: { email } });
    });
  };

  return (
    <Card title="新規登録" style={{ width: 400, margin: "40px auto" }}>
      <Form onFinish={onFinish}>
        <Form.Item name="email" rules={[{ required: true }]}>
          <Input placeholder="メールアドレス" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true }]}>
          <Input.Password placeholder="パスワード" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          登録
        </Button>
      </Form>

      <Button type="link" block onClick={() => navigate("/login")}>
        ログインへ戻る
      </Button>
    </Card>
  );
}