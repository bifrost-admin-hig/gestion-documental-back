export const apps = [{
  name: "api",
  script: "bun run dev",
  watch: true,
  max_memory_restart: "1G",
  cron_restart: "0 03 * * *",
  env: {
    "NODE_ENV": "development"
  }
}];
