import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DataService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async getData() {
    try {
      // Get list of tables in the database
      const tables = await this.dataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        LIMIT 5
      `);

      // If there are tables, get sample data from the first one
      if (tables && tables.length > 0) {
        const firstTable = tables[0].table_name;
        const sampleData = await this.dataSource.query(
          `SELECT * FROM "${firstTable}" LIMIT 5`
        );

        return {
          message: 'Data fetched successfully',
          tables: tables.map((t: any) => t.table_name),
          sampleTable: firstTable,
          sampleData,
        };
      }

      return {
        message: 'No tables found in database',
        tables: [],
      };
    } catch (error) {
      return {
        message: 'Error fetching data',
        error: error.message,
      };
    }
  }

  async executeQuery(query: string, params?: any, schema?: string) {
    const started = Date.now();
    try {
      // Prepare parameters array
      const parameters = Array.isArray(params)
        ? params
        : params && typeof params === 'object'
          ? Object.values(params)
          : [];

      // Execute the query with parameters
      const result = await this.dataSource.query(query, parameters);
      const durationMs = Date.now() - started;

      return {
        success: true,
        data: result,
        rowCount: Array.isArray(result) ? result.length : 0,
        meta: {
          durationMs,
          schema: schema || undefined,
          params: parameters,
        },
      };
    } catch (error: any) {
      const durationMs = Date.now() - started;
      return {
        success: false,
        error: error?.message || String(error),
        data: [],
        meta: {
          durationMs,
          schema: schema || undefined,
        },
      };
    }
  }
}
