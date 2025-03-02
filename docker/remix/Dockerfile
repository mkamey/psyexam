FROM node:current-slim
WORKDIR /usr/server
RUN apt-get update -y && apt-get install -y openssl netcat-traditional
COPY ./package.json ./
RUN npm install
COPY . .

COPY ./docker-entrypoint.sh /usr/server/docker-entrypoint.sh
RUN chmod +x /usr/server/docker-entrypoint.sh
ENTRYPOINT ["/usr/server/docker-entrypoint.sh"]
