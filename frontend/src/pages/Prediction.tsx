import React, { useState, useEffect } from 'react';
import { Form, Select, InputNumber, Button, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { STADIUM_OPTIONS } from '../constants/stadiums';

const { Option } = Select;

const places = STADIUM_OPTIONS.filter((o) => o.value !== 'ALL');

const Prediction = () => {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/models')
      .then((res) => setModels(res.data))
      .catch(() => message.error('モデルの取得に失敗しました'));
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    const payload = {
      model: values.model,
      date: values.date.format('YYYYMMDD'),
      place_id: values.place,
      race_no: String(values.race),
      top_n: String(values.top_n),
      sort_by: values.sort_by,
    };

    try {
      const res = await api.post('/predict', payload);
      if (!res.data.predictions?.length) {
        throw new Error('結果がありません');
      }
      localStorage.setItem('predictions', JSON.stringify(res.data));
      navigate('/results');
      message.success('予測が完了しました');
    } catch {
      message.error('予測に失敗しました');
    }
    setLoading(false);
  };

  return (
    <div className="page-compact">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          sort_by: 'probability',
          top_n: 20,
          race: 1,
          date: dayjs(),
        }}
      >
        <Form.Item label="モデル" name="model" rules={[{ required: true, message: 'モデルを選択してください' }]}>
          <Select placeholder="モデルを選択">
            {models.map((m) => (
              <Option key={m.name} value={m.name}>{m.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="日付" name="date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="レース場" name="place" rules={[{ required: true, message: 'レース場を選択してください' }]}>
          <Select placeholder="レース場を選択">
            {places.map(({ value, label }) => (
              <Option key={value} value={value}>{value}：{label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="レース回" name="race" rules={[{ required: true }]}>
          <InputNumber min={1} max={12} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="表示順" name="sort_by">
          <Select>
            <Option value="probability">確率順</Option>
            <Option value="kitaichi">期待値順</Option>
          </Select>
        </Form.Item>

        <Form.Item label="予想数" name="top_n" rules={[{ required: true }]}>
          <InputNumber min={1} max={120} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            予測する
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Prediction;
