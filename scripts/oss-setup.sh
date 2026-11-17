#!/usr/bin/env bash
set -euo pipefail

# 一次性初始化 OSS Bucket：创建、公共读、静态网站托管、防盗链
# 依赖：ossutil
# 环境变量：OSS_BUCKET、OSS_ENDPOINT（必填），SITE_HOST，OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET

cd "$(dirname "$0")/.."

OSS_BUCKET="${OSS_BUCKET:?请设置 OSS_BUCKET，例如 aitip-tech}"
OSS_ENDPOINT="${OSS_ENDPOINT:?请设置 OSS_ENDPOINT，例如 oss-cn-shenzhen.aliyuncs.com}"
SITE_HOST="${SITE_HOST:-aitip.tech}"
OSSUTIL_BIN="${OSSUTIL_BIN:-ossutil}"

AUTH=()
if [[ -n "${OSS_ACCESS_KEY_ID:-}" && -n "${OSS_ACCESS_KEY_SECRET:-}" ]]; then
  AUTH=(-i "$OSS_ACCESS_KEY_ID" -k "$OSS_ACCESS_KEY_SECRET" -e "$OSS_ENDPOINT")
fi

ossutil() {
  if [[ ${#AUTH[@]} -gt 0 ]]; then
    "$OSSUTIL_BIN" "$@" "${AUTH[@]}"
  else
    "$OSSUTIL_BIN" "$@"
  fi
}

if ossutil stat "oss://${OSS_BUCKET}" >/dev/null 2>&1; then
  echo "==> Bucket ${OSS_BUCKET} 已存在，跳过创建"
else
  echo "==> 创建 Bucket ${OSS_BUCKET} (${OSS_ENDPOINT})"
  ossutil mb "oss://${OSS_BUCKET}" --storage-class Standard
fi

echo "==> 设置 Bucket 为公共读（写入仍需 AccessKey）"
ossutil set-acl "oss://${OSS_BUCKET}" public-read

echo "==> 配置静态网站托管：index.html / 404.html"
WEBSITE_XML="$(mktemp -t oss-website)"
cat > "$WEBSITE_XML" <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<WebsiteConfiguration>
  <IndexDocument>
    <Suffix>index.html</Suffix>
  </IndexDocument>
  <ErrorDocument>
    <Key>404.html</Key>
  </ErrorDocument>
</WebsiteConfiguration>
XML
ossutil website --method put "oss://${OSS_BUCKET}" "$WEBSITE_XML"
rm -f "$WEBSITE_XML"

echo "==> 配置防盗链白名单（保留空 Referer，避免直接访问被拦）"
ossutil referer --method put "oss://${OSS_BUCKET}" "https://${SITE_HOST}/*,https://*.${SITE_HOST}/*"

echo "==> 完成。接下来：域名 CNAME 到 CDN 加速域名 / OSS 自定义域名，并绑定证书"
