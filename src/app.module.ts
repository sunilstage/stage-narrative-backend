import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { NarrativeModule } from './narrative/narrative.module';

@Module({
  imports: [
    // Configuration Module (loads .env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB Connection
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/narrative_engine', {
      retryWrites: true,
    }),

    // Narrative Module
    NarrativeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
