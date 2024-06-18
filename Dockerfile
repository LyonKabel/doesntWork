FROM node:18

RUN npm install -g @jworkman-fs/wdv-cli
RUN npm install @jworkman-fs/asl

CMD ["wdv-cli"]
