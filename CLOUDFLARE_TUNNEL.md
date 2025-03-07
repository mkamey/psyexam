# Cloudflare Tunnel 設定ガイド

このガイドでは、`psytest.hokurikuwhisky.club` ドメインをCloudflare Tunnelを使って公開する方法を説明します。

## 前提条件

- Cloudflareアカウント
- `hokurikuwhisky.club` ドメインがCloudflareに登録済み
- サーバー（VPS、クラウドインスタンス、ラズパイなど）

## 手順

### 1. 環境を本番設定に切り替える

```bash
./switch-env.sh production
docker-compose down
docker-compose up -d
```

### 2. Cloudflared のインストール

サーバーにSSHで接続し、Cloudflaredをインストールします。

**Debian/Ubuntu:**
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

**CentOS/RHEL:**
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
sudo rpm -ivh cloudflared-linux-x86_64.rpm
```

### 3. Cloudflare アカウントへのログイン

```bash
cloudflared tunnel login
```

ブラウザが開き、Cloudflareへのログインを求められます。ログインすると認証証明書がダウンロードされます。

### 4. トンネルの作成

```bash
cloudflared tunnel create psytest
```

これにより、トンネルが作成され、トンネルのIDが表示されます。

### 5. トンネル設定ファイルの作成

`~/.cloudflared/config.yml` ファイルを作成し、以下の内容を追加します：

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /root/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: psytest.hokurikuwhisky.club
    service: http://localhost:8180
  - service: http_status:404
```

`<YOUR_TUNNEL_ID>` は前のステップで表示されたトンネルIDに置き換えてください。

### 6. DNSレコードの作成

```bash
cloudflared tunnel route dns <YOUR_TUNNEL_ID> psytest.hokurikuwhisky.club
```

### 7. トンネルの実行

テスト実行:
```bash
cloudflared tunnel run psytest
```

バックグラウンドでサービスとして実行:
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### 8. 動作確認

ブラウザで `https://psytest.hokurikuwhisky.club` にアクセスし、アプリケーションが正常に表示されることを確認します。

## トラブルシューティング

### トンネル接続の確認
```bash
cloudflared tunnel info psytest
```

### ログの確認
```bash
sudo journalctl -u cloudflared
```

### 設定の再適用
問題が発生した場合、トンネル設定を再適用します：
```bash
sudo systemctl restart cloudflared
```

## セキュリティのヒント

1. Cloudflare Access を使用して、認証を追加することができます。
2. Cloudflare WAF を設定して、悪意のあるトラフィックをブロックすることができます。
3. サーバーのファイアウォールでは、Cloudflaredからの接続のみを許可するよう設定します。
