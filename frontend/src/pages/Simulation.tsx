import React, { useEffect } from 'react';
import {
  Form, Button, Select, DatePicker, InputNumber, Typography, Divider, message,
} from 'antd';
import dayjs from 'dayjs';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { STADIUM_OPTIONS } from '../constants/stadiums';
import { useDataDateRange } from '../hooks/useDataDateRange';
import { useJobPolling } from '../hooks/useJobPolling';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface SimulationResponse {
  simulation: Record<string, unknown>;
  params_used: Record<string, unknown>;
  model: string;
}

const Simulation = () => {
  const [models, setModels] = React.useState<{ name: string }[]>([]);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { loading: rangeLoading, range, disabledDate, defaultSimRange } = useDataDateRange();
  const { status, submitAndWait } = useJobPolling<SimulationResponse>();

  useEffect(() => {
    api.get('/models')
      .then((res) => setModels(res.data))
      .catch(() => message.error('モデルの取得に失敗しました'));
  }, []);

  useEffect(() => {
    if (!rangeLoading && range?.min_date) {
      form.setFieldsValue({ daterange: defaultSimRange });
    }
  }, [rangeLoading, range, defaultSimRange, form]);

  const onFinish = async (values: {
    model: string;
    daterange: [dayjs.Dayjs, dayjs.Dayjs];
    stadium: string;
    top_n: number;
    min_odds: number;
    max_odds: number;
    min_probability: number;
    sort_by: string;
    min_kitaichi: number;
    max_bets_per_race: number;
  }) => {
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
      const res = await submitAndWait('/simulation', payload);
      const result = res.simulation;
      const fullResult = { ...res, conditions: payload };

      if (!result || (result as { total_bet?: number }).total_bet === 0) {
        message.info('条件に一致するベットがありませんでした');
        navigate('/simulation_results', { state: { conditions: payload, result: null } });
        return;
      }

      localStorage.setItem('simulation_payload', JSON.stringify(fullResult));
      localStorage.setItem('simulation_result', JSON.stringify(result));
      navigate('/simulation_results', { state: { conditions: payload, result } });
      message.success('シミュレーションが完了しました');
    } catch (e: unknown) {
      const detail = (e as Error)?.message;
      if (detail && detail !== 'キャンセルされました') {
        message.error(detail);
      }
    }
  };

  const isLoading = status === 'submitting' || status === 'running';
  const loadingLabel = status === 'running' ? 'シミュレーション中（バックグラウンド処理）...' : '送信中...';

  return (
    <div className="page-compact">
      <Title level={4}>🎲 シミュレーション</Title>

      {range?.min_date && range?.max_date && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          利用可能データ: {dayjs(range.min_date, 'YYYYMMDD').format('YYYY-MM-DD')}
          {' 〜 '}
          {dayjs(range.max_date, 'YYYYMMDD').format('YYYY-MM-DD')}
          （{range.count}日分）
        </Text>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          daterange: defaultSimRange,
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
          <RangePicker
            format="YYYY-MM-DD"
            style={{ width: '100%' }}
            disabledDate={disabledDate}
            disabled={rangeLoading}
          />
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
          <Button type="primary" htmlType="submit" loading={isLoading}>
            {isLoading ? loadingLabel : 'シミュレーション実行'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Simulation;
