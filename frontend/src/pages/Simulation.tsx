import React, { useEffect } from 'react';
import {
  Form, Button, Select, DatePicker, InputNumber, message, Empty, Collapse,
} from 'antd';
import dayjs from 'dayjs';
import api from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { STADIUM_OPTIONS } from '../constants/stadiums';
import { useDataDateRange } from '../hooks/useDataDateRange';
import { useJobPolling } from '../hooks/useJobPolling';
import PageIntro from '../components/PageIntro';

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
        message.info('条件に一致する買い目がありませんでした。条件をゆるめて再実行してください。');
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

  if (models.length === 0) {
    return (
      <div className="page-compact">
        <PageIntro
          title="シミュレーション"
          description="過去の期間で「この買い方をしていたらどうなったか」を試せます。"
          guideAnchor="simulation"
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
        title="シミュレーション"
        description="過去の期間で「この買い方をしていたらどうなったか」を試せます。初めての方は期間を短めに設定すると早く結果が出ます。"
        steps={[
          'モデルと期間を選ぶ',
          '必要なら詳細ルールを調整する',
          '「シミュレーション実行」を押す',
        ]}
        guideAnchor="simulation"
      />

      {range?.min_date && range?.max_date && (
        <p style={{ color: '#666', marginBottom: 12, fontSize: 13 }}>
          選べるデータ期間: {dayjs(range.min_date, 'YYYYMMDD').format('YYYY-MM-DD')}
          {' 〜 '}
          {dayjs(range.max_date, 'YYYYMMDD').format('YYYY-MM-DD')}
          （{range.count}日分）
        </p>
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
        <Form.Item
          label="モデル"
          name="model"
          tooltip="学習済みのモデルを選びます"
          rules={[{ required: true, message: 'モデルを選択してください' }]}
        >
          <Select placeholder="モデルを選択してください">
            {models.map((m) => (
              <Option key={m.name} value={m.name}>{m.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="対象期間"
          name="daterange"
          tooltip="灰色の日付はデータがないため選べません"
          rules={[{ required: true, message: '期間を選択してください' }]}
        >
          <RangePicker
            format="YYYY-MM-DD"
            style={{ width: '100%' }}
            disabledDate={disabledDate}
            disabled={rangeLoading}
          />
        </Form.Item>

        <Collapse
          ghost
          items={[{
            key: 'advanced',
            label: '詳しい条件を設定する（任意）',
            children: (
              <>
                <Form.Item label="レース場" name="stadium" rules={[{ required: true }]}>
                  <Select options={STADIUM_OPTIONS} />
                </Form.Item>

                <Form.Item label="候補の上位N通り" name="top_n" tooltip="各レースで検討する買い目の数">
                  <InputNumber min={1} max={50} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item label="並び順" name="sort_by">
                  <Select>
                    <Option value="probability">AI確率が高い順</Option>
                    <Option value="kitaichi">期待値が高い順</Option>
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

                <Form.Item label="1レースあたり最大購入数（0=制限なし）" name="max_bets_per_race">
                  <InputNumber min={0} max={20} style={{ width: '100%' }} />
                </Form.Item>
              </>
            ),
          }]}
          style={{ marginBottom: 16 }}
        />

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading} block>
            {isLoading ? loadingLabel : 'シミュレーション実行'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Simulation;
