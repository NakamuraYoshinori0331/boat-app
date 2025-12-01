import React from 'react';
import { Layout, Menu } from 'antd';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import {
  LaptopOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';

import Training from './pages/Training';
import Prediction from './pages/Prediction';
import Simulation from './pages/Simulation';
import Results from './pages/predictionResults';
import SimulationResults from './pages/SimulationResults';
import ModelManager from './pages/ModelManager';

const { Header, Content, Footer, Sider } = Layout;

const menuItems = [
  { key: 'training', icon: <LaptopOutlined />, label: '学習', path: '/' },
  { key: 'prediction', icon: <BarChartOutlined />, label: '予測', path: '/prediction' },
  { key: 'simulation', icon: <ExperimentOutlined />, label: 'シミュレーション', path: '/simulation' },
  { key: 'results', icon: <FileSearchOutlined />, label: '予測結果', path: '/results' },
  { key: 'simulation_results', icon: <FileSearchOutlined />, label: 'シミュレーション結果', path: '/simulation_results' },
  { key: 'models', icon: <DatabaseOutlined />, label: 'モデル管理', path: '/models' },
];

const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ color: 'white', fontSize: '1.5rem' }}>🚤 競艇3連単 予測ツール</Header>
      <Layout>
        <Sider width={215} className="site-layout-background">
          <Menu
            mode="inline"
            defaultSelectedKeys={['training']}
            style={{ height: '100%', borderRight: 0 }}
            onClick={(e) => {
              const selected = menuItems.find((item) => item.key === e.key);
              if (selected) navigate(selected.path);
            }}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content>
            <Routes>
              <Route path="/" element={<Training />} />
              <Route path="/prediction" element={<Prediction />} />
              <Route path="/simulation" element={<Simulation />} />
              <Route path="/results" element={<Results />} />
              <Route path="/simulation_results" element={<SimulationResults />} />
              <Route path="/models" element={<ModelManager />} />
            </Routes>
          </Content>
          <Footer style={{ textAlign: 'center' }}>
            © {new Date().getFullYear()} BOAT RACE PREDICTOR
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
};

export default App;