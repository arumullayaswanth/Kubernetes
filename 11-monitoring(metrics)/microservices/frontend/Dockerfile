FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
RUN npm install && npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
