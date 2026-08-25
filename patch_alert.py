import re
import os

def patch_file(filepath):
    with open(filepath, "r") as f:
        text = f.read()

    text = re.sub(r'alert\(err\.error \|\| (.*?)\);', r'alert(typeof err.error === "string" ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error) || \1));', text)
    text = re.sub(r'alert\(err\.error\);', r'alert(typeof err.error === "string" ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error)));', text)

    with open(filepath, "w") as f:
        f.write(text)

patch_file("src/pages/AdminCertifications.tsx")
patch_file("src/pages/Profile.tsx")
patch_file("src/pages/Wallet.tsx")

