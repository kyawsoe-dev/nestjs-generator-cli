import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerConfig } from "./common/config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: "*",
      methods: "*",
      allowedHeaders: "*",
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  app.setGlobalPrefix("api/v1");
  SwaggerConfig(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server is running on port: ${port}\n`);
}

bootstrap().catch((err) => {
  console.error("Error starting the application:", err);
  process.exit(1);
});
