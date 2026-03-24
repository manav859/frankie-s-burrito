import json
import sys

with open(r'C:\Users\manav\.gemini\antigravity\brain\bc2138f7-8692-4018-83ad-ac8c7f14497f\.system_generated\steps\407\output.txt', 'r', encoding='utf-8') as f:
    data = json.load(f)

def needs_wrapping(node):
    if node.get('type') != 'text': return False
    # we don't wrap things inside buttons or strict containers
    name = str(node.get('name', '')).lower()
    
    # Don't wrap navigation links or small labels unless necessary
    content = str(node.get('content', ''))
    if len(content) > 30: return True
    
    font_size = node.get('fontSize', 0)
    if font_size >= 26: return True  # Headings typically wrap
    return False

commands = []
for node in data:
    if needs_wrapping(node):
        commands.append(f'U("{node["id"]}", {{textGrowth: "fixed-width", width: "fill_container"}})')

batch_size = 20
for i in range(0, len(commands), batch_size):
    print(f"--- BATCH {i//batch_size + 1} ---")
    print('\n'.join(commands[i:i+batch_size]))
