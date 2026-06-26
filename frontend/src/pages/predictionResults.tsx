import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Card } from 'antd';

interface PredictionItem {
  rank: number;
  combination: string;
  score: number;
  kitaichi: number;
  odds: number;
  popularity: number;
}

interface PredictionData {
  predictions: PredictionItem[];
  sort_by: string;
  model?: string;
}

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

  const columns = [
    { title: '順位', dataIndex: 'rank', width: 60 },
    { title: '組番', dataIndex: 'combination' },
    { title: '確率 (%)', dataIndex: 'score', render: (v: number) => `${v}%` },
    { title: '期待値', dataIndex: 'kitaichi', render: (v: number) => v.toFixed(3) },
    { title: '倍率', dataIndex: 'odds' },
    { title: '人気', dataIndex: 'popularity' },
  ];

  if (!data?.predictions?.length) {
    return <Button onClick={() => navigate('/prediction')}>予測に戻る</Button>;
  }

  const sortLabel = data.sort_by === 'kitaichi' ? '期待値順' : '確率順';

  return (
    <div className="page-compact">
      <Button onClick={() => navigate('/prediction')} style={{ marginBottom: 16 }} size="small">
        予測に戻る
      </Button>

      <Card title={`予測結果（${sortLabel}）${data.model ? ` / ${data.model}` : ''}`}>
        <Table
          dataSource={data.predictions}
          columns={columns}
          rowKey="rank"
          pagination={false}
          size="small"
          scroll={{ x: 320 }}
        />
      </Card>
    </div>
  );
};

export default PredictionResult;
