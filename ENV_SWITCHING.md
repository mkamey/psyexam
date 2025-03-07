# 環境切り替え方法

このプロジェクトでは、開発環境と本番環境を簡単に切り替えることができます。

## 環境設定ファイル

以下の環境設定ファイルが用意されています：

### Remix (フロントエンド)
- `.env.development` - 開発環境用設定（192.168.10.41:8180）
- `.env.production` - 本番環境用設定（psytest.hokurikuwhisky.club）

### FastAPI (バックエンド)
- `.env.development` - 開発環境用設定
- `.env.production` - 本番環境用設定

## 環境の切り替え方法

### 1. スクリプトを実行可能にする

最初に一度だけ、スクリプトに実行権限を付与します：

```bash
bash set-executable.sh
```

### 2. 環境の切り替え

以下のコマンドで環境を切り替えることができます：

```bash
# 開発環境に切り替え
./switch-env.sh development

# 本番環境に切り替え
./switch-env.sh production
```

### 3. 変更を反映させる

環境切り替え後、変更を反映させるためにDockerコンテナを再起動します：

```bash
docker-compose down
docker-compose up -d
```

## 環境設定の詳細

### 開発環境
- ドメイン: 192.168.10.41
- ポート: 8180
- URL: http://192.168.10.41:8180

### 本番環境
- ドメイン: psytest.hokurikuwhisky.club
- URL: https://psytest.hokurikuwhisky.club

## 注意点

1. 環境を切り替えると、ユーザーセッションが無効になるため、再ログインが必要になります。
2. 本番環境では、Cloudflare Tunnelの設定が必要です。詳細は `CLOUDFLARE_TUNNEL.md` を参照してください。
3. 本番環境ではセキュリティのため、セッションクッキーが `secure` に設定されます。
