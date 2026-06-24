import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/account")({ component: () => <div>HELLO ACCOUNT<Outlet/></div> });
