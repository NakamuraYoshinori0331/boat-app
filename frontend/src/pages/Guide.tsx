import React from 'react';
import { Card, Collapse, Typography, Steps, Divider, Tag } from 'antd';
import {
  LaptopOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const sectionStyle = { scrollMarginTop: 16 };

const Guide: React.FC = () => (
  <div className="page-compact">
    <Title level={3}>📖 使い方ガイド</Title>
    <Paragraph>
      このアプリは、競艇の過去データからAIを学習し、レース予測や戦略の検証（シミュレーション）ができるツールです。
      難しい設定は少なめです。下の順番で進めると迷いにくいです。
    </Paragraph>

    <Card style={{ marginBottom: 20 }}>
      <Title level={5}>はじめての方へ（おすすめの流れ）</Title>
      <Steps
        direction="vertical"
        size="small"
        current={-1}
        items={[
          { title: '① 学習', description: '過去データでAIモデルを作る' },
          { title: '② モデル確認', description: '「モデル一覧」に保存されたか確認する' },
          { title: '③ 予測', description: '今日のレースの買い目候補を見る' },
          { title: '④ シミュレーション', description: '過去期間で戦略を試す（任意）' },
        ]}
      />
    </Card>

    <Collapse
      defaultActiveKey={['training']}
      items={[
        {
          key: 'training',
          label: (
            <span id="training" style={sectionStyle}>
              <LaptopOutlined /> ① 学習（AIモデルを作る）
            </span>
          ),
          children: (
            <>
              <Paragraph>
                過去のレースデータを使って、AIに「どの艇が強いか」を覚えさせます。
                学習が終わると、あなた専用のモデルファイル（.pkl）が保存されます。
              </Paragraph>
              <Paragraph>
                <Text strong>入力の目安</Text>
              </Paragraph>
              <ul>
                <li><Text strong>モデル名</Text>：わかりやすい名前（例：桐生用モデル）。自動入力されます。</li>
                <li><Text strong>データ期間</Text>：灰色になっていない日だけ選べます。長いほど時間がかかります。</li>
                <li><Text strong>レース場</Text>：「全レース場」か、特定の場を選べます。</li>
                <li><Text strong>特徴量</Text>：最初はそのままでOKです。</li>
              </ul>
              <Paragraph type="warning">
                学習には数分かかることがあります。画面に「学習中（バックグラウンド処理）」と出ている間は、そのままお待ちください。
              </Paragraph>
              <Paragraph>
                完了後は必ず「モデル一覧」で、作ったモデルが表示されているか確認してください。
              </Paragraph>
            </>
          ),
        },
        {
          key: 'models',
          label: (
            <span id="models" style={sectionStyle}>
              <DatabaseOutlined /> モデル一覧（保存されたAIの確認）
            </span>
          ),
          children: (
            <>
              <Paragraph>
                学習で作ったAIモデルが一覧で表示されます。予測やシミュレーションでは、ここにあるモデルを選んで使います。
              </Paragraph>
              <ul>
                <li>モデルがない場合 → 先に「学習」を実行してください。</li>
                <li>「更新」ボタンで最新の一覧を再読み込みできます。</li>
                <li>不要なモデルは削除できます（元に戻せません）。</li>
              </ul>
            </>
          ),
        },
        {
          key: 'prediction',
          label: (
            <span id="prediction" style={sectionStyle}>
              <BarChartOutlined /> ② 予測（レースの買い目候補を見る）
            </span>
          ),
          children: (
            <>
              <Paragraph>
                指定したレースについて、AIが3連単の候補を表示します。開催場・日付・レース番号を選んで実行します。
              </Paragraph>
              <ul>
                <li><Text strong>モデル</Text>：学習済みのモデルを選びます。</li>
                <li><Text strong>日付・レース場・レース回</Text>：予測したいレースを指定します。</li>
                <li><Text strong>予想数</Text>：表示する候補の数（多いほど一覧が長くなります）。</li>
              </ul>
              <Paragraph>
                結果画面には「開催場・日付・レース番号」と、各艇の確率・3連単候補が表示されます。
              </Paragraph>
            </>
          ),
        },
        {
          key: 'simulation',
          label: (
            <span id="simulation" style={sectionStyle}>
              <ExperimentOutlined /> ③ シミュレーション（過去で戦略を試す）
            </span>
          ),
          children: (
            <>
              <Paragraph>
                過去の期間を指定して、「もしこのルールで買っていたらどうなったか」を試せます。
                収支・的中率・回収率が表示されます。
              </Paragraph>
              <ul>
                <li>期間はデータがある日だけ選べます。</li>
                <li>最低倍率・最低確率などで、買う条件を絞れます。</li>
                <li>処理に時間がかかる場合があります。その間は画面を閉じないでください。</li>
              </ul>
              <Tag color="blue">ヒント</Tag>
              <Text> 最初は期間を短め（例：1ヶ月）にすると結果が早く出ます。</Text>
            </>
          ),
        },
        {
          key: 'results',
          label: (
            <span id="results" style={sectionStyle}>
              <FileSearchOutlined /> 結果の見方
            </span>
          ),
          children: (
            <>
              <Paragraph><Text strong>予測結果</Text></Paragraph>
              <ul>
                <li>各艇のAI確率：1着・2着・3着になりやすさの目安</li>
                <li>3連単候補：AIが有力と判断した組み合わせ</li>
                <li>期待値：確率と倍率を掛け合わせた指標（高いほど理論上お得な買い目）</li>
              </ul>
              <Divider />
              <Paragraph><Text strong>シミュレーション結果</Text></Paragraph>
              <ul>
                <li>回収率：100%超ならプラス、未満ならマイナスの目安</li>
                <li>的中率：買い目の的中した割合</li>
              </ul>
              <Paragraph type="secondary">
                ※ 本アプリの予測・シミュレーションは参考情報です。実際の投票はご自身の判断でお願いします。
              </Paragraph>
            </>
          ),
        },
      ]}
    />
  </div>
);

export default Guide;
