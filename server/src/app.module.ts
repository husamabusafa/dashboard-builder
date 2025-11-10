import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataModule } from './data/data.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgres://postgres:postgres@localhost:5432/dashboard-builder',
      autoLoadEntities: true,
      synchronize: false,
    }),
    DataModule,
  ],
})
export class AppModule {}
