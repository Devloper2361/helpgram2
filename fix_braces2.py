import re
with open("src/api/dashboard.routes.ts", "r") as f:
    text = f.read()

text = text.replace('        return res.status(404).json({ error: "Society not found" }); } }', '        return res.status(404).json({ error: "Society not found" }); }')
text = text.replace('        return res.status(404).json({ error: "Federation not found" }); } }', '        return res.status(404).json({ error: "Federation not found" }); }')

with open("src/api/dashboard.routes.ts", "w") as f:
    f.write(text)
