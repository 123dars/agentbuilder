async function linkUsers() {
  const adminSecret = "nhost-admin-secret";
  const graphqlUrl = "http://localhost:8080/v1/graphql";

  console.log("Fetching users...");
  const usersRes = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "x-hasura-admin-secret": adminSecret, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `query { users { id } }` })
  });
  
  const usersData = await usersRes.json();
  if (usersData.errors) {
    console.error("Error fetching users:", usersData.errors);
    return;
  }
  
  const users = usersData.data.users;
  if (!users || users.length === 0) {
    console.log("No users found to link.");
    return;
  }

  const objects = users.map(u => ({
    org_id: "11111111-1111-1111-1111-111111111111",
    user_id: u.id,
    role: "admin"
  }));

  console.log("Linking users to Org A...");
  const insertRes = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "x-hasura-admin-secret": adminSecret, "Content-Type": "application/json" },
    body: JSON.stringify({ 
      query: `mutation($objects: [org_members_insert_input!]!) { 
        insert_org_members(objects: $objects, on_conflict: {constraint: org_members_org_id_user_id_key, update_columns: []}) { 
          affected_rows 
        } 
      }`,
      variables: { objects }
    })
  });
  
  const insertData = await insertRes.json();
  if (insertData.errors) {
    console.error("Error inserting members:", insertData.errors);
  } else {
    console.log("Successfully linked users!", insertData.data);
  }
}

linkUsers().catch(console.error);
