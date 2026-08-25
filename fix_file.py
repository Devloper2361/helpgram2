import re

with open("src/api/dashboard.routes.ts", "r") as f:
    lines = f.readlines()

def print_with_indent():
    indent = 0
    for i, line in enumerate(lines):
        line_strip = line.strip()
        # count braces
        if line_strip.startswith('}'):
            indent -= 1
        print(f"{i+1:3d} {'  '*indent}{line_strip}")
        open_c = line.count('{')
        close_c = line.count('}')
        if not line_strip.startswith('}'):
             indent += (open_c - close_c)
        else:
             indent += (open_c - close_c + 1)

print_with_indent()
