FROM node:22
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN npm run build
RUN npx prisma generate
CMD ["node", "."]