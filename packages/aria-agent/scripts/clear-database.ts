import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...');

  try {
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete all messages
      const messagesDeleted = await tx.message.deleteMany({});
      console.log(`✅ Deleted ${messagesDeleted.count} messages`);

      // Delete all summaries
      const summariesDeleted = await tx.summary.deleteMany({});
      console.log(`✅ Deleted ${summariesDeleted.count} summaries`);

      // Delete all files
      const filesDeleted = await tx.file.deleteMany({});
      console.log(`✅ Deleted ${filesDeleted.count} files`);

      // Delete all tasks (CASCADE will clean up any remaining relations)
      const tasksDeleted = await tx.task.deleteMany({});
      console.log(`✅ Deleted ${tasksDeleted.count} tasks`);
    });

    // Verify cleanup
    const remainingTasks = await prisma.task.count();
    const remainingMessages = await prisma.message.count();
    const remainingSummaries = await prisma.summary.count();
    const remainingFiles = await prisma.file.count();

    console.log('\n📊 Database Status:');
    console.log(`   Tasks: ${remainingTasks}`);
    console.log(`   Messages: ${remainingMessages}`);
    console.log(`   Summaries: ${remainingSummaries}`);
    console.log(`   Files: ${remainingFiles}`);

    if (remainingTasks === 0 && remainingMessages === 0 && remainingSummaries === 0 && remainingFiles === 0) {
      console.log('\n✨ Database cleared successfully!');
    } else {
      console.log('\n⚠️  Warning: Some records remain in the database');
    }
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
