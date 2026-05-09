import os

filepath = 'app/src/app/user/dashboard/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('color: "white"', 'color: "var(--foreground)"')
content = content.replace('color: stat.color || "white"', 'color: stat.color || "var(--foreground)"')
content = content.replace('.style.color = "white"', '.style.color = "var(--foreground)"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
