import { useState } from "react";
import { Card, Form, Input, Button, message } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // ※FastAPI側が /auth/register を持っている想定
      await axios.post("http://localhost:8000/auth/register", values);
      message.success("ユーザー登録が完了しました！");
      navigate("/login");
    } catch (e) {
      message.error("登録に失敗しました");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "10vh" }}>
      <Card title="新規ユーザー登録" style={{ width: 400 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            label="メールアドレス"
            name="email"
            rules={[{ required: true, message: "メールアドレスを入力してください" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="パスワード"
            name="password"
            rules={[{ required: true, message: "パスワードを入力してください" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="パスワード（確認）"
            name="confirm"
            dependencies={["password"]}
            rules={[
              { required: true, message: "確認用パスワードを入力してください" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("パスワードが一致しません"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block>
            登録
          </Button>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <a href="/login">ログイン画面へ戻る</a>
          </div>
        </Form>
      </Card>
    </div>
  );
}