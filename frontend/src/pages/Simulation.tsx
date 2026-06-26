import React, { useState, useEffect } from 'react';
import {
  Form, Button, Select, DatePicker, InputNumber, Typography, Divider, message,
} from 'antd';
import dayjs from 'dayjs';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { STADIUM_OPTIONS } from '../constants/stadiums';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Simulation = () => {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    api.get('/models')
      .then((res) => setModels(res.data))
      .catch(() => message.error('モデルの取得に失敗しました'));
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
      sort_by: values.sort_by,
      min_kitaichi: values.min_kitaichi,
      max_bets_per_race: values.max_bets_per_race,
    };

    try {
      const res = await api.post('/simulation', payload);
      const result = res.data.simulation;
      const fullResult = { ...res.data, conditions: payload };

      if (!result || result.total_bet === 0) {
        message.info('条件に一致するベットがありませんでした');
        navigate('/simulation_results', { state: { conditions: payload, result: null } });
        return;
      }

      localStorage.setItem('simulation_payload', JSON.stringify(fullResult));
      localStorage.setItem('simulation_result', JSON.stringify(result));
      navigate('/simulation_results', { state: { conditions: payload, result } });
      message.success('シミュレーションが完了しました');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'シミュレーションに失敗しました');
    }
    setLoading(false);
  };

  return (
    <div className="page-compact">
      <Title level={4}>🎲 シミュレーション</Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          daterange: [dayjs().subtract(30, 'day'), dayjs()],
          stadium: 'ALL',
          top_n: 20,
          min_odds: 5,
          max_odds: 100,
          min_probability: 0.5,
          sort_by: 'probability',
          min_kitaichi: 0,
          max_bets_per_race: 0,
        }}
      >
        <Form.Item label="モデル名" name="model" rules={[{ required: true, message: 'モデルを選択してください' }]}>
          <Select placeholder="使用するモデルを選択">
            {models.map((m) => (
              <Option key={m.name} value={m.name}>{m.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="対象日付範囲" name="daterange" rules={[{ required: true }]}>
          <RangePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
        </Form.Item>

        <Divider orientation="left">🎯 詳細ルール</Divider>

        <Form.Item label="レース場" name="stadium" rules={[{ required: true }]}>
          <Select options={STADIUM_OPTIONS} />
        </Form.Item>

        <Form.Item label="上位N通り" name="top_n">
          <InputNumber min={1} max={50} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="表示順" name="sort_by">
          <Select>
            <Option value="probability">確率順</Option>
            <Option value="kitaichi">期待値順</Option>
          </Select>
        </Form.Item>

        <Form.Item label="最低倍率" name="min_odds">
          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="最高倍率" name="max_odds">
          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="最低確率（%）" name="min_probability">
          <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="最低期待値" name="min_kitaichi">
          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="1レースあたり最大賭け数（0=制限なし）" name="max_bets_per_race">
          <InputNumber min={0} max={20} style={{ width: '100%' }} />
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
