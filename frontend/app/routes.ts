import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/login", "routes/(auth)/login.tsx"),
  route("/signup", "routes/(auth)/signup.tsx"),
  route("/install", "routes/install.tsx"),
  route("/callback", "routes/callback.tsx"),
  route("/v2", "routes/v2/_layout.tsx", [
    route("", "routes/v2/index.tsx"),
    route("home", "routes/v2/home.tsx"),
    route("callback", "routes/v2/callback.tsx"),
  ]),
] satisfies RouteConfig;
