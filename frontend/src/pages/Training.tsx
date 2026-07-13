import React, { useEffect, useState } from 'react';
import { Button, Modal, message, Form, Input, DatePicker, Checkbox, Row, Col, Select } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { STADIUM_OPTIONS, customModelName } from '../constants/stadiums';
import { useDataDateRange } from '../hooks/useDataDateRange';
import { useJobPolling } from '../hooks/useJobPolling';
import PageIntro from '../components/PageIntro';

const allFeatures = [
  '全国勝率', '全国2連率', '全国3連率', '当地勝率', '当地2連率', '当地3連率',
  'モーター2連率', 'モーター3連率', 'ボート2連率', 'ボート3連率',
  '展示タイム', '枠', 'チルト', '進入'
];

interface TrainResult {
  message: string;
  model?: string;
}

const Training = () => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [savedModel, setSavedModel] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(allFeatures);
  const navigate = useNavigate();
  const { loading: rangeLoading, range, disabledDate, defaultTrainRange } = useDataDateRange();
  const { status, submitAndWait } = useJobPolling<TrainResult>();

  useEffect(() => {
    if (!rangeLoading && range?.min_date) {
      form.setFieldsValue({
        start_date: defaultTrainRange.start,
        end_date: defaultTrainRange.end,
      });
    }
  }, [rangeLoading, range, defaultTrainRange, form]);

  const handleTrain = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        model_name: values.model_name,
        start_date: values.start_date.format('YYYYMMDD'),
        end_date: values.end_date.format('YYYYMMDD'),
        stadium: values.stadium,
        features: selectedFeatures,
      };

      const result = await submitAndWait('/train', payload);
      setSavedModel(result.model || `${values.model_name}.pkl`);
      setModalVisible(true);
    } catch (err: unknown) {
      const detail = (err as Error)?.message;
      if (detail && detail !== 'キャンセルされました') {
        message.error(detail);
      }
    }
  };

  const onCheckAll = () => setSelectedFeatures(allFeatures);
  const onUncheckAll = () => setSelectedFeatures([]);
  const onFeatureChange = (checkedValues: string[]) => setSelectedFeatures(checkedValues);

  const onStadiumChange = (stadium: string) => {
    form.setFieldValue('model_name', customModelName(stadium));
  };

  const isLoading = status === 'submitting' || status === 'running';
  const loadingLabel = status === 'running' ? '学習中（バックグラウンド処理）...' : '送信中...';

  return (
    <div className="page-compact">
      <PageIntro
        title="AIモデルの学習"
        description="過去のレースデータから、予測に使うAIモデルを作成します。最初にここから始めてください。"
        steps={[
          'モデル名と学習期間を選ぶ（期間が長いほど時間がかかります）',
          '「学習を開始」を押す',
          '完了後、「モデル一覧」で保存されたか確認する',
        ]}
        guideAnchor="training"
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
        initialValues={{
          model_name: customModelName('ALL'),
          start_date: defaultTrainRange.start,
          end_date: defaultTrainRange.end,
          stadium: 'ALL',
        }}
      >
        <Form.Item
          label="モデル名"
          name="model_name"
          tooltip="あとから一覧で識別するための名前です"
          rules={[{ required: true, message: 'モデル名を入力してください' }]}
        >
          <Input placeholder="例: custom_venue_桐生" />
        </Form.Item>

        <Form.Item
          label="データ開始日"
          name="start_date"
          tooltip="学習に使う期間の始まり"
          rules={[{ required: true }]}
        >
          <DatePicker
            format="YYYY-MM-DD"
            style={{ width: '100%' }}
            disabledDate={disabledDate}
            disabled={rangeLoading}
            placeholder="開始日を選択"
          />
        </Form.Item>

        <Form.Item
          label="データ終了日"
          name="end_date"
          tooltip="学習に使う期間の終わり"
          rules={[{ required: true }]}
        >
          <DatePicker
            format="YYYY-MM-DD"
            style={{ width: '100%' }}
            disabledDate={disabledDate}
            disabled={rangeLoading}
            placeholder="終了日を選択"
          />
        </Form.Item>

        <Form.Item
          label="レース場"
          name="stadium"
          tooltip="全場まとめて学習するか、特定の場に絞るか"
          rules={[{ required: true, message: 'レース場を選択してください' }]}
        >
          <Select
            placeholder="レース場を選択"
            options={STADIUM_OPTIONS}
            onChange={onStadiumChange}
          />
        </Form.Item>

        <Form.Item
          label="使用する特徴量"
          tooltip="初めての方はそのままで問題ありません"
        >
          <Row gutter={[8, 8]}>
            <Col><Button onClick={onCheckAll}>全選択</Button></Col>
            <Col><Button onClick={onUncheckAll}>全クリア</Button></Col>
          </Row>
          <Checkbox.Group value={selectedFeatures} onChange={onFeatureChange}>
            <Row>
              {allFeatures.map((feature) => (
                <Col span={8} key={feature}>
                  <Checkbox value={feature}>{feature}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={handleTrain} loading={isLoading} disabled={isLoading} block>
            {isLoading ? loadingLabel : '学習を開始'}
          </Button>
        </Form.Item>
      </Form>

      <Modal
        title="学習が完了しました"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>閉じる</Button>,
          <Button key="models" type="primary" onClick={() => navigate('/models')}>
            モデル一覧を確認
          </Button>,
        ]}
      >
        <p>AIモデルの学習が完了しました。</p>
        {savedModel && (
          <p>
            保存されたモデル: <strong>{savedModel}</strong>
          </p>
        )}
        <p style={{ color: '#666', marginBottom: 0 }}>
          次は「モデル一覧」で表示を確認し、「予測」画面で使ってみてください。
        </p>
      </Modal>
    </div>
  );
};

export default Training;
