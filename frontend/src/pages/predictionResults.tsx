import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button } from 'antd';

interface PredictionItem {
  rank: number;
  combination: string;
  score: string;
  odds: number;
  popularity: number;
}

const PredictionResult: React.FC = () => {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);

  useEffect(() => {
    const storedPredictions = localStorage.getItem('predictions');
    try {
      const parsed = storedPredictions ? JSON.parse(storedPredictions) : { predictions: [] };

      // データ形式が予想と異なる場合
      if (Array.isArray(parsed.predictions)) {
        setPredictions(parsed.predictions);
      } else {
        console.error("予測データが不正です", parsed);
      }
      console.log(parsed)
    } catch (e) {
      console.error("予測データの読み込みに失敗しました", e);
    }
  }, []);

  const columns = [
    {
      title: '順位',
      dataIndex: 'rank',
      key: 'rank',
    },
    {
      title: '組番',
      dataIndex: 'combination',
      key: 'combination',
    },
    {
      title: '確率 (%)',
      dataIndex: 'score',
      key: 'score',
    },
    {
      title: '倍率',
      dataIndex: 'odds',
      key: 'odds',
    },
    {
      title: '人気',
      dataIndex: 'popularity',
      key: 'popularity',
    },
  ];

  return (
    <div>
      <Button onClick={() => navigate('/prediction')} style={{ marginBottom: 16 }}>
        予測に戻る
      </Button>
      <Table
          dataSource={predictions}
          columns={columns}
          rowKey={(_, index) => (index !== undefined ? index.toString() : "0")}
          pagination={false}
      />
    </div>
  );
};

export default PredictionResult;