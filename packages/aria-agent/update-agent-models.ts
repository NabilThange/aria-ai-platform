import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAgentModels() {
  console.log('Updating agent models to fix Groq openai/gpt-oss-* token counting bug...');

  // Update ORCHESTRATOR
  await prisma.agentConfig.upsert({
    where: { name: 'ORCHESTRATOR' },
    update: {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    },
    create: {
      name: 'ORCHESTRATOR',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      description: 'Brain of system - bad plan = everything fails',
    },
  });

  // Update CLARIFIER
  await prisma.agentConfig.upsert({
    where: { name: 'CLARIFIER' },
    update: {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    },
    create: {
      name: 'CLARIFIER',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      description: 'Fast Q&A, user is waiting',
    },
  });

  // Update VERIFIER
  await prisma.agentConfig.upsert({
    where: { name: 'VERIFIER' },
    update: {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    },
    create: {
      name: 'VERIFIER',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      description: 'Runs 20-30x per task, strict JSON guaranteed',
    },
  });

  // Update REPORTER
  await prisma.agentConfig.upsert({
    where: { name: 'REPORTER' },
    update: {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    },
    create: {
      name: 'REPORTER',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      description: 'Reads state, writes summary - zero reasoning',
    },
  });

  // Update WORKFLOW
  await prisma.agentConfig.upsert({
    where: { name: 'WORKFLOW' },
    update: {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    },
    create: {
      name: 'WORKFLOW',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      description: 'Executes pre-built workflows, fast execution',
    },
  });

  console.log('✅ All agent models updated successfully!');
  console.log('Changed from openai/gpt-oss-* to llama-3.3-70b-versatile');
}

updateAgentModels()
  .catch((e) => {
    console.error('Error updating agent models:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
