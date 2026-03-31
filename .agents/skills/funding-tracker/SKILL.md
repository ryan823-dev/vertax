---
name: funding-tracker
description: >
  Use when the user wants to track startup funding, venture capital rounds, investment news, company valuations,
  or financial data for companies. Triggers include: "funding news", "[company] raised", "[company] valuation",
  "Series A/B/C", "venture capital", "recent investments", "[industry] funding".
always_apply: true
---

# Funding Tracker

Track startup funding, venture capital investments, and company valuations using Exa search. Designed for deal sourcing, investment research, and competitive intelligence.

## Tool Selection

**Funding discovery:**
```json
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "...",
    "num_results": 20,
    "type": "auto",
    "include_domains": ["techcrunch.com", "crunchbase.com", "pitchbook.com", "venturebeat.com"]
  }
}
```

**Recent funding news:**
```json
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "[company] funding round",
    "num_results": 10,
    "start_published_date": "2024-01-01"
  }
}
```

**Valuation research:**
```json
mcp_call {
  "action": "mcp",
  "name": "exa_answer",
  "arguments": {
    "query": "What is [company]'s latest valuation and total funding raised?"
  }
}
```

## Search Patterns

| Search Type | Query Format | Example |
|-------------|--------------|---------|
| Company funding | "[Company] raised [round]" | "Anthropic raised $2 billion" |
| Round details | "[Company] Series [A/B/C]" | "OpenAI Series B" |
| Valuation | "[Company] valuation" | "Stripe valuation 2024" |
| Investor news | "[VC Firm] portfolio" | "Sequoia Capital investments 2024" |
| Industry funding | "[Industry] funding trends" | "AI startup funding 2024" |
| Deal sourcing | "recent [industry] funding" | "recent fintech funding" |

## Research Pipeline

### Step 1: Funding Overview
Find latest funding news and rounds:
- Search major VC news sources
- Filter by date for recent deals
- Extract key deal terms

### Step 2: Company Deep Dive
Research specific company:
- Total funding raised (all rounds)
- Current valuation
- Lead investors
- Valuation history
- Key investors in cap table

### Step 3: Market Context
Understand market conditions:
- Comparable company valuations
- Industry funding trends
- Notable exits in sector

## Usage Examples

### Track recent AI funding
```
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "AI startup funding round 2024",
    "num_results": 20,
    "include_domains": ["techcrunch.com", "venturebeat.com"],
    "start_published_date": "2024-01-01"
  }
}
```

### Research company valuation
```
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "Stripe valuation 2024 funding",
    "num_results": 15,
    "include_domains": ["crunchbase.com", "pitchbook.com", "bloomberg.com"]
  }
}
```

### Find VC investors in company
```
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "Anthropic investors funding rounds",
    "num_results": 10
  }
}
```

## Output Format

```
━━━ Funding Research: [Company] ━━━

### Funding Overview
Total Raised: [$X billion]
Current Valuation: [$Y billion]
Last Round: [Series X]
Last Round Date: [Date]
Valuation Multiple: [X x revenue/trailing]

### Funding History
| Round | Date | Amount | Valuation | Lead Investor |
|-------|------|--------|-----------|---------------|
| Series A | 2020 | $10M | $50M | [Investor] |
| Series B | 2022 | $100M | $1B | [Investor] |

### Lead Investors
- [Investor 1]
- [Investor 2]

### Recent News
1. [Headline] ([Date])
   Source: [URL]

### Market Context
Industry: [Sector]
Comparable avg. valuation: [$X]
[X]% [higher/lower] than sector average

━━━ Sources ━━━
[URL 1]
[URL 2]
```

## Data Points to Extract

For each funding round:
- Company name
- Round type (Seed/Series A/B/C/D/...)
- Amount raised
- Valuation (if disclosed)
- Date
- Lead investor(s)
- Other participating investors
- Use of funds

## Domain Filters

Preferred sources for funding data:
- techcrunch.com (breaking news)
- crunchbase.com (comprehensive database)
- pitchbook.com (institutional data)
- venturebeat.com (tech funding)
- forbes.com (business coverage)
- bloomberg.com (financial data)

## Browser Fallback

When API data is insufficient:
- Check Crunchbase directly
- Access Pitchbook (may require auth)
- Use SEC filings for public companies
