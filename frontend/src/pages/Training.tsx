import React, { useState } from 'react';
import { Button, Modal, message, Form, Input, DatePicker, Checkbox, Row, Col } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';

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
        features: selectedFeatures
      };

      const response = await axios.post('http://localhost:8000/train', payload);
      console.log(response)
      if (response.status === 200) {
        console.log("success")
        setModalVisible(true);
      } else {
        console.log("失敗")
        message.error('学習に失敗しました。');
      }
    } catch (err) {
      message.error('入力内容に誤りがあります。');
    } finally {
      setLoading(false);
    }
  };

  const onCheckAll = () => setSelectedFeatures(allFeatures);
  const onUncheckAll = () => setSelectedFeatures([]);
  const onFeatureChange = (checkedValues: any) => setSelectedFeatures(checkedValues);

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          model_name: '',
          start_date: dayjs('2021-01-01'),
          end_date: dayjs('2021-01-28')
        }}
      >
        <Form.Item label="モデル名" name="model_name" rules={[{ required: true, message: 'モデル名を入力してください' }]}>
          <Input placeholder="例: model_20240408" />
        </Form.Item>

        <Form.Item label="データ開始日" name="start_date" rules={[{ required: true }]}>
          <DatePicker format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item label="データ終了日" name="end_date" rules={[{ required: true }]}>
          <DatePicker format="YYYY-MM-DD" />
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
    </>
  );
};

export default Training;