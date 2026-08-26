import re

with open("src/pages/Dashboard.tsx", "r") as f:
    text = f.read()

text = text.replace(
    '.catch(console.error);',
    '.catch(err => setData({ error: err.message || "Failed to load dashboard" }));'
)

with open("src/pages/Dashboard.tsx", "w") as f:
    f.write(text)

