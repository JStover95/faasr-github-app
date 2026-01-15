import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/login", "routes/(auth)/login.tsx"),
  route("/signup", "routes/(auth)/signup.tsx"),
  route("/install", "routes/install.tsx"),
  route("/callback", "routes/callback.tsx"),
] satisfies RouteConfig;
