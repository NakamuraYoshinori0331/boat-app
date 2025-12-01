import React, { useState, useEffect } from 'react';
import { Form, Select, InputNumber, Button, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

const Prediction = () => {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const places = [
    ['01', '桐生'], ['02', '戸田'], ['03', '江戸川'], ['04', '平和島'], ['05', '多摩川'], ['06', '浜名湖'],
    ['07', '蒲郡'], ['08', '常滑'], ['09', '津'], ['10', '三国'], ['11', '琵琶湖'], ['12', '住之江'],
    ['13', '尼崎'], ['14', '鳴門'], ['15', '丸亀'], ['16', '児島'], ['17', '宮島'], ['18', '徳山'],
    ['19', '下関'], ['20', '若松'], ['21', '芦屋'], ['22', '福岡'], ['23', '唐津'], ['24', '大村'],
  ];

  const fetchModels = async () => {
    try {
      const res = await axios.get('http://localhost:8000/models');
      setModels(res.data);
    } catch (e) {
      message.error("モデルの取得に失敗しました");
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    const payload = {
      model: values.model,
      date: values.date.format('YYYYMMDD'),
      place_id: values.place,
      race_no: String(values.race),
      top_n: String(values.top_n)
    };

    try {
      const res = await axios.post('http://localhost:8000/predict', payload);
      console.log(res.data["predictions"])
      if (res.data["predictions"].length == 0){
        throw new Error("結果がありません。");
      }
      // 結果をlocalStorageに保存
      localStorage.setItem("predictions", JSON.stringify(res.data));
      
      // 結果表示ページに遷移
      navigate("/results");
      message.success('予測が完了しました');
    } catch (e) {
      console.error(e);
      message.error('予測に失敗しました');
    }

    setLoading(false);
  };

  return (
    <Form layout="vertical" onFinish={onFinish}>
      <Form.Item label="モデル" name="model" rules={[{ required: true }]}>
        <Select placeholder="モデルを選択">
          {models.map((m) => (
            <Option key={m.name} value={m.name}>
              {m.name}（{m.size}, {m.modified}）
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label="日付" name="date" rules={[{ required: true }]} initialValue={dayjs()}>
        <DatePicker />
      </Form.Item>
      <Form.Item label="レース場" name="place" rules={[{ required: true }]}>
        <Select placeholder="レース場を選択">
          {places.map(([id, name]) => (
            <Option key={id} value={id}>{id}：{name}</Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label="レース回" name="race" initialValue={1} rules={[{ required: true }]}>
        <InputNumber min={1} max={12} defaultValue={1}/>
      </Form.Item>
      <Form.Item label="予想数" name="top_n" initialValue={10} rules={[{ required: true }]}>
        <InputNumber min={1} max={120} defaultValue={10}/>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>予測する</Button>
      </Form.Item>
    </Form>
  );
};

export default Prediction;