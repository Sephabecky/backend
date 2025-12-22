const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  const data = req.body;

  console.log("CONTACT MESSAGE RECEIVED:");
  console.log(data);

  res.json({
    success: true,
    message: "Your message has been sent successfully"
  });
});

module.exports = router;
 
