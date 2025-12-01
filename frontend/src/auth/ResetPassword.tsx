import { useState } from "react";
import { Card, Form, Input, Button, message } from "antd";
import axios from "axios";

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // ※FastAPI側が /auth/reset-password を持っている想定
      await axios.post("http://localhost:8000/auth/reset-password", values);
      message.success("パスワード再設定メールを送信しました！");
    } catch (e) {
      message.error("送信に失敗しました");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "10vh" }}>
      <Card title="パスワード再設定" style={{ width: 380 }}>
        <Form onFinish={onFinish} layout="vertical">

          <Form.Item
            label="登録メールアドレス"
            name="email"
            rules={[{ required: true, message: "メールアドレスを入力してください" }]}
          >
            <Input />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block>
            再設定メールを送信
          </Button>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <a href="/login">ログイン画面へ戻る</a>
          </div>
        </Form>
      </Card>
    </div>
  );
}