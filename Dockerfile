FROM node:10.16-alpine
WORKDIR /opt/mre

RUN ["apk", "update"]
RUN ["apk", "add", "imagemagick", "graphicsmagick", "poppler-utils", "python2", "build-base"]

COPY package*.json ./
RUN ["npm", "install", "--unsafe-perm"]

COPY tsconfig.json ./
COPY src ./src/
RUN ["npm", "run", "build-only"]

COPY public ./public/

ENV BASE_URL "https://knowit-slides-mre.herokuapp.com"

EXPOSE 3901/tcp
CMD ["npm", "start"]