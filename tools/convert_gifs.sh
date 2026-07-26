#!/bin/bash
# tools/convert_gifs.sh - 原始 GIF 批量压缩进分包（动作库扩大时复用）
# 用法：bash tools/convert_gifs.sh
# 依赖：gifsicle（brew install gifsicle）
# 说明：32 色 + O3 优化对解剖插画类 GIF 体积压缩约 45%，画质无明显损失；
#       若动作增多导致分包超 2MB，应迁移云存储（修改 services/exercise.js 的 gifUrl 即可）。
set -e
SRC="$(cd "$(dirname "$0")" && pwd)/gifs"
DST="$(cd "$(dirname "$0")/.." && pwd)/miniprogram/packageDetail/assets/gifs"
mkdir -p "$DST"
for f in "$SRC"/*.gif; do
  gifsicle -O3 --colors 32 "$f" -o "$DST/$(basename "$f")"
done
echo "compressed: $(ls "$DST" | wc -l) files, $(du -sh "$DST" | cut -f1)"
