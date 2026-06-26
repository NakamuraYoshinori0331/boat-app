import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Result } from 'antd';

const SimulationResult: React.FC = () => {
  const navigate = useNavigate();
  const simulation_payload = localStorage.getItem('simulation_payload');
  const simulation_result = localStorage.getItem('simulation_result');
  const payload = simulation_payload ? JSON.parse(simulation_payload) : {};
  const conditions = payload.conditions || payload;
  const result = simulation_result ? JSON.parse(simulation_result) : null;

  if (!result || result.total_bet === 0) {
    return (
      <Result
        status="info"
        title="対象のベットがありませんでした"
        subTitle="指定された条件に一致するベットはありません。条件を変更して再度お試しください。"
        extra={<Button onClick={() => navigate('/simulation')}>条件を再設定する</Button>}
      />
    );
  }

  const sortLabel = conditions?.sort_by === 'kitaichi' ? '期待値順' : '確率順';

  return (
    <div className="page-compact">
      <Card title="シミュレーション条件" style={{ marginBottom: 20 }}>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="モデル">{payload.model || conditions?.model}</Descriptions.Item>
          <Descriptions.Item label="開始日">{conditions?.start_date}</Descriptions.Item>
          <Descriptions.Item label="終了日">{conditions?.end_date}</Descriptions.Item>
          <Descriptions.Item label="レース場">{conditions?.stadium}</Descriptions.Item>
          <Descriptions.Item label="上位n通り">{conditions?.top_n}</Descriptions.Item>
          <Descriptions.Item label="表示順">{sortLabel}</Descriptions.Item>
          <Descriptions.Item label="倍率下限">{conditions?.min_odds}</Descriptions.Item>
          <Descriptions.Item label="倍率上限">{conditions?.max_odds}</Descriptions.Item>
          <Descriptions.Item label="確率下限">{conditions?.min_probability}%</Descriptions.Item>
          <Descriptions.Item label="最低期待値">{conditions?.min_kitaichi}</Descriptions.Item>
          <Descriptions.Item label="1レース最大賭け数">
            {conditions?.max_bets_per_race === 0 ? '制限なし' : conditions?.max_bets_per_race}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="シミュレーション結果">
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="総投資金額">{result.total_bet?.toLocaleString()} 円</Descriptions.Item>
          <Descriptions.Item label="総払戻金">{result.total_return?.toLocaleString()} 円</Descriptions.Item>
          <Descriptions.Item label="収支">{result.total_balance?.toLocaleString()} 円</Descriptions.Item>
          <Descriptions.Item label="賭け数">{result.bet_count}</Descriptions.Item>
          <Descriptions.Item label="的中率">{result.hit_rate?.toFixed(2)} %</Descriptions.Item>
          <Descriptions.Item label="回収率">{result.recovery_rate?.toFixed(2)} %</Descriptions.Item>
        </Descriptions>
      </Card>

      <div style={{ marginTop: 20 }}>
        <Button type="primary" onClick={() => navigate('/simulation')}>
          条件を再設定する
        </Button>
      </div>
    </div>
  );
};

export default SimulationResult;
