FROM node:16-alpine

RUN mkdir /app && chown node:node /app
COPY --chown=node:node  . /app
WORKDIR /app

USER node
RUN yarn install

ARG PORT
EXPOSE $PORT
ENV PORT=$PORT

CMD [ "sh", "-c", "yarn start" ]
