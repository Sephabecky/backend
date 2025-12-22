const express = require("express");
const cors = require("cors");

const contactRoutes = require("./contact");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/contact", contactRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
