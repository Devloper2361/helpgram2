with open("src/api/dashboard.routes.ts", "r") as f:
    lines = f.readlines()

def format_lines(lines):
    indent = 0
    for i, line in enumerate(lines):
        line = line.strip()
        print(f"{i+1}: {line}")

# Just want to see where the brace mismatch is
