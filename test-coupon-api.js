async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/storefront/demo-restaurant/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "MENU10", cartSubtotal: 20 })
    });
    console.log("STATUS:", res.status);
    console.log("BODY:", await res.text());
  } catch(e) { console.error("FETCH ERROR:", e) }
}
test();
