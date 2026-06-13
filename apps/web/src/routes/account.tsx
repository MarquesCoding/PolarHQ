import { createFileRoute } from "@tanstack/react-router"
import Account from "@polarhq/interface/screens/Account/Account"

const RouteComponent = () => <Account />

export const Route = createFileRoute("/account")({ component: RouteComponent })

