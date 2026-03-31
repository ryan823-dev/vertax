---
name: news-intelligence
description: >
  Use when the user wants to monitor news, track press coverage, analyze media sentiment, research news mentions,
  or stay updated on topics/companies/people. Triggers include: "news about [topic]", "[company] press coverage",
  "latest news on [topic]", "media monitoring", "track [topic] news", "news analysis".
always_apply: true
---

# News Intelligence

Monitor, track, and analyze news coverage using Exa search. Designed for media monitoring, competitive intelligence, and staying informed on specific topics.

## Tool Selection

**News discovery:**
```json
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "[topic] news",
    "num_results": 20,
    "type": "news",
    "start_published_date": "2024-01-01"
  }
}
```

**Direct answer with citations:**
```json
mcp_call {
  "action": "mcp",
  "name": "exa_answer",
  "arguments": {
    "query": "What happened with [topic] recently?",
    "text": true
  }
}
```

**Deep article extraction:**
```json
mcp_call {
  "action": "mcp",
  "name": "get_page_contents_exa",
  "arguments": {
    "urls": ["https://news-site.com/article"],
    "text": true,
    "summary": true
  }
}
```

## Search Patterns

| News Type | Query Format | Example |
|-----------|--------------|---------|
| Company news | "[Company] news" | "OpenAI news" |
| Industry trends | "[Industry] trends news" | "AI industry news" |
| Product launches | "[Company] product announcement" | "Apple product launch" |
| Executive news | "[CEO Name] news" | "Tim Cook news" |
| Crisis monitoring | "[Company] controversy" | "Tesla controversy" |
| Partnership news | "[Company] partnership" | "Microsoft partnership" |

## Research Modes

### Mode 1: Quick Summary
Get rapid overview of recent news:
```
mcp_call {
  "action": "mcp",
  "name": "exa_answer",
  "arguments": {
    "query": "What are the latest developments in [topic]?"
  }
}
```

### Mode 2: Comprehensive Tracking
Full news landscape analysis:
- Multiple query variations
- Date-filtered results
- Source diversity
- Sentiment analysis

### Mode 3: Source-Specific
Monitor specific outlets:
```
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "[topic]",
    "num_results": 15,
    "include_domains": ["techcrunch.com", "bloomberg.com"]
  }
}
```

## Usage Examples

### Monitor company news
```
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "Apple company news",
    "num_results": 20,
    "type": "news",
    "start_published_date": "2024-01-01"
  }
}
```

### Track industry trends
```
mcp_call {
  "action": "mcp",
  "name": "web_search_exa",
  "arguments": {
    "query": "AI regulation policy 2024",
    "num_results": 25,
    "include_domains": ["reuters.com", "bloomberg.com", "wsj.com"]
  }
}
```

### Extract article details
```
mcp_call {
  "action": "mcp",
  "name": "get_page_contents_exa",
  "arguments": {
    "urls": ["https://article-url.com"],
    "text": true,
    "summary": true
  }
}
```

## Output Format

```
━━━ News Intelligence: [Topic] ━━━

### Latest Headlines
| Date | Headline | Source | Sentiment |
|------|----------|--------|-----------|
| Mar 28 | [Headline...] | TechCrunch | Positive |

### Top Stories

**1. [Story Headline]**
Date: [Date]
Source: [Outlet]
Summary: [2-3 sentence summary]
Key Takeaways:
- [Point 1]
- [Point 2]
Source: [URL]

**2. [Story Headline]**
...

### Coverage by Source
- TechCrunch: [N] articles
- Bloomberg: [N] articles
- Reuters: [N] articles

### Sentiment Analysis
Overall: [Positive / Neutral / Negative]
Key themes: [list]

━━━ Summary ━━━
Total articles: [N]
Date range: [Start] - [End]
Key narrative: [1-2 sentence summary]
```

## Sentiment Classification

| Signal | Classification |
|--------|----------------|
| Growth, success, positive metrics | Positive |
| Neutral reporting, facts only | Neutral |
| Decline, controversy, negative metrics | Negative |
| Mixed coverage | Neutral/Conflicted |

## Dynamic Tuning

| Request | Results |
|---------|---------|
| "breaking news" | Last 24-48 hours, top 10 |
| "recent news" | Last week, 15-20 |
| "comprehensive" | Last month, 30-50 |
| "historical" | Custom date range |

## Source Categories

| Category | Preferred Domains |
|----------|------------------|
| Tech | techcrunch.com, venturebeat.com, theverge.com |
| Finance | bloomberg.com, wsj.com, reuters.com, ft.com |
| Business | forbes.com, businessinsider.com, fastcompany.com |
| General | apnews.com, reuters.com, nytimes.com |

## Browser Fallback

When news coverage is incomplete:
- Access paywalled articles via browser
- Check specialized industry publications
- Use press release databases
