if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "fallback_secret_for_development_do_not_use_in_prod";
}
