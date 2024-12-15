FROM node:22
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN npx prisma generate
RUN npm run build
CMD ["node", "."]
