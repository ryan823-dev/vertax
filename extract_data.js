(function() {
  const result = {};
  
  // 1. Title and Meta Description
  result.title = document.title;
  result.metaDescription = document.querySelector('meta[name="description"]')?.content || '';
  
  // 2. Navigation Links
  result.navLinks = Array.from(document.querySelectorAll('nav a, header a')).map(a => ({
    text: a.innerText.trim(),
    href: a.href
  }));
  
  // 3. h1, h2, h3 Headers
  result.h1 = Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim());
  result.h2 = Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim());
  result.h3 = Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim());
  
  // 4. Section copy (main text in each <section>)
  result.sections = Array.from(document.querySelectorAll('section')).map(s => s.innerText.trim());
  
  // 5. CTA Buttons
  result.ctaButtons = Array.from(document.querySelectorAll('button, a.button, a[role="button"], .btn, .cta')).map(b => b.innerText.trim());
  
  // 6. Footer Content
  result.footer = document.querySelector('footer')?.innerText.trim() || '';
  
  // 7. Sub-page links (same domain)
  const origin = window.location.origin;
  result.subPageLinks = Array.from(new Set(Array.from(document.querySelectorAll('a'))
    .map(a => a.href)
    .filter(href => href.startsWith(origin) && href !== origin && href !== origin + '/')))
    .map(href => href.replace(origin, ''));
    
  return result;
})()