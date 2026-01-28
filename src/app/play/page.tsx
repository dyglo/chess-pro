import { redirect } from "next/navigation";

export default function PlayRedirect() {
    redirect("/games/chess");
}
