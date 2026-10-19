#!/usr/bin/env bash
# 커밋·PR 전에 실행하는 검증 스크립트: 서식 검사 → 린트 → 테스트 → 빌드
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> 서식 검사"
npm run format:check

echo "==> 린트"
npm run lint

echo "==> 테스트"
npm test

echo "==> 빌드"
npm run build

echo "검증 통과"
