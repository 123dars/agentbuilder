const fetch = require('node-fetch');

async function testJWT() {
  const url = "http://localhost:8080/v1/auth/signin/email-password";
  // We need to create a test user first, or just sign in as one
  // Let's create a test user
  const signupRes = await fetch("http://localhost:8080/v1/auth/signup/email-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "testjwt@test.com", password: "password123" })
  });
  const signupData = await signupRes.json();
  
  let accessToken = signupData?.session?.accessToken;
  
  if (!accessToken) {
    const signinRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "testjwt@test.com", password: "password123" })
    });
    const signinData = await signinRes.json();
    accessToken = signinData?.session?.accessToken;
  }
  
  if (!accessToken) {
    console.error("Could not get access token");
    return;
  }
  
  console.log("Access token found. Decoding...");
  const payloadStr = Buffer.from(accessToken.split('.')[1], 'base64').toString();
  console.log(JSON.parse(payloadStr));
}
testJWT().catch(console.error);
