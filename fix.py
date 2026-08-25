import re

with open("src/api/dashboard.routes.ts", "r") as f:
    text = f.read()

# Let's just fix the PLATFORM_ADMIN branches manually.
# Wait, the file is currently a bit messed up.
# Let's see if there is a backup.
