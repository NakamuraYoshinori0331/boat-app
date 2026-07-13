import React, { useState, useEffect } from 'react';
import { Form, Select, InputNumber, Button, DatePicker, message, Empty, Alert } from 'antd';
import dayjs from 'dayjs';
import api from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { STADIUM_OPTIONS } from '../constants/stadiums';
import PageIntro from '../components/PageIntro';

const { Option } = Select;

const places = STADIUM_OPTIONS.filter((o) => o.value !== 'ALL');

const Prediction = () => {
  const [models, setModels] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/models')
      .then((res) => setModels(res.data))
      .catch(() => message.error('モデルの取得に失敗しました'));
  }, []);

  const onFinish = async (values: {
    model: string;
    date: dayjs.Dayjs;
    place: string;
    race: number;
    top_n: number;
    sort_by: string;
  }) => {
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
      localStorage.setItem('predictions', JSON.stringify({ ...res.data, params: payload }));
      navigate('/results');
      message.success('予測が完了しました');
    } catch {
      message.error('予測に失敗しました。レース情報やモデルを見直してください。');
    }
    setLoading(false);
  };

  if (models.length === 0) {
    return (
      <div className="page-compact">
        <PageIntro
          title="レース予測"
          description="学習済みのAIモデルを使って、指定レースの3連単候補を表示します。"
          guideAnchor="prediction"
        />
        <Empty description="使えるモデルがありません。先に学習を行ってください。">
          <Link to="/training">
            <Button type="primary">学習ページへ</Button>
          </Link>
        </Empty>
      </div>
    );
  }

  return (
    <div className="page-compact">
      <PageIntro
        title="レース予測"
        description="学習済みのAIモデルを使って、指定レースの3連単候補を表示します。"
        steps={[
          '使うモデルを選ぶ',
          '日付・レース場・レース回を指定する',
          '「予測する」を押す',
        ]}
        guideAnchor="prediction"
      />

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
        <Form.Item
          label="モデル"
          name="model"
          tooltip="学習で作ったモデルから選びます"
          rules={[{ required: true, message: 'モデルを選択してください' }]}
        >
          <Select placeholder="モデルを選択してください">
            {models.map((m) => (
              <Option key={m.name} value={m.name}>{m.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="日付" name="date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} placeholder="レースの日付" />
        </Form.Item>

        <Form.Item
          label="レース場"
          name="place"
          rules={[{ required: true, message: 'レース場を選択してください' }]}
        >
          <Select placeholder="レース場を選択">
            {places.map(({ value, label }) => (
              <Option key={value} value={value}>{label}（{value}）</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="レース回"
          name="race"
          tooltip="1〜12R のどれか"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={12} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="表示順" name="sort_by">
          <Select>
            <Option value="probability">AIが有力と判断した順</Option>
            <Option value="kitaichi">期待値が高い順</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="表示する候補数"
          name="top_n"
          tooltip="多いほど一覧が長くなります"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={120} style={{ width: '100%' }} />
        </Form.Item>

        <Alert
          type="info"
          showIcon
          message="予測結果は参考情報です"
          description="実際の投票はご自身の判断でお願いします。"
          style={{ marginBottom: 16 }}
        />

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            予測する
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Prediction;
