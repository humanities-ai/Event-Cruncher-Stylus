# Event Cruncher Stylus

![ECS_logo](https://github.com/user-attachments/assets/4e0680de-79f1-47b7-ad94-999a67f7d18f)

# Description
An “Event Cruncher Stylus” (ECS) for Narrative and AV-Scene Building

# Authors
- Professor Willard R Hasty, History
- Professor Mark E Law, Electrical Engineering
- Mr. Daniel Maxwell, Research Computing
- Lauren Dulick, University Research Scholar (Computer Science and Engineering)

# Necessary Installations
- git
- npm / nodejs
```shell
npm i express
```
```shell
npm i nodemon -D
```
```shell
npm install react-scripts --save
```
```shell
npm install cors
```
```shell
npm install multer --save
```
```shell
npm install react-router-dom
```
```shell
npm install three troika-three-text
```
```shell
npm install xlsx
```
```shell
npm install jszip file-saver
```

```shell
npm install multer
```

```shell
npm install i18next react-i18next i18next-http-backend
```

```shell
npm install react-select
```

```shell
npm install openai dotenv
```

```shell
npm install adm-zip
```

# How-To Run the Application
## Frontend: 'client'

To run the client (Frontend):
```shell
cd client
```
```shell
npm start
```

## Backend: 'server'

To run the server (Backend):
```shell
cd server
```
```shell
npm run dev
```

## MySQL Commands

```shell
cd C:\Program Files\MySQL\MySQL Server 9.1\bin
```

```shell
mysql -u root -p
```

```shell
SHOW DATABASES;
```

```shell
USE ecsdb;
```

```shell
SHOW TABLES;
```

```shell
DESCRIBE profiles;
```
* MySQL DB for storing profile data (firstname, lastname, email, username, password)

```shell
SELECT * FROM profiles;
```

```shell
DESCRIBE avdata;
```
* MySQL DB for storing AV-Scene data

```shell
DESCRIBE criteria;
```
* MySQL DB for storing criteria instructions specific to a certain face

```shell
EXIT;
```

# ECS Levels
## Binary Level
<img width="895" alt="image" src="https://github.com/user-attachments/assets/42c3d9d7-851b-4d96-85d6-65752061046c">

## Tetrahedral Level
<img width="960" alt="image" src="https://github.com/user-attachments/assets/29440b3f-470e-4939-b7b2-09e8b402d594">

## Cubic Level
<img width="956" alt="image" src="https://github.com/user-attachments/assets/606f731f-f8a3-4941-977d-41dfb90b82c1">

## Octahedral UI-Level
<img width="954" alt="image" src="https://github.com/user-attachments/assets/0f87244a-459e-402b-96bc-83f2470d4058">
