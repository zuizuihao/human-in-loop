#!/usr/bin/env bash
set -euo pipefail

# 构建 Hugo 站点并增量同步到阿里云 OSS
# 依赖：hugo (extended)、ossutil
# 环境变量：OSS_BUCKET（必填）、SITE_HOST、OSS_ENDPOINT、OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET

cd "$(dirname "$0")/.."

OSS_BUCKET="${OSS_BUCKET:?请设置 OSS_BUCKET，例如 aitip-tech}"
SITE_HOST="${SITE_HOST:-aitip.tech}"
HUGO_BIN="${HUGO_BIN:-hugo}"
OSSUTIL_BIN="${OSSUTIL_BIN:-ossutil}"

AUTH=()
if [[ -n "${OSS_ACCESS_KEY_ID:-}" && -n "${OSS_ACCESS_KEY_SECRET:-}" ]]; then
  AUTH=(-i "$OSS_ACCESS_KEY_ID" -k "$OSS_ACCESS_KEY_SECRET" -e "${OSS_ENDPOINT:?请设置 OSS_ENDPOINT}")
fi

ossutil() {
  if [[ ${#AUTH[@]} -gt 0 ]]; then
    "$OSSUTIL_BIN" "$@" "${AUTH[@]}"
  else
    "$OSSUTIL_BIN" "$@"
  fi
}

echo "==> 构建 https://${SITE_HOST}/"
"$HUGO_BIN" --gc --minify --baseURL "https://${SITE_HOST}/"

echo "==> 上传非 HTML 资源（缓存 1 天）"
ossutil cp -r public/ "oss://${OSS_BUCKET}/" -u -f -j 10 \
  --exclude "*.html" \
  --meta "Cache-Control:public,max-age=86400"

echo "==> 上传 HTML（缓存 5 分钟）"
ossutil cp -r public/ "oss://${OSS_BUCKET}/" -u -f -j 10 \
  --include "*.html" \
  --meta "Cache-Control:public,max-age=300"

echo "==> 完成：https://${SITE_HOST}/"
