import React, { JSX } from "react";
import { Button, Layout, Menu } from "antd";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  LaptopOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  DatabaseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import Training from "./pages/Training";
import Prediction from "./pages/Prediction";
import Simulation from "./pages/Simulation";
import Results from "./pages/predictionResults";
import SimulationResults from "./pages/SimulationResults";
import ModelManager from "./pages/ModelManager";

// 認証ページ
import Login from "./auth/Login";
import Register from "./auth/Register";
import ResetPassword from "./auth/ResetPassword";
// import ChangePassword from "./pages/ChangePassword";
import ConfirmSignup from "./auth/ConfirmSignup";

const { Header, Content, Footer, Sider } = Layout;

// 🔐 ログインしているか確認
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("accessToken");
  return token ? children : <Navigate to="/login" replace />;
};

const menuItems = [
  { key: "training", icon: <LaptopOutlined />, label: "学習", path: "/training" },
  { key: "prediction", icon: <BarChartOutlined />, label: "予測", path: "/prediction" },
  { key: "simulation", icon: <ExperimentOutlined />, label: "シミュレーション", path: "/simulation" },
  { key: "results", icon: <FileSearchOutlined />, label: "予測結果", path: "/results" },
  { key: "simulation_results", icon: <FileSearchOutlined />, label: "シミュレーション結果", path: "/simulation_results" },
  { key: "models", icon: <DatabaseOutlined />, label: "モデル管理", path: "/models" },
  { key: "logout", icon: <DatabaseOutlined />, label: "ログアウト", path: "/logout" },
];

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ color: "white", fontSize: "1.5rem" }}>🚤 競艇3連単 予測ツール</Header>
      <Layout>
        {(localStorage.getItem("accessToken") && localStorage.getItem("user_email"))
          ? 
            <Sider 
              collapsible
              collapsed={collapsed}
              trigger={null}
              style={{ minHeight: "100vh" }}
              width={215} 
              className="site-layout-background"
            >
              {/* トグルボタン */}
              <div style={{ padding: 8, textAlign: "right", backgroundColor: "white" }}>
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                />
              </div>
              <Menu
                mode="inline"
                defaultSelectedKeys={['training']}
                style={{ height: '100%', borderRight: 0 }}
            
                onClick={(e) => {
                  if (e.key === "logout") {
                    localStorage.clear();
            
                    navigate("/login");
                    return;
                  }
            
                  const selected = menuItems.find((item) => item.key === e.key);
                  if (selected) navigate(selected.path);
                }}
            
                items={menuItems}
              />
            </Sider>
          :
            null
        }
        <Layout style={{ padding: "24px" }}>
          <Content>
            <Routes>
              <Route
                path="/training"
                element={
                  <ProtectedRoute>
                    <Training />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/prediction"
                element={
                  <ProtectedRoute>
                    <Prediction />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/simulation"
                element={
                  <ProtectedRoute>
                    <Simulation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/results"
                element={
                  <ProtectedRoute>
                    <Results />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/simulation_results"
                element={
                  <ProtectedRoute>
                    <SimulationResults />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/models"
                element={
                  <ProtectedRoute>
                    <ModelManager />
                  </ProtectedRoute>
                }
              />

              {/* 🔐 認証関連 */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset" element={<ResetPassword />} />
              <Route path="/confirm" element={<ConfirmSignup />} />

              {/* どこにもマッチしない場合はログインへ */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Content>

          <Footer style={{ textAlign: "center" }}>
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
