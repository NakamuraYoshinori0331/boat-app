// src/pages/ModelManager.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, Input, Modal, message, Space } from 'antd';
import axios from 'axios';

const ModelManager: React.FC = () => {
  const [models, setModels] = useState([]);
  const [renamingModel, setRenamingModel] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    const res = await axios.get('http://localhost:8000/models');
    setModels(res.data);
  };

  const handleDelete = async (name: string) => {
    await axios.delete(`http://localhost:8000/models/${name}`);
    message.success('削除しました');
    fetchModels();
  };

  const handleRename = async () => {
    if (!renamingModel || !newName) return;
    await axios.put(`http://localhost:8000/models/${renamingModel}`, { new_name: newName });
    message.success('リネームしました');
    setRenamingModel(null);
    setNewName('');
    fetchModels();
  };

  const handleDownload = (name: string) => {
    window.open(`http://localhost:8000/models/${name}/download`, '_blank');
  };

  const columns = [
    { title: 'モデル名', dataIndex: 'name' },
    { title: 'サイズ', dataIndex: 'size' },
    { title: '更新日時', dataIndex: 'modified' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button onClick={() => {
            setRenamingModel(record.name);
            setNewName(record.name.replace('.pkl', ''));
          }}>名前変更</Button>

          <Popconfirm
            title="本当に削除しますか？"
            onConfirm={() => handleDelete(record.name)}
          >
            <Button danger>削除</Button>
          </Popconfirm>

          <Button onClick={() => handleDownload(record.name)}>ダウンロード</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table rowKey="name" dataSource={models} columns={columns} />

      <Modal
        title="モデル名の変更"
        open={!!renamingModel}
        onCancel={() => setRenamingModel(null)}
        onOk={handleRename}
      >
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
      </Modal>
    </>
  );
};

export default ModelManager;