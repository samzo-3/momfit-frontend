
# ==========================================
# Stage 1: React + Vite 빌드
# ==========================================
FROM node:24-alpine AS build

WORKDIR /app

# 의존성 먼저 설치 (Docker 캐시 활용)
COPY package.json package-lock.json ./
RUN npm ci

# 소스코드 복사 및 빌드
COPY . .

# Vite 환경변수는 빌드 시점에 코드에 박힌다. 런타임 환경변수로는 바꿀 수 없다.
# Side Kick 자세 배우기 실행 모드 (frontend_only: API·DB 없이 JSON Runtime만 실행)
ARG VITE_SIDEKICK_STUDY_MODE
ENV VITE_SIDEKICK_STUDY_MODE=$VITE_SIDEKICK_STUDY_MODE
RUN npm run build


# ==========================================
# Stage 2: Nginx 실행 환경
# ==========================================
FROM nginx:stable-alpine

# Nginx 설정 적용
COPY nginx.conf /etc/nginx/conf.d/default.conf

# React 빌드 결과 복사
COPY --from=build /app/dist /usr/share/nginx/html

# HTTP 포트
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]
