import { Pool, QueryResult } from 'pg';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  database: {
    connected: boolean;
    responseTime: number;
    error?: string;
  };
}

interface DatabaseConfig {
  pool: Pool;
  timeout?: number;
}

async function checkDatabaseHealth(config: DatabaseConfig): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const timeout = config.timeout || 5000;

  try {
    const client = await Promise.race([
      config.pool.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database connection timeout')), timeout)
      ),
    ]);

    try {
      const result: QueryResult = await client.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      if (result.rows && result.rows.length > 0) {
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: {
            connected: true,
            responseTime,
          },
        };
      }

      throw new Error('Query returned no results');
    } finally {
      client.release();
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        responseTime,
        error: errorMessage,
      },
    };
  }
}

export { checkDatabaseHealth, HealthCheckResult, DatabaseConfig };