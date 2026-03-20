export async function POST(request) {
  const body = await request.json();

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json(
        { error: data.error?.message || "API error" },
        { status: res.status }
      );
    }

    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: "Error connecting to Anthropic API" },
      { status: 500 }
    );
  }
}
