# 🚀 NestJS + Prisma Project Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

A CLI tool to quickly scaffold a **NestJS + Prisma** project with pre-configured **Swagger, Authentication, AWS S3 integration, and Prisma setup**.

---

## 📦 NestJS Prisma Generator CLI

A CLI tool to quickly scaffold a **NestJS + Prisma** project with built-in support for:

- 🔧 Prisma ORM with migrations and seeding
- 📖 Swagger (OpenAPI) setup
- 🔑 Authentication boilerplate
- ☁️ AWS S3 integration

Compatible with **Node.js >=18** and **NestJS v10+**.

---

## 📥 Installation

### ⚡ Quick Start Guide

Once the CLI is installed, you can use the following commands:

### 1️⃣ Install CLI globally

```bash
npm install -g nestjs-prisma-cli
```


### 2️⃣ Check CLI version

```bash
nestgen -v
```
# or
```bash
nestgen --version
```


### 3️⃣ Generate a new project
```bash
nestgen
```

Step 1: ? Enter your project name: my-app
Step 2: ? Select your database: (Use arrow keys)
        MySQL
        PostgreSQL
        SQLite
        MongoDB
        CockroachDB
        SQLServer
Step 3: 🎉 Project ready! Next steps:
        cd my-app
        Check .env
        npx prisma generate
        npx prisma migrate dev --name init
        npx ts-node prisma/seed.ts
        npm run start:dev

