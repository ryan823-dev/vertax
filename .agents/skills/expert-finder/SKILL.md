---
name: expert-finder
description: >
  Use when the user wants to find domain experts, thought leaders, industry specialists, conference speakers,
  authors, or influencers in a specific field. Triggers include: "find experts in [field]",
  "who are the top [topic] experts", "find thought leaders", "conference speakers [topic]",
  "expert interview candidates", "find [industry] specialists".
always_apply: true
---

# Expert Finder

Find and qualify domain experts, thought leaders, and specialists using Exa search. Designed for sourcing interview candidates, consulting opportunities, and professional networking.

## Tool Selection

**Primary discovery via Exa:**
```json
mcp_call {
  "action": "mcp",
  "name": "exa_web_search_exa",
  "arguments": {
    "query": "...",
    "category": "people",
    "numResults": 30,
    "type": "auto"
  }
}
```

**Deep research on specific expert:**
```json
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "[Expert Name] biography publications",
    "num_results": 15,
    "type": "deep"
  }
}
```

## Expert Discovery Patterns

| Expert Type | Query Patterns |
|-------------|----------------|
| Industry Expert | "top [industry] experts", "[industry] thought leaders" |
| Technical Expert | "[technology] engineer", "[skill] specialist" |
| Academic | "[topic] professor", "[field] researcher", "PhD" |
| Author | "[topic] book author", "published [topic] book" |
| Speaker | "[topic] conference speaker", "[event] speaker" |
| Executive | "CEO [industry]", "founder [startup type]" |

## Research Pipeline

### Step 1: Discovery
Find potential experts using multiple query variations:
- Run 2-3 parallel searches with different phrasings
- Use Task agents for each search
- Merge and deduplicate results

### Step 2: Qualification
Deep dive on promising candidates:
- Check for publications/articles (authority signal)
- Look for speaking engagements (thought leadership)
- Verify company/organization affiliations
- Assess online presence consistency

### Step 3: Enrichment
Extract additional data:
- Company/Organization
- Role and tenure
- Notable achievements
- Contact availability (public)

## Usage Examples

### Find AI safety experts
```
mcp_call {
  "action": "mcp",
  "name": "exa_web_search_exa",
  "arguments": {
    "query": "AI safety researcher expert",
    "category": "people",
    "numResults": 25
  }
}
```

### Find conference speakers in fintech
```
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "fintech conference speaker 2024",
    "num_results": 20
  }
}
```

### Research a specific expert
```
mcp_call {
  "action": "mcp",
  "name": "exa_answer",
  "arguments": {
    "query": "Who is [Expert Name] and what are their key contributions to [field]?"
  }
}
```

## Output Format

```
━━━ Expert Discovery Results ━━━

### Tier 1: High Authority
1. [Expert Name]
   Role: [Title] at [Organization]
   Expertise: [Primary domains]
   Authority Signals: [Publications / Speaking / Notable work]
   Contact: [LinkedIn / Twitter / Website]
   Relevance Score: 9/10

### Tier 2: Strong Candidates
2. [Expert Name]
   ...

### Tier 3: Worth Considering
3. [Expert Name]
   ...

━━━ Expert Summary ━━━
Total candidates: [N]
Top organizations: [list]
Common expertise areas: [list]
Recommended outreach tier: [1/2/3]
```

## Qualification Criteria

Score experts on:
- **Authority**: Publications, citations, media mentions
- **Relevance**: Direct match to target topic
- **Accessibility**: Public contact info, engagement history
- **Recency**: Active recently in field

## Dynamic Tuning

| User Request | Search Depth |
|--------------|--------------|
| "a few names" | 10-20 results |
| "comprehensive list" | 50-100 results |
| Specific number | Match exactly |

## Browser Fallback

When search results are insufficient:
- Use browser for auth-gated platforms
- Check professional association directories
- Search academic databases (Google Scholar)
