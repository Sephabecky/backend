document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");

  if (!form) {
    console.error("contactForm not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      fullName: form.querySelector("#contactName").value.trim(),
      phone: form.querySelector("#contactPhone").value.trim(),
      email: form.querySelector("#contactEmail").value.trim(),
      subject: form.querySelector("#contactSubject").value,
      message: form.querySelector("#contactMessage").value.trim()
    };

    console.log("Sending payload:", payload);

    // frontend validation
    if (!payload.fullName || !payload.phone || !payload.subject || !payload.message) {
      alert("Please fill in all required fields");
      return;
    }

    const response = await fetch(
      "https://agronomy-backend-ehk1.onrender.com/api/contact",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Backend error:", data);
      alert(data.message || "Failed to send message");
      return;
    }

    alert("Message sent successfully!");
    form.reset();
  });
});

