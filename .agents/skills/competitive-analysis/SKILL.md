---
name: competitive-analysis
description: >
  Use when the user wants to analyze competitors, compare products/companies, understand market positioning,
  research competitive landscape, or identify market gaps. Triggers include: "competitor analysis",
  "compare [Company A] vs [Company B]", "market positioning [industry]", "competitive landscape",
  "[industry] market share", "swot [company]".
always_apply: true
---

# Competitive Analysis

Analyze competitors, compare products, and understand market positioning using Exa search. Designed for strategic planning, market research, and competitive intelligence.

## Tool Selection

**Company discovery:**
```json
mcp_call {
  "action": "mcp",
  "name": "exa_web_search_exa",
  "arguments": {
    "query": "[industry] companies competitors",
    "category": "company",
    "numResults": 20
  }
}
```

**Product comparison:**
```json
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "[Product A] vs [Product B] comparison",
    "num_results": 15,
    "type": "auto"
  }
}
```

**Market research:**
```json
mcp_call {
  "action": "mcp",
  "name": "exa_answer",
  "arguments": {
    "query": "What are the main competitors in [industry] and how do they compare?"
  }
}
```

## Research Pipeline

### Step 1: Competitor Identification
Find all major players:
- Search for "[industry] competitors"
- Look for "[product] alternatives"
- Check comparison articles
- Identify market leaders and challengers

### Step 2: Individual Analysis
Deep dive each competitor:
- Company overview (size, funding, founded)
- Product/service offerings
- Target market segments
- Pricing strategy
- Key differentiators
- Recent news and developments

### Step 3: Comparative Analysis
Side-by-side comparison:
- Feature comparison
- Pricing comparison
- Market positioning
- Strengths/weaknesses
- Market share (if available)

### Step 4: Gap Analysis
Identify opportunities:
- Underserved segments
- Feature gaps
- Pricing opportunities
- Market positioning gaps

## Usage Examples

### Find competitors in space
```
mcp_call {
  "action": "mcp",
  "name": "exa_web_search_exa",
  "arguments": {
    "query": "AI coding assistant competitors",
    "category": "company",
    "numResults": 25
  }
}
```

### Compare products
```
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "Cursor AI vs Copilot comparison review",
    "num_results": 20,
    "include_domains": ["techcrunch.com", "theverge.com"]
  }
}
```

### Market positioning research
```
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "SaaS market positioning strategy",
    "num_results": 15
  }
}
```

### SWOT-style analysis
```
mcp_call {
  "action": "mcp",
  "name": "exa_answer",
  "arguments": {
    "query": "What are Notion's strengths, weaknesses, and main competitors?"
  }
}
```

## Output Format

```
━━━ Competitive Analysis: [Industry/Market] ━━━

### Market Overview
Market Size: [$X billion]
Growth Rate: [X%] YoY
Key Trends: [list]

### Competitor Landscape

#### Tier 1: Market Leaders
**1. [Company Name]**
Overview:
- Founded: [Year]
- Funding: [$X]
- Valuation: [$X]
- Headcount: [X employees]
Products: [list]
Target Market: [description]
Pricing: [range]
Key Strengths:
- [Strength 1]
- [Strength 2]
Vulnerabilities:
- [Weakness 1]
Market Share: [X%]

#### Tier 2: Challengers
**2. [Company Name]**
...

#### Tier 3: Niche Players
**3. [Company Name]**
...

### Comparative Matrix
| Factor | [Company A] | [Company B] | [Company C] |
|--------|------------|------------|------------|
| Pricing | $ | $$ | $$$ |
| Ease of Use | High | Medium | High |
| Features | X | Y | Z |
| Support | 24/7 | Business hours | Email only |

### Positioning Map
[X-axis: Price] ←————————→ [Premium]
[Y-axis: Feature depth] ←————————→ [Simplicity]

[Plot competitors on positioning map]

### Gap Analysis
**Opportunities:**
- [Gap 1]
- [Gap 2]

**Threats:**
- [Threat 1]
- [Threat 2]

━━━ Summary ━━━
Key differentiators: [list]
Market saturation: [High/Medium/Low]
Entry barriers: [list]
Best positioned for: [segment]
```

## Comparison Dimensions

| Dimension | What to Research |
|-----------|-----------------|
| Product | Features, UX, performance |
| Pricing | Model, tiers, free trial |
| Market | Target segments, use cases |
| Positioning | Brand, messaging, differentiation |
| Growth | Traction, funding, momentum |
| Team | Leadership, advisors, hiring |
| Technology | Stack, IP, integrations |

## Source Types

- Product Hunt (product launches)
- G2/Capterra (reviews, comparisons)
- Tech press (news, analysis)
- Crunchbase (funding, size)
- LinkedIn (team, hiring)
- Job postings (growth signals)

## Browser Fallback

When web data is insufficient:
- Access G2/Capterra for detailed reviews
- Check product documentation
- Use demo/ trial accounts
- Interview users
