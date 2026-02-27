const email = "stevenfackley@gmail.com";
const password = "admin12345";

async function testLogin() {
  // 1. Get CSRF token
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const cookie = csrfRes.headers.get("set-cookie").split(";")[0];

  console.log("CSRF Token:", csrfToken);

  // 2. Post login
  const loginRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookie
    },
    body: new URLSearchParams({
      email,
      password,
      csrfToken,
      redirect: "false"
    })
  });

  const loginData = await loginRes.json();
  console.log("Login Response:", loginData);
}

testLogin().catch(console.error);
