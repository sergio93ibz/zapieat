const fetch = require('node-fetch'); // we can just use native fetch in node > 18
async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/storefront/zapieat/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "MENU10", cartSubtotal: 20 })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch(e) { console.error(e) }
}
test();
