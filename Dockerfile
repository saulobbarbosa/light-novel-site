# Use uma imagem base oficial do Node.js. A versão "alpine" é leve e já é multi-arquitetura.
FROM node:18-alpine

# Defina o diretório de trabalho dentro do container
WORKDIR /app

# Copie os arquivos de definição de pacotes
COPY package.json ./
COPY package-lock.json ./

# Instale apenas as dependências de produção.
# O npm detectará a arquitetura do build (amd64 ou arm64) e instalará os pacotes corretos.
RUN npm install --production

# Copie o resto dos arquivos da sua aplicação
COPY . .

# Crie o diretório de uploads dentro da pasta public
RUN mkdir -p /app/public/uploads

# Exponha a porta da aplicação
EXPOSE 7080

# Defina o comando para iniciar a aplicação
CMD [ "node", "backend/server.js" ]