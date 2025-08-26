#!/usr/bin/env node
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { execa } from "execa";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, "../package.json"), "utf-8")
);

if (process.argv.includes("-v") || process.argv.includes("--version")) {
  console.log(`nestgen ${packageJson.version}`);
  process.exit(0);
}

if (process.argv.includes("-h") || process.argv.includes("--help")) {
  console.log(`
Usage: nestgen [options]

Options:
  -v, --version      Show version
  -h, --help         Show help
`);
  process.exit(0);
}

const detectPackageManager = () => {
  try {
    fs.accessSync(path.join(process.cwd(), "yarn.lock"));
    return "yarn";
  } catch {
    return "npm";
  }
};

export async function generatePrismaSchema(selectedProvider, templatePrismaPath) {
  if (selectedProvider === "mongodb") {
    return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @unique
  name      String?
  email     String
  password  String
  profileUrl String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("tbl_user")
}

model Log {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  method      String
  path        String
  statusCode  Int
  messageCode String?
  message     String?
  headers     Json
  body        Json?
  query       Json?
  duration    Int
  createdAt   DateTime @default(now())

  @@map("tbl_log")
}
`;
  }

  try {
    let prismaContent = await fs.readFile(templatePrismaPath, "utf-8");

    prismaContent = prismaContent.replace(
      /(datasource\s+db\s*{[^}]*provider\s*=\s*")\w+(")/,
      `$1${selectedProvider}$2`
    );

    return prismaContent;
  } catch (err) {
    throw new Error(`Failed to read Prisma template: ${err.message}`);
  }
}

async function main() {
  console.log(chalk.blue("🚀 Welcome to NestJS + Prisma Project Generator!"));

  const { projectName } = await inquirer.prompt([
    { type: "input", name: "projectName", message: "Enter your project name:" },
  ]);

  const dbSafeName = projectName.replace(/-/g, "_") + "_db";
  const projectPath = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectPath)) {
    console.log(chalk.red(`Folder "${projectName}" already exists!`));
    process.exit(1);
  }

  const { database } = await inquirer.prompt([
    {
      type: "list",
      name: "database",
      message: "Select your database:",
      choices: ["PostgreSQL", "MySQL", "SQLite", "MongoDB", "CockroachDB", "SQLServer"],
    },
  ]);

  console.log(chalk.green(`📦 Creating NestJS project "${projectName}"...`));
  await execa("npx", ["@nestjs/cli", "new", projectName, "--skip-install"], {
    stdio: "inherit",
  });

  const pkgManager = detectPackageManager();

  const coreDeps = [
    "argon2",
    "@nestjs/config",
    "@nestjs/swagger",
    "class-validator",
    "class-transformer",
    "winston",
    "winston-daily-rotate-file",
    "@nestjs/jwt",
    "passport-jwt",
    "@nestjs/passport",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "moment",
  ];

  const devDeps = [
    "prisma",
    "@types/multer",
  ];
  

  await execa(pkgManager, ["install", ...coreDeps], {
    cwd: projectPath,
    stdio: "inherit",
  });

  await execa(pkgManager, ["install", "@prisma/client"], {
    cwd: projectPath,
    stdio: "inherit",
  });

  await execa(pkgManager, ["install", "-D", ...devDeps], {
    cwd: projectPath,
    stdio: "inherit",
  });

  const templatePath = path.resolve(__dirname, "../template");
  const projectPrismaPath = path.join(projectPath, "prisma/schema.prisma");
  const templatePrismaPath = path.join(templatePath, "prisma/schema.prisma");

  if (await fs.pathExists(templatePath)) {
    await fs.copy(templatePath, projectPath, { overwrite: true });
  }

  const providerMap = {
    postgresql: "postgresql",
    mysql: "mysql",
    sqlite: "sqlite",
    mongodb: "mongodb",
    cockroachdb: "postgresql",
    sqlserver: "sqlserver",
  };
  const selectedProvider = providerMap[database.toLowerCase()] || "mysql";

  const prismaContent = await generatePrismaSchema(selectedProvider, templatePrismaPath);
  await fs.outputFile(projectPrismaPath, prismaContent);

  const defaultUrlMap = {
    postgresql: `postgresql://postgres:password@localhost:5432/${dbSafeName}?schema=public`,
    mysql: `mysql://root:password@localhost:3306/${dbSafeName}?schema=public`,
    sqlite: `file:./dev.db`,
    mongodb: `mongodb://localhost:27017/${dbSafeName}`,
    cockroachdb: `postgresql://root:password@localhost:26257/${dbSafeName}?sslmode=disable`,
    sqlserver: `sqlserver://localhost:1433;database=${dbSafeName};user=sa;password=your_password;encrypt=false`,
  };

  const envContent = `DATABASE_URL="${defaultUrlMap[database.toLowerCase()]}"

JWT_ACCESS_SECRET="JWT_ACCESS_SECRET"
JWT_REFRESH_SECRET="JWT_REFRESH_SECRET"
JWT_ACCESS_EXPIRATION_TIME="1d"
JWT_REFRESH_EXPIRATION_TIME="30d"

AWS_ACCESS_KEY_ID="AWS_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="AWS_SECRET_ACCESS_KEY"
AWS_REGION=ap-southeast-1
S3_BUCKET="S3_BUCKET"

NODE_ENV=dev
PROJECT_NAME=${dbSafeName}
PORT=3000
`;

  await fs.outputFile(path.join(projectPath, ".env"), envContent);

  console.log(chalk.yellow("🎉 Project ready!"));
  console.log(chalk.green("✅ Congratulations! Your project has been created successfully."));
  console.log(chalk.cyan(`👉 Next steps: cd ${projectName}`));

  console.log(chalk.cyan(`1. Generate Prisma Client:`));
  console.log(chalk.cyan(`   npx prisma generate`));
  if (selectedProvider === "mongodb") {
    console.log(chalk.cyan(`2. Push schema to MongoDB:`));
    console.log(chalk.cyan(`   npx prisma db push`));
  } else {
    console.log(chalk.cyan(`2. Apply Prisma Migrations:`));
    console.log(chalk.cyan(`   npx prisma migrate dev --name init`));
  }
  console.log(chalk.cyan(`3. Run Seed Script:`));
  console.log(chalk.cyan(`   npx ts-node prisma/seed.ts`));

  console.log(chalk.yellow("⚠️ Make sure your .env DATABASE_URL is correct before running the above commands!"));
  console.log(chalk.cyan(`\nStart the development server:`));
  console.log(chalk.cyan(`${pkgManager} run start:dev`));
}

main().catch((err) => {
  console.error(chalk.red("Error:"), err);
  process.exit(1);
});
