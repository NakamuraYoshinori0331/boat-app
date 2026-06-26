import React, { useState } from 'react';
import { Button, Modal, message, Form, Input, DatePicker, Checkbox, Row, Col, Select } from 'antd';
import api from '../api/client';
import dayjs from 'dayjs';
import { STADIUM_OPTIONS, customModelName } from '../constants/stadiums';

const allFeatures = [
  '全国勝率', '全国2連率', '全国3連率', '当地勝率', '当地2連率', '当地3連率',
  'モーター2連率', 'モーター3連率', 'ボート2連率', 'ボート3連率',
  '展示タイム', '枠', 'チルト', '進入'
];

const Training = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(allFeatures);

  const handleTrain = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        model_name: values.model_name,
        start_date: values.start_date.format('YYYYMMDD'),
        end_date: values.end_date.format('YYYYMMDD'),
        stadium: values.stadium,
        features: selectedFeatures,
      };

      const response = await api.post('/train', payload);
      if (response.status === 200) {
        setModalVisible(true);
      } else {
        message.error('学習に失敗しました。');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : '学習に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const onCheckAll = () => setSelectedFeatures(allFeatures);
  const onUncheckAll = () => setSelectedFeatures([]);
  const onFeatureChange = (checkedValues: any) => setSelectedFeatures(checkedValues);

  const onStadiumChange = (stadium: string) => {
    form.setFieldValue('model_name', customModelName(stadium));
  };

  return (
    <div className="page-compact">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          model_name: customModelName('ALL'),
          start_date: dayjs().subtract(1, 'year'),
          end_date: dayjs(),
          stadium: 'ALL',
        }}
      >
        <Form.Item label="モデル名" name="model_name" rules={[{ required: true, message: 'モデル名を入力してください' }]}>
          <Input placeholder="例: custom_venue_桐生" />
        </Form.Item>

        <Form.Item label="データ開始日" name="start_date" rules={[{ required: true }]}>
          <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="データ終了日" name="end_date" rules={[{ required: true }]}>
          <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
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
          <Button type="primary" onClick={handleTrain} loading={loading} disabled={loading}>
            {loading ? '学習中...' : '学習を開始'}
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
