import React, { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, Input, Modal, message, Space, Empty } from 'antd';
import type { TableProps } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageIntro from '../components/PageIntro';

interface ModelRow {
  name: string;
  size: string;
  modified: string;
}

const ModelManager: React.FC = () => {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [renamingModel, setRenamingModel] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await api.get('/models');
      setModels(res.data);
      setSelected([]);
    } catch {
      message.error('モデルの取得に失敗しました');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleDelete = async (name: string) => {
    await api.delete(`/models/${encodeURIComponent(name)}`);
    message.success('削除しました');
    fetchModels();
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const res = await api.post('/models/bulk-delete', { names: selected });
      message.success(res.data.message);
      fetchModels();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || '一括削除に失敗しました');
    }
    setLoading(false);
  };

  const handleRename = async () => {
    if (!renamingModel || !newName) return;
    await api.put(`/models/${encodeURIComponent(renamingModel)}`, { new_name: newName });
    message.success('名前を変更しました');
    setRenamingModel(null);
    setNewName('');
    fetchModels();
  };

  const handleDownload = async (name: string) => {
    const res = await api.get(`/models/${encodeURIComponent(name)}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const rowSelection: TableProps<ModelRow>['rowSelection'] = {
    selectedRowKeys: selected,
    onChange: (keys) => setSelected(keys as string[]),
  };

  const columns = [
    { title: 'モデル名', dataIndex: 'name' },
    { title: 'サイズ', dataIndex: 'size', width: 90 },
    { title: '更新日時', dataIndex: 'modified' },
    {
      title: '操作',
      width: 120,
      render: (_: unknown, record: ModelRow) => (
        <Space direction="vertical" size={4}>
          <Button size="small" block onClick={() => {
            setRenamingModel(record.name);
            setNewName(record.name.replace('.pkl', ''));
          }}>名前変更</Button>
          <Popconfirm title="削除しますか？" onConfirm={() => handleDelete(record.name)}>
            <Button size="small" danger block>削除</Button>
          </Popconfirm>
          <Button size="small" block onClick={() => handleDownload(record.name)}>ダウンロード</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-compact">
      <PageIntro
        title="モデル一覧"
        description="学習で作ったAIモデルがここに表示されます。予測・シミュレーションで使うモデルを確認できます。"
        steps={[
          '学習完了後、この画面でモデルが表示されているか確認する',
          '表示されない場合は「一覧を更新」を押す',
          'まだない場合は「学習」から作り直す',
        ]}
        guideAnchor="models"
      />

      <Space wrap style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchModels} loading={loading} size="small">
          一覧を更新
        </Button>
        <Popconfirm
          title={`選択した${selected.length}件を削除しますか？`}
          disabled={selected.length === 0}
          onConfirm={handleBulkDelete}
        >
          <Button danger disabled={selected.length === 0} loading={loading} size="small">
            選択を削除
          </Button>
        </Popconfirm>
      </Space>

      {models.length === 0 && !loading ? (
        <Empty description="まだモデルがありません">
          <Link to="/training">
            <Button type="primary">学習ページへ</Button>
          </Link>
        </Empty>
      ) : (
        <Table
          rowKey="name"
          dataSource={models}
          columns={columns}
          rowSelection={rowSelection}
          loading={loading}
          size="small"
          scroll={{ x: 360 }}
          pagination={{ pageSize: 10, size: 'small' }}
        />
      )}

      <Modal
        title="モデル名の変更"
        open={!!renamingModel}
        onCancel={() => setRenamingModel(null)}
        onOk={handleRename}
      >
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新しいモデル名" />
      </Modal>
    </div>
  );
};

export default ModelManager;
