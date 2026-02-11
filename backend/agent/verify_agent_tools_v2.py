import sys
import os

# Ensure backend is in path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from agent.tools import AgentTools

tools = AgentTools()

print("--- SEARCH TEST ---")
results = tools.search_candidates("Susan")
print(f"Results: {results}")

if results:
    susan_id = results[0]['id']
    print(f"\n--- GET DETAILS TEST (ID: {susan_id}) ---")
    details = tools.get_candidate_details(susan_id)
    print(details)
else:
    print("Susan not found")
