
require("./configs/db");
require("dotenv").config();

// [++] Export for tests
module.exports = { app, http, io };

// Don’t start the listener in test mode
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  http.listen(PORT, () => {
    console.log(`ADS app running at http://localhost:${PORT}`);
  });
}
