// Drizzle config - a configuration file that is used by Drizzle Kit and contains all the information about your database connection, migration folder and schema files.
// Create a drizzle.config.ts file in the root of your project and add the following content:
import config from "./db/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: config.POSTGRES_URL!,
  },
});
