import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole, Language } from '../../common/enums';

/**
 * Seed : Crée le Super Admin par défaut s'il n'existe pas encore.
 *
 * Identifiants par défaut :
 *   Email : admin@queuepay.mg
 *   Mot de passe : QueuePay2026!
 */
export async function seedSuperAdmin(dataSource: DataSource): Promise<void> {
  const usersRepo = dataSource.getRepository(User);

  const existing = await usersRepo.findOne({
    where: { email: 'admin@queuepay.mg' },
  });

  if (existing) {
    console.log('✅ Super Admin existe déjà — seed ignoré');
    return;
  }

  const passwordHash = await bcrypt.hash('QueuePay2026!', 12);

  const superAdmin = usersRepo.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@queuepay.mg',
    phone: '+261340000000',
    passwordHash,
    role: UserRole.SUPER_ADMIN,
    language: Language.FR,
    isActive: true,
    isVerified: true,
  });

  await usersRepo.save(superAdmin);
  console.log('🌱 Super Admin créé avec succès !');
  console.log('   📧 Email    : admin@queuepay.mg');
  console.log('   🔑 Password : QueuePay2026!');
}
