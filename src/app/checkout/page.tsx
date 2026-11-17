import ClassCheckoutClient from "@/components/ClassCheckoutClient";
import { getServerSession } from "@/lib/auth";
import { getClasses } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function CheckoutPage() {
  const [classes, session] = await Promise.all([getClasses(false), getServerSession()]);
  return <ClassCheckoutClient classes={classes} isSignedIn={Boolean(session)} />;
}
