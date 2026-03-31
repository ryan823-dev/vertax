---
name: linkedin-research
description: >
  Use when the user wants to find LinkedIn profiles, look up professional backgrounds, extract LinkedIn data,
  or research someone by name/title/company. Triggers include: "find on LinkedIn", "LinkedIn profile",
  "lookup [person name]", "find [job title] profiles", "LinkedIn research".
always_apply: true
---

# LinkedIn Research

A specialized skill for discovering and researching LinkedIn profiles using Exa search. Optimized for public LinkedIn data extraction without authentication requirements.

## Tool Selection

Exa search via **MCP tools** — no API key needed.

**Primary tool:**
```json
mcp_call {
  "action": "mcp",
  "name": "exa_web_search_exa",
  "arguments": {
    "query": "...",
    "category": "people",
    "numResults": 20,
    "type": "auto"
  }
}
```

**For deep profile research:**
```json
mcp_call {
  "action": "mcp",
  "name": "get_page_contents_exa",
  "arguments": {
    "urls": ["https://linkedin.com/in/example"],
    "text": true,
    "summary": true
  }
}
```

## Token Isolation

Always spawn Task agents for Exa searches:
- Agent runs search internally
- Agent processes and extracts profile data
- Agent returns distilled output (compact JSON)
- Main context stays clean

## Query Patterns

| Search Type | Query Format | Example |
|-------------|--------------|---------|
| By role | "[Job Title] at [Company]" | "VP Engineering at Anthropic" |
| By name | "[Full Name] LinkedIn" | "Dario Amodei LinkedIn" |
| By company | "[Company] employees" | "OpenAI employees" |
| By industry | "[Industry] professionals" | "AI safety professionals" |

## Usage Examples

### Find profiles by role
```
mcp_call {
  "action": "mcp",
  "name": "exa_web_search_exa",
  "arguments": {
    "query": "VP Engineering AI startups",
    "category": "people",
    "numResults": 20
  }
}
```

### Find profiles at specific company
```
mcp_call {
  "action": "mcp",
  "name": "exa_web_search_exa",
  "arguments": {
    "query": "Anthropic team members",
    "category": "people",
    "numResults": 30
  }
}
```

### Extract profile details
```
mcp_call {
  "action": "mcp",
  "name": "get_page_contents_exa",
  "arguments": {
    "urls": ["https://linkedin.com/in/johndoe"],
    "text": true,
    "summary": true
  }
}
```

## Output Format

```
━━━ LinkedIn Profile Results ━━━

1. [Full Name]
   Title: [Current Job Title]
   Company: [Company Name]
   Location: [City, Country]
   Summary: [2-3 sentences from profile]
   Source: [LinkedIn URL]

2. ...

━━━ Summary ━━━
Total profiles found: [N]
Top companies represented: [list]
Top roles: [list]
```

## Limitations

- LinkedIn requires authentication for full profile access
- Exa returns public data only
- Some profiles may be restricted
- For auth-required content: use browser fallback

## Browser Fallback

When Exa returns limited data or profile is auth-gated:
- Suggest using browser automation
- Or ask user to provide specific profile URLs
