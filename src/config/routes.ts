export const ROUTES = {
  home: "/",
  login: "/login",
  app: "/app",
  dashboard: "/app",
  members: "/app/members",
  memberProfile: (id: string) => `/app/members/${id}`,
} as const;
