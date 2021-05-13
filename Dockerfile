FROM nervos/godwoken-prebuilds:v0.2.0-rc2

WORKDIR "/godwoken-web3"

RUN apt-get update \
 && apt-get dist-upgrade -y \
 && apt-get install jq -y \
 && apt-get clean \
 && echo "Finished installing dependencies"

COPY package*.json ./
COPY packages/godwoken/package*.json ./packages/godwoken/
COPY packages/api-server/package*.json ./packages/api-server/
RUN yarn install

COPY --chown=node . ./
EXPOSE 8024

USER node
CMD ["node", "version"]
