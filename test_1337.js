const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch("http://localhost:1337/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ __schema { queryType { fields { name } } } }" })
    });
    const text = await res.text();
    console.log(text.substring(0, 200));
  } catch (err) {
    console.error(err);
  }
}
test();
