import re
import os

def patch_file(filepath):
    with open(filepath, "r") as f:
        text = f.read()

    text = re.sub(r'alert\(data\.error \|\| (.*?)\);', r'alert(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error) || \1));', text)
    text = re.sub(r'alert\(data\.error\);', r'alert(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error)));', text)

    with open(filepath, "w") as f:
        f.write(text)

patch_file("src/pages/Profile.tsx")
patch_file("src/pages/TaskDetail.tsx")

