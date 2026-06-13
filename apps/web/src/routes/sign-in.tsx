import { createFileRoute } from "@tanstack/react-router"
import SignIn from "@polarhq/interface/screens/SignIn/SignIn"

const RouteComponent = () => <SignIn />

export const Route = createFileRoute("/sign-in")({ component: RouteComponent })

