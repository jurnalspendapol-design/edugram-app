async function check() {
  const r = await fetch("http://localhost:3000/api/search?q=aan");
  console.log(await r.text());
}
check();
