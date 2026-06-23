import React, { useState, useEffect } from 'react';
import { Form, Button, Select, DatePicker, InputNumber, Typography, Divider, message } from 'antd';
import dayjs from 'dayjs';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;
const { Title } = Typography;
const { RangePicker } = DatePicker;

const Simulation = () => {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const fetchModels = async () => {
    try {
      const res = await api.get('/models');
      setModels(res.data);
    } catch (e) {
      message.error("モデルの取得に失敗しました");
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    const payload = {
      model: values.model,
      start_date: values.daterange[0].format('YYYYMMDD'),
      end_date: values.daterange[1].format('YYYYMMDD'),
      stadium: values.stadium,
      top_n: values.top_n,
      min_odds: values.min_odds,
      max_odds: values.max_odds,
      min_probability: values.min_probability,
    };

    console.log("送信ペイロード：", payload);

    try {
      const res = await api.post('/simulation', payload);

      // バックエンドの結果を受け取る
      const result = res.data.simulation;
      console.log(result);

      // 投資がゼロなら結果なし扱い
      if (!result || result.total_bet === 0) {
        message.info("条件に一致するベットがありませんでした");
        navigate("/simulation_results", { state: { conditions: payload, result: null } });
        return;
      }

      // 結果ページに条件と結果を渡す
      localStorage.setItem("simulation_payload", JSON.stringify(payload));
      localStorage.setItem("simulation_result", JSON.stringify(result));
      navigate("/simulation_results", { state: { conditions: payload, result } });
      message.success('シミュレーションが完了しました');
    } catch (e) {
      console.error(e);
      message.error('シミュレーションに失敗しました');
    }

    setLoading(false);
  };
  const minDate = dayjs('2021-01-01');
  const maxDate = dayjs('2021-11-24');
  const STADIUM_MAP: Record<string, string> = {
    'ALL': '全レース場',
    '01': '桐生',
    '02': '戸田',
    '03': '江戸川',
    '04': '平和島',
    '05': '多摩川',
    '06': '浜名湖',
    '07': '蒲郡',
    '08': '常滑',
    '09': '津',
    '10': '三国',
    '11': 'びわこ',
    '12': '住之江',
    '13': '尼崎',
    '14': '鳴門',
    '15': '丸亀',
    '16': '児島',
    '17': '宮島',
    '18': '徳山',
    '19': '下関',
    '20': '若松',
    '21': '芦屋',
    '22': '福岡',
    '23': '唐津',
    '24': '大村',
  };
  const STADIUM_OPTIONS = Object.entries(STADIUM_MAP).map(
    ([value, label]) => ({ value, label })
  );
  return (
    <div>
      <Title level={3}>🎲 シミュレーション</Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          daterange: [dayjs('2021-11-01'), dayjs('2021-11-02')],  // 開始日・終了日の初期値
          top_n: 10,                          // 上位n通り
          min_odds: 0,                        // 最低倍率
          max_odds: 1000,                     // 最高倍率
          min_probability: 1.0,               // 最低確率 (%)
        }}
      >
        <Form.Item
          label="モデル名"
          name="model"
          rules={[{ required: true, message: 'モデルを選択してください' }]}
        >
          <Select placeholder="使用するモデルを選択">
            {models.map((m) => (
              <Option key={m.name} value={m.name}>{m.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="対象日付範囲"
          name="daterange"
          rules={[{ required: true, message: '日付範囲を指定してください' }]}
        >
          <RangePicker
            format="YYYY-MM-DD"
            disabledDate={(current) =>
              current &&
              (current.isBefore(minDate) || current.isAfter(maxDate))
            }
          />
        </Form.Item>

        <Divider orientation="left">🎯 詳細ルール</Divider>

        <Form.Item
          label="レース場"
          name="stadium"
          rules={[{ required: true, message: 'レース場を選択してください' }]}
        >
          <Select
            placeholder="レース場を選択"
            options={STADIUM_OPTIONS}
          />
        </Form.Item>

        <Form.Item label="上位N通り" name="top_n">
          <InputNumber min={1} max={50} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="最低倍率（何倍以上）" name="min_odds">
          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="最高倍率（何倍以下）" name="max_odds">
          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="最低確率（%）" name="min_probability">
          <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            シミュレーション実行
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Simulation;