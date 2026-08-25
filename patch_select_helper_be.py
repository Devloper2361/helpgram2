import re

with open("src/api/tasks.routes.ts", "r") as f:
    text = f.read()

text = text.replace(
    'router.post("/:id/select-helper", authenticate, async (req: any, res: any) => {',
    'router.post("/:id/select-helper", authenticate, async (req: any, res: any) => {\n  console.log("HIT select-helper with taskerId:", req.body.taskerId);'
)

text = text.replace(
    'res.status(404).json({ error: "Task not found" });',
    'res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");'
)

text = text.replace(
    'res.status(403).json({ error: "Unauthorized" });',
    'res.status(403).json({ error: "Unauthorized" }); console.log("403 Unauthorized");'
)

text = text.replace(
    'res.status(400).json({ error: "Task is not open" });',
    'res.status(400).json({ error: "Task is not open" }); console.log("400 Task not open");'
)

text = text.replace(
    'res.status(400).json({ error: "Helper did not apply for this task" });',
    'res.status(400).json({ error: "Helper did not apply for this task" }); console.log("400 Helper did not apply");'
)

text = text.replace(
    'console.error(error);\n    res.status(500).json({ error: "Internal server error" });',
    'console.error("SELECT HELPER 500 ERROR:", error);\n    res.status(500).json({ error: error.message || "Internal server error" });'
)

with open("src/api/tasks.routes.ts", "w") as f:
    f.write(text)

