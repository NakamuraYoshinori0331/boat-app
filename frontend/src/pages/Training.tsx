import React, { useEffect, useState } from 'react';
import { Button, Modal, message, Form, Input, DatePicker, Checkbox, Row, Col, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { STADIUM_OPTIONS, customModelName } from '../constants/stadiums';
import { useDataDateRange } from '../hooks/useDataDateRange';
import { useJobPolling } from '../hooks/useJobPolling';

const { Text } = Typography;

const allFeatures = [
  '全国勝率', '全国2連率', '全国3連率', '当地勝率', '当地2連率', '当地3連率',
  'モーター2連率', 'モーター3連率', 'ボート2連率', 'ボート3連率',
  '展示タイム', '枠', 'チルト', '進入'
];

const Training = () => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(allFeatures);
  const { loading: rangeLoading, range, disabledDate, defaultTrainRange } = useDataDateRange();
  const { status, submitAndWait } = useJobPolling<{ message: string }>();

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

      await submitAndWait('/train', payload);
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
        initialValues={{
          model_name: customModelName('ALL'),
          start_date: defaultTrainRange.start,
          end_date: defaultTrainRange.end,
          stadium: 'ALL',
        }}
      >
        <Form.Item label="モデル名" name="model_name" rules={[{ required: true, message: 'モデル名を入力してください' }]}>
          <Input placeholder="例: custom_venue_桐生" />
        </Form.Item>

        <Form.Item label="データ開始日" name="start_date" rules={[{ required: true }]}>
          <DatePicker
            format="YYYY-MM-DD"
            style={{ width: '100%' }}
            disabledDate={disabledDate}
            disabled={rangeLoading}
          />
        </Form.Item>

        <Form.Item label="データ終了日" name="end_date" rules={[{ required: true }]}>
          <DatePicker
            format="YYYY-MM-DD"
            style={{ width: '100%' }}
            disabledDate={disabledDate}
            disabled={rangeLoading}
          />
        </Form.Item>

        <Form.Item
          label="レース場"
          name="stadium"
          rules={[{ required: true, message: 'レース場を選択してください' }]}
        >
          <Select
            placeholder="レース場を選択"
            options={STADIUM_OPTIONS}
            onChange={onStadiumChange}
          />
        </Form.Item>

        <Form.Item label="使用する特徴量">
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
          <Button type="primary" onClick={handleTrain} loading={isLoading} disabled={isLoading}>
            {isLoading ? loadingLabel : '学習を開始'}
          </Button>
        </Form.Item>
      </Form>

      <Modal
        title="✅ 学習完了"
        open={modalVisible}
        onOk={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
        okText="OK"
      >
        <p>モデルの学習が正常に完了しました！</p>
      </Modal>
    </div>
  );
};

export default Training;
