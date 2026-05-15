import { DataSource } from 'typeorm';
import { seedSuperAdmin } from './super-admin.seed';
import configuration from '../../config/configuration';

const config = configuration();

const dataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.name,
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
