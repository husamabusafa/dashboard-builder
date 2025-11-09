import { Controller, Get, Post, Body } from '@nestjs/common';
import { DataService } from './data.service';

@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get()
  async getData() {
    return this.dataService.getData();
  }

  @Post('query')
  async executeQuery(@Body() body: { query: string }) {
    return this.dataService.executeQuery(body.query);
  }
}
