const bcrypt = require('bcryptjs');

module.exports.bootstrap = async function() {
  // 1. Seed roles
  const defaultRoles = [
    { name: 'admin', description: 'Full access' },
    { name: 'agent', description: 'Can list and manage properties' },
    { name: 'user', description: 'Can browse and book properties' }
  ];

  for (let role of defaultRoles) {
    const exists = await Role.findOne({ name: role.name });
    if (!exists) {
      await Role.create(role);
      sails.log(`✅ Role created: ${role.name}`);
    }
  }

  // 2. Seed super admin user
  const adminRole = await Role.findOne({ name: 'admin' });
  if (!adminRole) {
    sails.log.error(' Admin role not found, cannot create super admin');
    return;
  }

  const superAdminEmail = 'admin@example.com'; // change as per project
  const existingAdmin = await User.findOne({ email: superAdminEmail });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: superAdminEmail,
      password: hashedPassword,
      role: adminRole.id
    });

    sails.log(`Super Admin created (email: ${superAdminEmail}, password: Admin@123)`);
  } else {
    sails.log('Super Admin already exists');
  }

  sails.log('Seeding complete');
};
