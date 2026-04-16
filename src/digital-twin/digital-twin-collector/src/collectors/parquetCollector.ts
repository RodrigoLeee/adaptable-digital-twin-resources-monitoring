import fs from 'fs';
import { normalizeFromParquets, TaskRow, PowerSourceRow, ServiceRow, HostRow } from '../normalizer/stateNormalizer';
import { DatacenterState } from '../types';
import logger from '../logger';

async function readParquet<T>(filePath: string): Promise<T[]> {
  const { parquetRead } = await import('hyparquet');
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  const rows: T[] = [];
  await parquetRead({
    file: arrayBuffer,
    onComplete: (data: unknown[]) => {
      rows.push(...(data as T[]));
    },
  });
  return rows;
}

export async function extractStateFromParquets(files: {
  host: string;
  powerSource: string;
  service: string;
  task: string;
}): Promise<DatacenterState> {
  logger.debug('Reading parquet files', { files });

  const [taskRows, powerRows, serviceRows, hostRows] = await Promise.all([
    readParquet<TaskRow>(files.task),
    readParquet<PowerSourceRow>(files.powerSource),
    readParquet<ServiceRow>(files.service),
    readParquet<HostRow>(files.host),
  ]);

  logger.debug('Parquet rows loaded', {
    tasks: taskRows.length,
    power: powerRows.length,
    service: serviceRows.length,
    hosts: hostRows.length,
  });

  return normalizeFromParquets(taskRows, powerRows, serviceRows, hostRows);
}
