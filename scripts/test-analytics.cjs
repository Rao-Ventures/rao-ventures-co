const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const source = main.slice(main.indexOf('// Optional website analytics'));

function page({ choice, blocked = false, enabled = true } = {}) {
  const p = { scripts: [], events: [], reloads: 0 };
  p.saved = choice ? JSON.stringify({ choice, savedAt: Date.now() }) : null;
  const control = extras => ({
    ...extras,
    addEventListener(type, fn) { this[type] = fn; },
    focus() {}
  });
  p.buttons = ['rejected', 'accepted'].map(choice => control({ dataset: { cookieChoice: choice } }));
  p.banner = { querySelectorAll: () => p.buttons, querySelector: () => p.buttons[0] };
  p.settings = control({ hidden: true });
  p.links = [
    ['https://raoventures.co/products.html?secret=value', 'hero-explore-btn', 'hero'],
    ['https://svastha.co/?secret=value', 'svastha-visit-btn', 'svastha'],
    ['mailto:support@raoventures.co?subject=Beta', 'robot-beta-email-btn', 'robot-rescue-island'],
    ['tel:+17374340575', 'contact-phone', 'contact'],
    ['https://uidev.net/', null, null]
  ].map(([href, cta, section]) => control({
    href, dataset: { cta }, textContent: '  Visit  product ',
    closest: () => section ? { id: section } : null
  }));
  p.window = {
    location: { hostname: 'raoventures.co', pathname: '/index.html', reload() { p.reloads++; } },
    addEventListener() {}
  };
  const document = {
    body: { hasAttribute: () => enabled },
    querySelector: s => s === '.cookie-banner' ? p.banner : s === 'main' ? { setAttribute() {}, focus() {} } : p.settings,
    querySelectorAll: () => p.links,
    createElement: () => ({}), head: { append: script => p.scripts.push(script) }
  };
  const localStorage = {
    getItem() { if (blocked) throw Error('blocked'); return p.saved; },
    setItem(_, value) { if (blocked) throw Error('blocked'); p.saved = value; }
  };
  p.ready = () => {
    p.window.vexo = { customEvent: (name, properties) => p.events.push({ name, properties }) };
    p.scripts[0].onload();
  };
  vm.runInNewContext(source, { window: p.window, document, localStorage, URL, Date });
  return p;
}

let p = page();
p.links[0].click();
assert.equal(p.scripts.length, 0);
p.buttons[0].click();
assert.equal(p.scripts.length, 0);
p.buttons[1].click();
assert.equal(p.scripts.length, 1);
p.links[0].click(); // Consented click before the SDK is ready.
assert.equal(p.events.length, 0);
p.ready();
assert.equal(p.events.length, 1); // Pre-consent click was never queued.
assert.equal(p.events[0].name, 'cta_click');
assert.equal(p.events[0].properties.cta_id, 'hero-explore-btn');
assert.equal(p.events[0].properties.target_url, 'https://raoventures.co/products.html');
assert.equal(p.events[0].properties.section, 'hero');
assert.equal(p.events[0].properties.page_path, '/index.html');
p.links.slice(1).forEach(link => link.click());
assert.equal(p.events.filter(e => e.name === 'cta_click').length, 4);
assert.equal(p.events.filter(e => e.name === 'outbound_click').length, 2);
assert.ok(p.events.every(e => !e.properties.target_url.includes('?')));
p.buttons[0].click();
p.links[0].click();
assert.equal(p.reloads, 1);
assert.equal(p.events.length, 6);
p = page({ choice: 'accepted' });
assert.equal(p.scripts.length, 1);
p.links[0].click();
p.buttons[0].click();
p.ready();
assert.equal(p.events.length, 0); // Queued clicks are discarded on withdrawal.
p = page({ blocked: true });
p.buttons[0].click();
assert.equal(p.scripts.length, 0);
p = page({ choice: 'accepted', enabled: false });
assert.equal(p.scripts.length, 0);
for (const filename of ['index.html', 'products.html']) {
  const html = fs.readFileSync(path.join(root, filename), 'utf8');
  const ctas = [...html.matchAll(/<a\b[^>]*class="(?:btn\b[^"]*|nav-cta|contact-method)"[^>]*>/g)];
  assert.ok(ctas.length > 0);
  ctas.forEach(([tag]) => assert.match(tag, /data-cta="[^"]+"/));
  const ids = [...html.matchAll(/data-cta="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.doesNotMatch(html, /<script[^>]+vexo/);
}
console.log('Analytics checks passed: consent, CTA coverage, event metadata, queueing, withdrawal, outbound counts, and legal-page exclusion.');
