import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

import cookieParser from "cookie-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle("Payment api")
    .setDescription("This api for payment gateway")
    .setVersion("1.00")
    .setExternalDoc("Коллекция json", "/swagger-json")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("swagger", app, document);

  await app.listen(5800);
}
bootstrap();
