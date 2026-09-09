import "dotenv/config"; // must load before app.js, so env vars exist there
import app from "./app.js";
import sequelize from "./config/db.js";
import { connectDB } from "./config/db.js";
import "./models/index.js"; // register both models and their association before sync

const PORT = process.env.PORT || 5000;

if (!process.env.SECRET_KEY) {
  console.error("SECRET_KEY is missing from .env - tokens cannot be signed");
  process.exit(1);
}

await connectDB();

// creates/updates the users and blogs tables from the models.
// drop:false matters - this database is shared with the Class_Lecture project,
// whose users table carries extra columns (phonenumber, photo) that this model
// does not declare. a plain alter:true would delete them.
// set DB_SYNC=false in .env once the schema is settled.
if (process.env.DB_SYNC !== "false") {
  await sequelize.sync({ alter: { drop: false } });
  console.log("Database synced");
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
