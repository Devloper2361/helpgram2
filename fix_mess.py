import re

with open("src/api/dashboard.routes.ts", "r") as f:
    text = f.read()

# Fix /society block (lines 123-132)
soc_bad = r'    \} else if \(userRole === "PLATFORM_ADMIN" \|\| userRole === "ADMIN"\) \{\s*if \(targetFederationId\) \{\s*const federation = await prisma.cooperativeFederation.findUnique\(\{\s*where: \{ id: targetFederationId \}\s*\}\);\s*if \(!federation\) \{\s*return res.status\(404\).json\(\{ error: "Federation not found" \}\);\s*\}\s*\}\s*\} else \{'

soc_good = """    } else if (userRole === "PLATFORM_ADMIN" || userRole === "ADMIN") {
      if (targetSocietyId) {
        const society = await prisma.cooperativeSociety.findUnique({
          where: { id: targetSocietyId }
        });
        if (!society) {
          return res.status(404).json({ error: "Society not found" });
        }
      }
    } else {"""

text = re.sub(soc_bad, soc_good, text, count=1)

# Fix /federation block (lines 220-235)
fed_bad = r'    \} else if \(userRole === "PLATFORM_ADMIN" \|\| userRole === "ADMIN"\) \{\s*if \(targetSocietyId\) \{\s*if\(targetSocietyId\) \{ const society = await prisma.cooperativeSociety.findUnique\(\{\s*where: \{ id: targetSocietyId \}\s*\}\);\s*if \(!society\) \{\s*return res.status\(404\).json\(\{ error: "Society not found" \}\); \} \}\s*\}\s*\}\s*\}\);\s*\}\s*if\(targetFederationId\) \{ const federation = await prisma.cooperativeFederation.findUnique\(\{\s*where: \{ id: targetFederationId \}\s*\}\);\s*if \(!federation\) \{\s*return res.status\(404\).json\(\{ error: "Federation not found" \}\); \} \}\s*\}'

fed_good = """    } else if (userRole === "PLATFORM_ADMIN" || userRole === "ADMIN") {
      if (targetFederationId) {
        const federation = await prisma.cooperativeFederation.findUnique({
          where: { id: targetFederationId }
        });
        if (!federation) {
          return res.status(404).json({ error: "Federation not found" });
        }
      }
    }"""

text = re.sub(fed_bad, fed_good, text, count=1)

with open("src/api/dashboard.routes.ts", "w") as f:
    f.write(text)

