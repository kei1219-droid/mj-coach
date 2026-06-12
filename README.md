# 🀄 打牌AIコーチ

mjモバイルのリプレイURLを貼り付けるだけで打牌をAI解析するWebアプリです。

## デプロイ手順

### 1. GitHubにリポジトリを作成
1. https://github.com にログイン
2. 右上「+」→「New repository」
3. Repository name: `mj-coach`
4. 「Create repository」をクリック

### 2. ファイルをアップロード
1. 作成したリポジトリページで「uploading an existing file」をクリック
2. 以下のファイル構成でアップロード：
   ```
   mj-coach/
   ├── api/
   │   └── analyze.js
   ├── index.html
   ├── package.json
   └── vercel.json
   ```
3. 「Commit changes」をクリック

### 3. Vercelにデプロイ
1. https://vercel.com にGitHubアカウントでログイン
2. 「Add New Project」→ `mj-coach` リポジトリを選択
3. 「Environment Variables」に以下を追加：
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-xxxxx`（Anthropicで取得したAPIキー）
4. 「Deploy」をクリック
5. デプロイ完了後、発行されたURL（例: `https://mj-coach-xxx.vercel.app`）をスマホでブックマーク

### 4. APIキーの取得
1. https://console.anthropic.com にアクセス
2. サインアップ（Googleアカウント可）
3. 「API Keys」→「Create Key」
4. 表示された `sk-ant-...` をコピー

## 使い方
1. mjモバイルのリプレイ画面を開く
2. 画面下部の「リプレイURL」をコピー
3. このアプリにURLを貼り付け
4. 解析したい局を選んで「解析」ボタンをタップ

## 注意事項
- セガのリプレイサーバーへのアクセスが制限されている場合、URLパラメータのみで推定解析を行います
- Anthropic APIの利用料金が発生します（目安: 1解析あたり約0.5〜1円）
