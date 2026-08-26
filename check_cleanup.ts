import { prisma } from "./src/lib/prisma.js";

async function check() {
  const prefixes = ['AUDIT_', 'AUD2_', 'AUD3_', 'AUD4_', 'aud2_', 'aud3_', 'aud4_', 'audit_'];
  
  const checkPrefix = (arr: any[], field: string) => 
    arr.filter(item => prefixes.some(p => item[field]?.startsWith(p)));

  const tasks = await prisma.task.findMany();
  const users = await prisma.user.findMany();
  const services = await prisma.service.findMany();
  const categories = await prisma.serviceCategory.findMany();
  const federations = await prisma.cooperativeFederation.findMany();
  const societies = await prisma.cooperativeSociety.findMany();

  const badTasks = checkPrefix(tasks, 'title');
  const badUsers = checkPrefix(users, 'email');
  const badServices = checkPrefix(services, 'name');
  const badCategories = checkPrefix(categories, 'name');
  const badFederations = checkPrefix(federations, 'name');
  const badSocieties = checkPrefix(societies, 'name');

  console.log("Tasks:", badTasks.map(t => t.title));
  console.log("Users:", badUsers.map(u => u.email));
  console.log("Services:", badServices.map(s => s.name));
  console.log("Categories:", badCategories.map(c => c.name));
  console.log("Federations:", badFederations.map(f => f.name));
  console.log("Societies:", badSocieties.map(s => s.name));

  const total = badTasks.length + badUsers.length + badServices.length + badCategories.length + badFederations.length + badSocieties.length;
  console.log("Total lingering records found:", total);
}
check().finally(() => process.exit(0));
