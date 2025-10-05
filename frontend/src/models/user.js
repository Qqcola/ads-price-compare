const mongoose = require("mongoose");

const Loginschema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  refreshTokenId: { type: String, default: null }
});

const User = mongoose.model("User", Loginschema, "users");
module.exports = User;
