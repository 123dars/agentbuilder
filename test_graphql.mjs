async function testGraphQL() {
  const adminSecret = "nhost-admin-secret";
  const graphqlUrl = "http://localhost:8080/v1/graphql";

  console.log("Testing GraphQL as user...");
  const res = await fetch(graphqlUrl, {
    method: "POST",
    headers: { 
      "x-hasura-admin-secret": adminSecret, 
      "x-hasura-role": "user",
      "x-hasura-user-id": "11111111-1111-1111-1111-111111111111",
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      query: `query {
        organizations {
          id
        }
      }` 
    })
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

testGraphQL().catch(console.error);
