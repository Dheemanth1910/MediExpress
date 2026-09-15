import { Express } from "express";
import { createApp } from "./internal";

const app: Express = createApp();
const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}
