import re

with open("src/api/dashboard.routes.ts", "r") as f:
    text = f.read()

bad_block = """    } else if (userRole === "PLATFORM_ADMIN" || userRole === "ADMIN") {
      if (targetSocietyId) {
        const society = await prisma.cooperativeSociety.findUnique({
          where: { id: targetSocietyId }
        });
        if (!society) {
          return res.status(404).json({ error: "Society not found" });
        }
      } else {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }"""

good_block = """    } else if (userRole === "PLATFORM_ADMIN" || userRole === "ADMIN") {
      if (targetSocietyId) {
        const society = await prisma.cooperativeSociety.findUnique({
          where: { id: targetSocietyId }
        });
        if (!society) {
          return res.status(404).json({ error: "Society not found" });
        }
      }
    } else {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }"""

if bad_block in text:
    print("Found exact block, replacing...")
    text = text.replace(bad_block, good_block)
else:
    print("Did not find exact block. Here is the block using regex.")
    text = re.sub(
        r'    \} else if \(userRole === "PLATFORM_ADMIN" \|\| userRole === "ADMIN"\) \{\s*if \(targetSocietyId\) \{\s*const society = await prisma\.cooperativeSociety\.findUnique\(\{\s*where: \{ id: targetSocietyId \}\s*\}\);\s*if \(!society\) \{\s*return res\.status\(404\)\.json\(\{ error: "Society not found" \}\);\s*\}\s*\} else \{\s*return res\.status\(403\)\.json\(\{ error: "Forbidden: Insufficient permissions" \}\);\s*\}',
        good_block,
        text
    )

with open("src/api/dashboard.routes.ts", "w") as f:
    f.write(text)

