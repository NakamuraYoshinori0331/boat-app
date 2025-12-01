import React from 'react';
import { Form, Input, Button } from 'antd';

const PredictorForm: React.FC = () => {
  const onFinish = (values: any) => {
    console.log('フォーム送信:', values);
    // APIにPOST予定
  };

  return (
    <Form layout="vertical" onFinish={onFinish}>
      <Form.Item name="modelPath" label="モデルパス" rules={[{ required: true }]}>
        <Input placeholder="例: model/model_20250407.txt" />
      </Form.Item>

      <Form.Item name="raceCsvPath" label="レースCSVパス" rules={[{ required: true }]}>
        <Input placeholder="例: data/race_20250407.csv" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          予測実行
        </Button>
      </Form.Item>
    </Form>
  );
};

export default PredictorForm;