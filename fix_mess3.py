import re
with open("src/api/dashboard.routes.ts", "r") as f:
    text = f.read()

text = text.replace(
    'return res.status(404).json({ error: "Society not found" }); } }\n      }',
    'return res.status(404).json({ error: "Society not found" });\n      }\n      }'
)
with open("src/api/dashboard.routes.ts", "w") as f:
    f.write(text)
