import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Card, Typography, Space, message } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Title, Text } = Typography;

const MAX_RACE_NO = 12;

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
  params?: {
    model: string;
    date: string;
    place_id: string;
    race_no: string;
    top_n: string;
    sort_by: string;
  };
}

const formatProb = (v: number) => `${v.toFixed(2)}%`;

const PredictionResult: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PredictionData | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('predictions');
    if (!stored) return;
    try {
      setData(JSON.parse(stored));
    } catch {
      console.error('予測データの読み込みに失敗しました');
    }
  }, []);

  const getParams = (predictionData: PredictionData) => {
    if (predictionData.params) return predictionData.params;
    if (!predictionData.race_info || !predictionData.model) return null;
    return {
      model: predictionData.model,
      date: predictionData.race_info.date,
      place_id: predictionData.race_info.place_id,
      race_no: String(predictionData.race_info.race_no),
      top_n: String(predictionData.predictions.length),
      sort_by: predictionData.sort_by,
    };
  };

  const handleNextRace = async () => {
    if (!data) return;
    const params = getParams(data);
    if (!params) {
      message.error('予測条件を取得できませんでした');
      return;
    }

    const currentRace = Number(params.race_no);
    if (currentRace >= MAX_RACE_NO) return;

    const nextPayload = {
      ...params,
      race_no: String(currentRace + 1),
    };

    setLoadingNext(true);
    try {
      const res = await api.post('/predict', nextPayload);
      if (!res.data.predictions?.length) {
        throw new Error('結果がありません');
      }
      const stored = { ...res.data, params: nextPayload };
      localStorage.setItem('predictions', JSON.stringify(stored));
      setData(stored);
      message.success(`第${currentRace + 1}レースの予測が完了しました`);
    } catch {
      message.error('次のレースの予測に失敗しました');
    }
    setLoadingNext(false);
  };

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
  const params = getParams(data);
  const currentRaceNo = raceInfo?.race_no ?? Number(params?.race_no ?? 0);
  const canPredictNext = Boolean(params && currentRaceNo > 0 && currentRaceNo < MAX_RACE_NO);
  const isLastRace = Boolean(currentRaceNo && currentRaceNo >= MAX_RACE_NO);

  return (
    <div className="page-compact">
      <Space wrap style={{ marginBottom: 16 }}>
        <Button onClick={() => navigate('/prediction')} size="small">
          予測に戻る
        </Button>
        <Button
          type="primary"
          icon={<RightOutlined />}
          size="small"
          loading={loadingNext}
          disabled={!canPredictNext || loadingNext}
          onClick={handleNextRace}
        >
          {isLastRace
            ? '最終レースです'
            : `第${currentRaceNo + 1}レースを予測（同じ条件）`}
        </Button>
      </Space>

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
