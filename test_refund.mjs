async function run() {
  const db = await import("./src/lib/prisma.js");
  const prisma = db.prisma;
  const dispute = await prisma.dispute.findUnique({ where: { id: "some-id" }}); // I will fetch the actual dispute
}
run();
