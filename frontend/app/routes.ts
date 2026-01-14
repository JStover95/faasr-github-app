import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/login", "routes/(auth)/login.tsx"),
  route("/signup", "routes/(auth)/signup.tsx"),
] satisfies RouteConfig;
