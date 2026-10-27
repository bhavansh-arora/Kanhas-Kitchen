const test = require('node:test');
const assert = require('node:assert/strict');
const kn = require('../lib/knowledge');

test('htmlToText keeps content and structure, drops scripts and navigation', () => {
  const { title, text } = kn.htmlToText(`<html><head><title>Shop &amp; Cafe</title><meta name="description" content="Best coffee in town"><script>var x=1</script></head>
    <body><nav><a href="/">Home</a></nav><h2>Prices</h2><table><tr><td>Latte</td><td>&#8377;180</td></tr></table><p>Open&nbsp;daily</p><img src="a.png" alt="Our shop front"></body></html>`);
  assert.equal(title, 'Shop & Cafe');
  assert.match(text, /^Best coffee in town/);
  assert.match(text, /## Prices/);
  assert.match(text, /Latte \| ₹180/);
  assert.match(text, /Open daily/);
  assert.match(text, /\[image: Our shop front\]/);
  assert.doesNotMatch(text, /var x|Home/);
});

test('private addresses are detected', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.4', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1', '100.64.0.1']) assert.ok(kn.isPrivateIp(ip), ip);
  for (const ip of ['8.8.8.8', '172.32.0.1', '2606:4700::1111']) assert.ok(!kn.isPrivateIp(ip), ip);
});

test('search ranks the chunks that match the question', () => {
  const sources = [
    { id: 'a', title: 'Delivery', url: '', content: 'We deliver within 5 km. Delivery is free above Rs 500.' },
    { id: 'b', title: 'Cakes', url: '', content: 'Chocolate cake, vanilla cake and red velvet cake.' },
    { id: 'c', title: 'Contact', url: '', content: 'Phone 98765 43210.' },
  ];
  const top = kn.search(kn.buildIndex(sources), 'how much is delivery?', 1);
  assert.equal(top[0].source.id, 'a');
  assert.equal(kn.search(kn.buildIndex(sources), 'red velvet', 1)[0].source.id, 'b');
});

test('file types are recognised', () => {
  assert.equal(kn.classifyFile('Menu.JPG').kind, 'image');
  assert.equal(kn.classifyFile('a.pdf').kind, 'pdf');
  assert.equal(kn.classifyFile('a.docx').kind, 'office');
  assert.equal(kn.classifyFile('a.csv').kind, 'text');
  assert.equal(kn.classifyFile('a.exe'), null);
});
