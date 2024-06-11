FROM node:lts

RUN adduser --disabled-password --gecos "" appuser
RUN mkdir /app && chown -R appuser /app
WORKDIR /app
USER appuser

COPY --chown=appuser . .
RUN yarn install --production --frozen-lockfile

CMD ["yarn", "start"]