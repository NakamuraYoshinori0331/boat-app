import React from 'react';
import { Form, Input, Button, Card, message } from "antd";
import { CognitoUser, AuthenticationDetails } from "amazon-cognito-identity-js";
import UserPool from "../pages/UserPool";
import { useNavigate } from "react-router-dom";
import axios from 'axios';


export default function Login() {
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_BASE;

  const onFinish = (values: any) => {
    const { email, password } = values;
    const user = new CognitoUser({ Username: email, Pool: UserPool });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: async (session) => {
        message.success("ログイン成功！");
      
        localStorage.setItem("accessToken", session.getIdToken().getJwtToken());
        localStorage.setItem("refreshToken", session.getRefreshToken().getToken());
        const payload = {
          user_email: email
        };
        await axios.post(`${API_BASE}/set_email`, payload);
        localStorage.setItem("user_email", email);
        navigate("/training");
      },
      onFailure: (err) => {
        console.error("Login error:", err);
        message.error(err.message);
      },
      newPasswordRequired: () => {
        message.warning("初回ログインのため、新しいパスワードが必要です。");
        navigate("/reset"); // パスワード変更ページへ誘導
      },
    });
  };

  return (
    <Card title="ログイン" style={{ width: 400, margin: "40px auto" }}>
      <Form onFinish={onFinish}>
        <Form.Item name="email" rules={[{ required: true }]}>
          <Input placeholder="メールアドレス" />
        </Form.Item>

        <Form.Item name="password" rules={[{ required: true }]}>
          <Input.Password placeholder="パスワード" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
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