import React, { JSX, useState } from "react";
import { Button, Layout, Menu, Drawer, Grid } from "antd";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import {
  LaptopOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  DatabaseOutlined,
  MenuOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import Training from "./pages/Training";
import Prediction from "./pages/Prediction";
import Simulation from "./pages/Simulation";
import Results from "./pages/predictionResults";
import SimulationResults from "./pages/SimulationResults";
import ModelManager from "./pages/ModelManager";
import Guide from "./pages/Guide";
import Login from "./auth/Login";
import Register from "./auth/Register";
import ResetPassword from "./auth/ResetPassword";
import ConfirmSignup from "./auth/ConfirmSignup";

const { Header, Content, Footer, Sider } = Layout;
const { useBreakpoint } = Grid;

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("accessToken");
  return token ? children : <Navigate to="/login" replace />;
};

const navItems = [
  { key: "guide", icon: <QuestionCircleOutlined />, label: "使い方", path: "/guide" },
  { key: "training", icon: <LaptopOutlined />, label: "学習", path: "/training" },
  { key: "models", icon: <DatabaseOutlined />, label: "モデル", path: "/models" },
  { key: "prediction", icon: <BarChartOutlined />, label: "予測", path: "/prediction" },
  { key: "simulation", icon: <ExperimentOutlined />, label: "シミュ", path: "/simulation" },
  { key: "results", icon: <FileSearchOutlined />, label: "予測結果", path: "/results" },
  { key: "simulation_results", icon: <FileSearchOutlined />, label: "Sim結果", path: "/simulation_results" },
];

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isLoggedIn = !!localStorage.getItem("accessToken");

  const selectedKey = navItems.find((item) => location.pathname === item.path)?.key || "guide";

  const handleNav = (key: string) => {
    if (key === "logout") {
      localStorage.clear();
      navigate("/login");
      return;
    }
    const item = navItems.find((i) => i.key === key);
    if (item) {
      navigate(item.path);
      setDrawerOpen(false);
    }
  };

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      style={{ height: "100%", borderRight: 0, fontSize: isMobile ? 13 : 14 }}
      onClick={(e) => handleNav(e.key)}
      items={[
        ...navItems,
        { key: "logout", icon: <LogoutOutlined />, label: "ログアウト" },
      ]}
    />
  );

  const bottomNav = (
    <div className="mobile-bottom-nav">
      {navItems.slice(0, 5).map((item) => (
        <button
          key={item.key}
          type="button"
          className={`nav-item${selectedKey === item.key ? " active" : ""}`}
          onClick={() => handleNav(item.key)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          color: "white",
          fontSize: "clamp(0.85rem, 3.5vw, 1.25rem)",
          padding: "0 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {isLoggedIn && isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined style={{ color: "white", fontSize: 18 }} />}
            onClick={() => setDrawerOpen(true)}
          />
        )}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          🚤 競艇3連単 予測
        </span>
      </Header>

      <Layout>
        {isLoggedIn && !isMobile && (
          <Sider
            collapsible
            collapsed={collapsed}
            trigger={null}
            width={200}
            collapsedWidth={56}
            className="site-layout-background"
          >
            <div style={{ padding: 8, textAlign: "right", backgroundColor: "white" }}>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
            </div>
            {menu}
          </Sider>
        )}

        {isLoggedIn && isMobile && (
          <Drawer
            title="メニュー"
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            bodyStyle={{ padding: 0 }}
            width={220}
          >
            {menu}
          </Drawer>
        )}

        <Layout
          style={{ padding: isMobile ? 8 : 12 }}
          className={isLoggedIn && isMobile ? "layout-with-bottom-nav" : ""}
        >
          <Content className="page-compact">
            <Routes>
              <Route path="/" element={<Navigate to="/guide" replace />} />
              <Route path="/guide" element={<ProtectedRoute><Guide /></ProtectedRoute>} />
              <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
              <Route path="/prediction" element={<ProtectedRoute><Prediction /></ProtectedRoute>} />
              <Route path="/simulation" element={<ProtectedRoute><Simulation /></ProtectedRoute>} />
              <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
              <Route path="/simulation_results" element={<ProtectedRoute><SimulationResults /></ProtectedRoute>} />
              <Route path="/models" element={<ProtectedRoute><ModelManager /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset" element={<ResetPassword />} />
              <Route path="/confirm" element={<ConfirmSignup />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Content>

          <Footer style={{ textAlign: "center", fontSize: isMobile ? 11 : 14 }}>
            © {new Date().getFullYear()} BOAT RACE PREDICTOR
          </Footer>
        </Layout>
      </Layout>

      {isLoggedIn && isMobile && bottomNav}
    </Layout>
  );
};

const App: React.FC = () => (
  <Router>
    <AppLayout />
  </Router>
);

export default App;
