import re

with open("src/api/dashboard.routes.ts", "r") as f:
    text = f.read()

fed_bad = r'    \} else if \(userRole === "PLATFORM_ADMIN" \|\| userRole === "ADMIN"\) \{[\s\S]*?\} else \{\n      return res\.status\(403\)'

fed_good = """    } else if (userRole === "PLATFORM_ADMIN" || userRole === "ADMIN") {
      if (targetFederationId) {
        const federation = await prisma.cooperativeFederation.findUnique({
          where: { id: targetFederationId }
        });
        if (!federation) {
          return res.status(404).json({ error: "Federation not found" });
        }
      }
    } else {
      return res.status(403)"""

text = re.sub(fed_bad, fed_good, text, count=1)

with open("src/api/dashboard.routes.ts", "w") as f:
    f.write(text)
