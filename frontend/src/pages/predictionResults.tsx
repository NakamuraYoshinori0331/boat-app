import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Card, Typography } from 'antd';

const { Title, Text } = Typography;

interface PredictionItem {
  rank: number;
  combination: string;
  probability: number;
  score: number;
  kitaichi: number;
  odds: number;
  popularity: number;
}

interface BoatProbability {
  boat: number;
  racer: string;
  prob_1st: number;
  prob_2nd: number;
  prob_3rd: number;
}

interface RaceInfo {
  date: string;
  date_label: string;
  place_id: string;
  place_name: string;
  race_no: number;
}

interface PredictionData {
  predictions: PredictionItem[];
  boat_probabilities?: BoatProbability[];
  sort_by: string;
  model?: string;
  race_info?: RaceInfo;
}

const formatProb = (v: number) => `${v.toFixed(2)}%`;

const PredictionResult: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PredictionData | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('predictions');
    if (!stored) return;
    try {
      setData(JSON.parse(stored));
    } catch {
      console.error('予測データの読み込みに失敗しました');
    }
  }, []);

  const boatColumns = [
    { title: '艇', dataIndex: 'boat', width: 48 },
    { title: '選手', dataIndex: 'racer', ellipsis: true },
    { title: '1着', dataIndex: 'prob_1st', render: formatProb },
    { title: '2着', dataIndex: 'prob_2nd', render: formatProb },
    { title: '3着', dataIndex: 'prob_3rd', render: formatProb },
  ];

  const trifectaColumns = [
    { title: '順位', dataIndex: 'rank', width: 60 },
    { title: '組番', dataIndex: 'combination' },
    {
      title: 'AI確率',
      dataIndex: 'probability',
      render: (_: number, record: PredictionItem) =>
        formatProb(record.probability ?? record.score),
    },
    { title: '期待値', dataIndex: 'kitaichi', render: (v: number) => v.toFixed(3) },
    { title: '倍率', dataIndex: 'odds' },
    { title: '人気', dataIndex: 'popularity' },
  ];

  if (!data?.predictions?.length) {
    return <Button onClick={() => navigate('/prediction')}>予測に戻る</Button>;
  }

  const sortLabel = data.sort_by === 'kitaichi' ? '期待値順' : 'AI確率順';
  const raceInfo = data.race_info;

  return (
    <div className="page-compact">
      <Button onClick={() => navigate('/prediction')} style={{ marginBottom: 16 }} size="small">
        予測に戻る
      </Button>

      {raceInfo && (
        <Card style={{ marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0 }}>
            {raceInfo.place_name}　{raceInfo.date_label}　第{raceInfo.race_no}レース
          </Title>
          {data.model && (
            <Text type="secondary">モデル: {data.model}</Text>
          )}
        </Card>
      )}

      {data.boat_probabilities && data.boat_probabilities.length > 0 && (
        <Card title="各艇のAI予測確率" style={{ marginBottom: 16 }}>
          <Table
            dataSource={data.boat_probabilities}
            columns={boatColumns}
            rowKey="boat"
            pagination={false}
            size="small"
            scroll={{ x: 360 }}
          />
        </Card>
      )}

      <Card title={`3連単候補（${sortLabel}）${data.model ? ` / ${data.model}` : ''}`}>
        <Table
          dataSource={data.predictions}
          columns={trifectaColumns}
          rowKey="rank"
          pagination={false}
          size="small"
          scroll={{ x: 360 }}
        />
      </Card>
    </div>
  );
};

export default PredictionResult;
