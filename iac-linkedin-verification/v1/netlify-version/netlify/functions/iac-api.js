export default async (req) => {
  const scriptUrl = process.env.APPS_SCRIPT_WEBAPP_URL;

  if (!scriptUrl) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing APPS_SCRIPT_WEBAPP_URL" }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }

  try {
    const payload = await req.json();

    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
};