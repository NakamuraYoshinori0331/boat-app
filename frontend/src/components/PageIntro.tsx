import React from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

interface PageIntroProps {
  title: string;
  description: string;
  steps?: string[];
  guideAnchor?: string;
}

const PageIntro: React.FC<PageIntroProps> = ({
  title,
  description,
  steps,
  guideAnchor,
}) => {
  const guidePath = guideAnchor ? `/guide#${guideAnchor}` : '/guide';

  return (
    <div style={{ marginBottom: 20 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <Title level={4} style={{ margin: 0 }}>{title}</Title>
          <Link to={guidePath}>
            <Button type="link" icon={<QuestionCircleOutlined />} size="small" style={{ padding: 0 }}>
              使い方を見る
            </Button>
          </Link>
        </div>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {description}
        </Paragraph>
        {steps && steps.length > 0 && (
          <Alert
            type="info"
            showIcon
            message="かんたん手順"
            description={(
              <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                {steps.map((step) => (
                  <li key={step} style={{ marginBottom: 4 }}>
                    <Text>{step}</Text>
                  </li>
                ))}
              </ol>
            )}
          />
        )}
      </Space>
    </div>
  );
};

export default PageIntro;
