FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production PORT=8787 TRUST_PROXY=1
EXPOSE 8787
CMD ["npm", "start"]
