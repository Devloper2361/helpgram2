import re

with open("src/api/dashboard.routes.ts", "r") as f:
    text = f.read()

text = text.replace(
    "} else {\n      return res.status(403).json({ error: \"Forbidden: Insufficient permissions\" });",
    "}\n    } else {\n      return res.status(403).json({ error: \"Forbidden: Insufficient permissions\" });"
)

with open("src/api/dashboard.routes.ts", "w") as f:
    f.write(text)

