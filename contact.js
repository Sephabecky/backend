
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/api/contact", async (req, res) => {
  const { name, phone, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be filled"
    });
  }

  try {
    await resend.emails.send({
      from: "Aaron Agronomy <onboarding@resend.dev>",
      to: ["sephanyaboke@gmail.com"], // your phone Gmail
      subject: subject || "New Contact Form Message",
      html: `
        <h3>New Website Contact</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `
    });

    res.json({
      success: true,
      message: "Message sent successfully"
    });

  } catch (error) {
    console.error("RESEND ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message"
    });
  }
});
