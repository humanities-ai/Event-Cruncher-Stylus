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

```shell
npm install three
```

```shell
npm install react-markdown
```

```shell
npm install pdf-parse
```

```shell
npm install mammoth
```

# Configuration
The app works unmodified for local development but can be deployed by setting
the variables below for the environment it runs in.

Copy `.env.example` to `.env` at the repo root to configure these for
`docker compose`:

| Variable | Used by | Default | Purpose |
| --- | --- | --- | --- |
| `REACT_APP_API_BASE_URL` | client | `http://localhost:4000` | URL the browser uses to reach the server's API. Must be reachable from the end user's browser, e.g. `https://api.ecs.example.edu`. |
| `CLIENT_ORIGIN` | server | `http://localhost:3000` | Origin(s) (comma-separated) allowed to call the server's API via CORS. Must match wherever the client above is served from. |
| `SERVER_PORT` | server | `4000` | Port the server listens on. |
| `CLIENT_PORT` | client | `3000` | Port the client dev server listens on. |

Running the client or server directly with `npm start` (outside Docker)
reads these same variables from the shell environment, or from a
`client/.env.local` / `server/server.env` file respectively.

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

OR

```shell
node server.js
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
