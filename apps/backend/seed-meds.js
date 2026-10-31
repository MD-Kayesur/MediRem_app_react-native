const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding initial medications into Neon Cloud Database...');

  // Find user MD Kayesur
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'rmdkayesur@gmail.com' },
        { name: { contains: 'Kayesur', mode: 'insensitive' } }
      ]
    }
  });

  const userId = user ? user.id : undefined;
  console.log('Assigning to user:', user ? `${user.name} (${user.email}) - ID: ${user.id}` : 'None (Global)');

  const initialMeds = [
    {
      name: 'Metformin',
      dosage: '500mg',
      instructions: 'Take 1 tablet after food with a glass of water',
      frequency: 'Every day',
      selectedDays: JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
      startDate: 'May 1, 2026',
      endDate: 'Ongoing',
      time: '01:00 PM',
      timeSlot: 'Afternoon',
      pillsLeft: 18,
      totalPills: 30,
      status: 'active',
      alarmEnabled: true,
      userId: userId,
    },
    {
      name: 'Paracetamol',
      dosage: '500mg',
      instructions: 'Take 1 tablet with water when headache occurs',
      frequency: 'As needed',
      selectedDays: JSON.stringify(['Mon', 'Wed', 'Fri']),
      startDate: 'May 1, 2026',
      endDate: 'Ongoing',
      time: '08:00 AM',
      timeSlot: 'Morning',
      pillsLeft: 24,
      totalPills: 30,
      status: 'active',
      alarmEnabled: true,
      userId: userId,
    },
    {
      name: 'Vitamin D3',
      dosage: '1000IU',
      instructions: 'Take 1 capsule with breakfast',
      frequency: 'Every day',
      selectedDays: JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
      startDate: 'Apr 15, 2026',
      endDate: 'Ongoing',
      time: '09:00 AM',
      timeSlot: 'Morning',
      pillsLeft: 45,
      totalPills: 60,
      status: 'active',
      alarmEnabled: true,
      userId: userId,
    },
    {
      name: 'Atorvastatin',
      dosage: '10mg',
      instructions: 'Take 1 tablet at bedtime',
      frequency: 'Every day',
      selectedDays: JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
      startDate: 'Jun 1, 2026',
      endDate: 'Ongoing',
      time: '10:00 PM',
      timeSlot: 'Night',
      pillsLeft: 28,
      totalPills: 30,
      status: 'active',
      alarmEnabled: true,
      userId: userId,
    },
  ];

  for (const medData of initialMeds) {
    const existing = await prisma.medication.findFirst({
      where: { name: medData.name, ...(userId ? { userId } : {}) },
    });

    if (!existing) {
      const created = await prisma.medication.create({
        data: medData,
      });
      console.log(`✅ Created Medication in Neon DB: ${created.name} (${created.id})`);
    } else {
      console.log(`ℹ️ Medication already exists: ${existing.name} (${existing.id})`);
    }
  }

  const allMeds = await prisma.medication.findMany();
  console.log(`🎉 Total medications now in Neon DB: ${allMeds.length}`);
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

