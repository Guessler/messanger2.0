import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  dotenv.config();

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.use(helmet());
  app.enableCors();
  app.use(cookieParser());


  await app.listen(process.env.PORT ?? 3000);

}
bootstrap();
