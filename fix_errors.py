import os
import re

for root, _, files in os.walk("src"):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            filepath = os.path.join(root, file)
            with open(filepath, "r") as f:
                content = f.read()
            
            # Replace console.error(error) and similar
            new_content = re.sub(r'console\.error\(\s*(e|error|err)\s*\)', r'console.error(\1?.message || \1)', content)
            
            # Replace console.error("...", error) 
            new_content = re.sub(r'console\.error\(\s*("[^"]*")\s*,\s*(e|error|err)\s*\)', r'console.error(\1, \2?.message || \2)', content)

            if new_content != content:
                with open(filepath, "w") as f:
                    f.write(new_content)
