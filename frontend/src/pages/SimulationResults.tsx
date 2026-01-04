import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Result } from 'antd';

interface SimulationResultData {
  total_bet: number;
  total_return?: number;
  total_balance?: number;
  hit_rate?: number;
  recovery_rate?: number;
}

const SimulationResult: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const simulation_payload = localStorage.getItem('simulation_payload');
  const simulation_result = localStorage.getItem('simulation_result');
  const conditions = simulation_payload ? JSON.parse(simulation_payload) : { predictions: [] };
  const result = simulation_result ? JSON.parse(simulation_result) : { predictions: [] };
  // const { conditions, result } = location.state || {};

  // 対象のベットが無かった場合
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

  return (
    <div style={{ padding: 20 }}>
      <Card title="シミュレーション条件" style={{ marginBottom: 20 }}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="モデル">{conditions?.model}</Descriptions.Item>
          <Descriptions.Item label="開始日">{conditions?.start_date}</Descriptions.Item>
          <Descriptions.Item label="終了日">{conditions?.end_date}</Descriptions.Item>
          <Descriptions.Item label="上位n通り">{conditions?.top_n}</Descriptions.Item>
          <Descriptions.Item label="倍率下限">{conditions?.min_odds}</Descriptions.Item>
          <Descriptions.Item label="倍率上限">{conditions?.max_odds}</Descriptions.Item>
          <Descriptions.Item label="確率下限">{conditions?.min_probability}%</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="シミュレーション結果">
        <Descriptions bordered column={1}>
          <Descriptions.Item label="総投資金額">{result.total_bet} 円</Descriptions.Item>
          <Descriptions.Item label="総払戻金">{result.total_return} 円</Descriptions.Item>
          <Descriptions.Item label="収支">{result.total_balance} 円</Descriptions.Item>
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