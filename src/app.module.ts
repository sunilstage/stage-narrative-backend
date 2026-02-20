import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NarrativeModule } from './narrative/narrative.module';

@Module({
  imports: [
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
