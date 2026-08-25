import re
with open("src/api/dashboard.routes.ts", "r") as f:
    text = f.read()

# Fix the FEDERATION_ADMIN block in /society
bad_fed_admin = """    } else if (userRole === "FEDERATION_ADMIN") {
      if (targetSocietyId && !targetSocietyId) {
        return res.status(400).json({ error: "societyId query parameter is required" });
      }
      if(targetSocietyId) { const society = await prisma.cooperativeSociety.findUnique({
        where: { id: targetSocietyId }
      });
      if (!society) {
        return res.status(404).json({ error: "Society not found" });
      }
      const membership = await prisma.federationMembership.findUnique({"""

good_fed_admin = """    } else if (userRole === "FEDERATION_ADMIN") {
      if (!targetSocietyId) {
        return res.status(400).json({ error: "societyId query parameter is required" });
      }
      const society = await prisma.cooperativeSociety.findUnique({
        where: { id: targetSocietyId }
      });
      if (!society) {
        return res.status(404).json({ error: "Society not found" });
      }
      const membership = await prisma.federationMembership.findUnique({"""

text = text.replace(bad_fed_admin, good_fed_admin)

with open("src/api/dashboard.routes.ts", "w") as f:
    f.write(text)
