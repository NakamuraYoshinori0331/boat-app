import React, { useState } from 'react';
import { Button, Modal, message, Form, Input, DatePicker, Checkbox, Row, Col, Select } from 'antd';
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
  const API_BASE = process.env.REACT_APP_API_BASE;

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
        user_email: localStorage.getItem("user_email")
      };

      const response = await axios.post(`${API_BASE}/train`, payload);
      if (response.status === 200) {
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
  const minDate = dayjs('2021-01-01');
  const maxDate = dayjs('2021-11-24');
  const STADIUM_MAP: Record<string, string> = {
    'ALL': '全レース場',
    '01': '桐生',
    '02': '戸田',
    '03': '江戸川',
    '04': '平和島',
    '05': '多摩川',
    '06': '浜名湖',
    '07': '蒲郡',
    '08': '常滑',
    '09': '津',
    '10': '三国',
    '11': 'びわこ',
    '12': '住之江',
    '13': '尼崎',
    '14': '鳴門',
    '15': '丸亀',
    '16': '児島',
    '17': '宮島',
    '18': '徳山',
    '19': '下関',
    '20': '若松',
    '21': '芦屋',
    '22': '福岡',
    '23': '唐津',
    '24': '大村',
  };
  const STADIUM_OPTIONS = Object.entries(STADIUM_MAP).map(
    ([value, label]) => ({ value, label })
  );
  return (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          model_name: '',
          start_date: dayjs('2021-01-01'),
          end_date: dayjs('2021-01-28'),
          stadium: 'ALL'
        }}
      >
        <Form.Item label="モデル名" name="model_name" rules={[{ required: true, message: 'モデル名を入力してください' }]}>
          <Input placeholder="例: model_20240408" />
        </Form.Item>

        <Form.Item label="データ開始日" name="start_date" rules={[{ required: true }]}>
          <DatePicker
            format="YYYY-MM-DD"
            disabledDate={(current) =>
              current && (current.isBefore(minDate) || current.isAfter(maxDate))
            }
          />
        </Form.Item>

        <Form.Item label="データ終了日" name="end_date" rules={[{ required: true }]}>
          <DatePicker
            format="YYYY-MM-DD"
            disabledDate={(current) =>
              current && (current.isBefore(minDate) || current.isAfter(maxDate))
            }
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
    </>
  );
};

export default Training;