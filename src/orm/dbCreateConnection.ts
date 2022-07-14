import { Connection, createConnection } from 'typeorm';

import config from './ormConfig';

export const dbCreateConnection = async (): Promise<Connection | null> => {
  let conn: any = null;
  try {
    conn = await createConnection(config);
    console.log(`[ORM] Connection Name: '${conn.name}' | Database: '${conn.options.database}'`);
  } catch (e) {
    console.log(`[ORM] Connection to database failed: `, e.message.toString());
  }
  return conn;
};
