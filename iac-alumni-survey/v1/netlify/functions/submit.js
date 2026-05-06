exports.handler = async (event) => {
  // Handle preflight request (CORS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  try {
    // Ensure body exists
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No data received" }),
      };
    }

    // Parse incoming data safely
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Invalid JSON format" }),
      };
    }

    // CRITICAL: Use node-fetch or native fetch properly
    // Google Apps Script redirects POST to GET, we need to handle this
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycby5VEP0kHHwshuyUSqlJpqnNKLb_7GPjOn0E1_0SrEHWh2knSYCr8lI7nUrk-UAnIMq/exec",
      // "https://script.google.com/macros/s/AKfycbw2X3QhsmwtMujK_1Zj_VXyfeD-dOepbdqnVAU3XNt9fUfodip4YXG8UFtVG1zya4yr1A/exec",
  
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: JSON.stringify(data),
        redirect: 'follow',
        follow: 20
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Apps Script error:", errorText);
      throw new Error(`Google Apps Script returned status ${response.status}`);
    } 

    // Get response as text first to see what we're getting
    const responseText = await response.text();
    console.log("Raw response from Google Apps Script:", responseText.substring(0, 500));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("Failed to parse JSON:", jsonError);
      console.error("Response text:", responseText);
      throw new Error("Invalid JSON response from Google Apps Script");
    }

    console.log("Parsed result - has certificateHtml:", !!result.certificateHtml);
    console.log("Certificate length:", result.certificateHtml ? result.certificateHtml.length : 0);

    // Return the result
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error("Error in submit function:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
    };
  }
};