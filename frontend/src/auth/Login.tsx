import { useState } from "react";
import { Button, Card, Form, Input, message } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/auth/login", values);
      localStorage.setItem("token", res.data.token);

      message.success("ログイン成功！");
      navigate("/");
    } catch (e) {
      message.error("ログインできませんでした");
    }
    setLoading(false);
  };

  return (
    <div style={{display:"flex", justifyContent:"center", marginTop:"10vh"}}>
      <Card title="ログイン" style={{ width: 380 }}>
        <Form onFinish={onFinish}>
          <Form.Item name="email" rules={[{ required: true, message: "メールを入力してください" }]}>
            <Input placeholder="メールアドレス" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: "パスワードを入力してください" }]}>
            <Input.Password placeholder="パスワード" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block>
            ログイン
          </Button>

          <div style={{ marginTop: 10, textAlign: "center" }}>
            <a href="/register">新規登録</a> / 
            <a href="/reset-password" style={{ marginLeft: 10 }}>パスワードを忘れた?</a>
          </div>
        </Form>
      </Card>
    </div>
  );
}