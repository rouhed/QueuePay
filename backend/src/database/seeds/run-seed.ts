import { DataSource } from 'typeorm';
import { seedSuperAdmin } from './super-admin.seed';
import configuration from '../../config/configuration';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../../../.env') });

const config = configuration();

const dbUrl = config.database.url;

const dataSource = new DataSource({
  type: 'postgres',
  ...(dbUrl
    ? {
        url: dbUrl,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: config.database.host,
        port: config.database.port,
        username: config.database.username,
        password: config.database.password,
        database: config.database.name,
      }),
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: true,
});

async function runSeeds() {
  try {
    console.log('\n🔌 Connexion à la base de données...');
    await dataSource.initialize();
    console.log('✅ Connecté !\n');

    console.log('🌱 Exécution des seeds...\n');
    await seedSuperAdmin(dataSource);

    console.log('\n✅ Tous les seeds ont été exécutés avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du seed :', error);
  } finally {
    await dataSource.destroy();
    process.exit(0);
  }
}

runSeeds();
