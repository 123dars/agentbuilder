const fetch = require('node-fetch');

async function checkToken() {
  const email = "jwtcheck@test.com";
  const password = "password123";
  
  // 1. Sign up
  const signupRes = await fetch("http://localhost:8080/v1/auth/signup/email-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const signupData = await signupRes.json();
  
  let accessToken = signupData?.session?.accessToken;
  
  // 2. Sign in if already exists
  if (!accessToken) {
    const signinRes = await fetch("http://localhost:8080/v1/auth/signin/email-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const signinData = await signinRes.json();
    accessToken = signinData?.session?.accessToken;
  }
  
  if (!accessToken) {
    console.log("No token obtained");
    return;
  }
  
  // Decode JWT payload (base64url encoded)
  const payloadBase64 = accessToken.split('.')[1];
  const payloadBuffer = Buffer.from(payloadBase64, 'base64');
  console.log(JSON.parse(payloadBuffer.toString('utf-8')));
}

checkToken().catch(console.error);
