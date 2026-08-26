import re

with open("src/pages/Catalog.tsx", "r") as f:
    text = f.read()

text = text.replace(
    'console.error(err);',
    'console.log(err);'
)

with open("src/pages/Catalog.tsx", "w") as f:
    f.write(text)

