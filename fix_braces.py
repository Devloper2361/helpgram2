with open("src/api/dashboard.routes.ts", "r") as f:
    text = f.read()

# Let's count open and close braces
open_braces = text.count('{')
close_braces = text.count('}')
print(f"Open: {open_braces}, Close: {close_braces}")

