async function main() {
  const form = {
    name: "Aman",
    email: "aman122@gmail.com",
    phone: "+91 9258095445",
    alternativePhone: "+91 8257624589",
    emergencyContactName: "rahul",
    emergencyContactPhone: "+91 9876543210",
    emergencyContactRelation: "friend",
    password: "@Graph23!Password",
  };
  console.log("Sending request...");
  const res = await fetch("http://localhost:3002/api/auth/user/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form)
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text);
}
main();
