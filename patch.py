import re

with open('src/api/tasks.routes.ts', 'r') as f:
    content = f.read()

target = """    if (existingApplication) {
      return res.status(400).json({ error: "Already applied" });
    }

    const application = await prisma.taskApplication.create({"""

replacement = """    if (existingApplication) {
      return res.status(400).json({ error: "Already applied" });
    }

    const eligibility = await checkWorkerEligibility(userId, id);
    if (!eligibility.eligible) {
      return res.status(403).json({
        error: "Worker is not eligible for this task",
        reason: eligibility.reason,
        missingSkills: eligibility.missingSkills
      });
    }

    const application = await prisma.taskApplication.create({"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/api/tasks.routes.ts', 'w') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")
