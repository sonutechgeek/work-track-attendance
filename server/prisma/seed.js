require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin
  const existing = await prisma.user.findUnique({ where: { email: 'admin@company.com' } });
  if (!existing) {
    const hashed = await bcrypt.hash('Admin@1234', 12);
    const admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@company.com',
        password: hashed,
        role: 'ADMIN',
        employeeId: 'EMP001',
        isActive: true,
      },
    });

    // Leave balance for admin
    await prisma.leaveBalance.create({
      data: { employeeId: admin.id, year: new Date().getFullYear() },
    });

    console.log(`Admin created: admin@company.com / Admin@1234`);
  } else {
    console.log('Admin already exists, skipping.');
  }

  // Create sample department
  let dept = await prisma.department.findFirst({ where: { name: 'Engineering' } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { name: 'Engineering', description: 'Software Engineering Department' },
    });
    console.log('Department "Engineering" created.');
  }

  // Create sample manager
  let manager = await prisma.user.findUnique({ where: { email: 'manager@company.com' } });
  if (!manager) {
    const hashed = await bcrypt.hash('Manager@1234', 12);
    manager = await prisma.user.create({
      data: {
        name: 'Team Manager',
        email: 'manager@company.com',
        password: hashed,
        role: 'MANAGER',
        employeeId: 'EMP002',
        departmentId: dept.id,
        isActive: true,
      },
    });
    await prisma.leaveBalance.create({
      data: { employeeId: manager.id, year: new Date().getFullYear() },
    });
    console.log('Manager created: manager@company.com / Manager@1234');
  }

  // Create sample employee
  let employee = await prisma.user.findUnique({ where: { email: 'employee@company.com' } });
  if (!employee) {
    const hashed = await bcrypt.hash('Employee@1234', 12);
    employee = await prisma.user.create({
      data: {
        name: 'John Employee',
        email: 'employee@company.com',
        password: hashed,
        role: 'EMPLOYEE',
        employeeId: 'EMP003',
        departmentId: dept.id,
        managerId: manager.id,
        isActive: true,
      },
    });
    await prisma.leaveBalance.create({
      data: {
        employeeId: employee.id,
        year: new Date().getFullYear(),
        casualTotal: 12, sickTotal: 8, halfDayTotal: 6, wfhTotal: 24,
      },
    });
    console.log('Employee created: employee@company.com / Employee@1234');
  }

  console.log('Seeding complete!');
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
