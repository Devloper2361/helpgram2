import re

with open("src/pages/CatalogAdmin.tsx", "r") as f:
    text = f.read()

# Replace toast.error(err.error || "Action failed");
# with toast.error(typeof err.error === 'string' ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error) || "Action failed"));

def replacer(match):
    return match.group(0).replace('err.error || "Action failed"', 'typeof err.error === "string" ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error) || "Action failed")')

text = re.sub(r'toast\.error\(err\.error \|\| "Action failed"\);', replacer, text)

with open("src/pages/CatalogAdmin.tsx", "w") as f:
    f.write(text)

