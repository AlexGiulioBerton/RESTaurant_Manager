FROM node:19-buster-slim
LABEL maintainer="Alex Giulio Berton"

EXPOSE 8080

WORKDIR /app
COPY . /app
RUN npm install
RUN npm run compile

# CMD node server

