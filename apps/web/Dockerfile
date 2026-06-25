FROM node:20-alpine AS build
WORKDIR /app


ARG VITE_API_BASE_URL=http://10.0.2.20:3000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


#port 80
#running commands on docker
#docker build -t stock-taking-web:1.0.0 .
# docker tag stock-taking-web:1.0.0 stock-taking-web:latest

# docker run -d --name sts-web-test -p 80:80 `                                     
# >>   -e VITE_API_BASE_URL=http://localhost:3000/api `                                                          
# >>   stock-taking-web:latest             
